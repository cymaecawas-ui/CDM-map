<?php
require_once __DIR__ . '/db.php';
$method=$_SERVER['REQUEST_METHOD'];

function api_find_or_create_name(PDO $pdo, string $table, string $name, string $idPrefix): string {
    if (!in_array($table,['teachers','subjects'],true)) throw new InvalidArgumentException('Invalid lookup table.');
    $find=$pdo->prepare("SELECT id FROM {$table} WHERE " . ($table==='teachers'?'full_name':'name') . ' = ? LIMIT 1');
    $find->execute([$name]); $id=$find->fetchColumn();
    if ($id) return (string)$id;
    $id=api_id($idPrefix);
    if ($table==='teachers') {
        $insert=$pdo->prepare('INSERT INTO teachers(id,full_name,active) VALUES(?,?,1) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)');
        $insert->execute([$id,$name]);
        $find=$pdo->prepare('SELECT id FROM teachers WHERE full_name=?'); $find->execute([$name]);
    } else {
        $insert=$pdo->prepare('INSERT INTO subjects(id,name) VALUES(?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)');
        $insert->execute([$id,$name]);
        $find=$pdo->prepare('SELECT id FROM subjects WHERE name=?'); $find->execute([$name]);
    }
    return (string)$find->fetchColumn();
}

function api_find_or_create_section(PDO $pdo, string $label): string {
    $label=trim($label);
    if (preg_match('/^(Grade\s+[^·-]+)\s*[·-]\s*(.+)$/u',$label,$m)) {
        $grade=trim($m[1]); $section=trim($m[2]);
    } else { $grade='General'; $section=$label; }
    $find=$pdo->prepare('SELECT id FROM sections WHERE grade_level=? AND section_name=? LIMIT 1');
    $find->execute([$grade,$section]); $id=$find->fetchColumn();
    if ($id) return (string)$id;
    $id=api_id('section');
    $insert=$pdo->prepare('INSERT INTO sections(id,grade_level,section_name) VALUES(?,?,?) ON DUPLICATE KEY UPDATE section_name=VALUES(section_name)');
    $insert->execute([$id,$grade,$section]);
    $find->execute([$grade,$section]); return (string)$find->fetchColumn();
}

try {
    $pdo=api_db();
    if ($method==='GET') {
        api_start_session(); $isAdmin=!empty($_SESSION['admin_id']);
        $sql='SELECT s.id,s.room_id AS roomId,s.day_of_week-1 AS day,TIME_FORMAT(s.starts_at,"%H:%i") AS time,TIME_FORMAT(s.ends_at,"%H:%i") AS `end`,su.name AS subject,t.full_name AS teacher,CONCAT(se.grade_level," · ",se.section_name) AS section,r.room_name AS room,r.floor_id AS floor,r.room_number AS roomNumber FROM schedules s JOIN rooms r ON r.id=s.room_id JOIN subjects su ON su.id=s.subject_id JOIN teachers t ON t.id=s.teacher_id JOIN sections se ON se.id=s.section_id';
        $where=[]; $params=[];
        if (!$isAdmin) $where[]='s.published=1 AND r.published=1 AND t.active=1';
        if (isset($_GET['roomId'])) {$where[]='s.room_id=?';$params[]=(string)$_GET['roomId'];}
        if (isset($_GET['day'])) {$day=filter_var($_GET['day'],FILTER_VALIDATE_INT);if($day===false||$day<0||$day>4)api_json(['error'=>'day must be between 0 (Monday) and 4 (Friday).'],422);$where[]='s.day_of_week=?';$params[]=$day+1;}
        $q=trim((string)($_GET['q']??''));
        if ($q!=='') {$where[]='(su.name LIKE ? OR t.full_name LIKE ? OR se.grade_level LIKE ? OR se.section_name LIKE ? OR r.room_name LIKE ? OR r.room_number LIKE ?)';$like='%'.$q.'%';array_push($params,$like,$like,$like,$like,$like,$like);}
        if ($where) $sql.=' WHERE '.implode(' AND ',$where);
        $sql.=' ORDER BY s.day_of_week,s.starts_at,s.id';
        $stmt=$pdo->prepare($sql);$stmt->execute($params);
        $items=$stmt->fetchAll();foreach($items as &$item){$item['day']=(int)$item['day'];$item['floor']=(int)$item['floor'];$item['demo']=false;}unset($item);
        api_json(['schedules'=>$items]);
    }

    api_require_admin();
    if ($method==='POST'||$method==='PUT') {
        $body=api_body();
        $id=$method==='POST'?api_id('schedule'):(string)($_GET['id']??'');
        $roomId=trim((string)($body['roomId']??''));
        $day=filter_var($body['day']??null,FILTER_VALIDATE_INT);
        $start=trim((string)($body['time']??''));$end=trim((string)($body['end']??''));
        $subject=trim((string)($body['subject']??''));$teacher=trim((string)($body['teacher']??''));$section=trim((string)($body['section']??''));
        if ($id===''||$roomId===''||$day===false||$day<0||$day>4||!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/',$start)||!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/',$end)||$end<=$start||$subject===''||$teacher===''||$section==='') {
            api_json(['error'=>'Provide a room, weekday, valid start/end times, subject, teacher, and section.'],422);
        }
        $pdo->beginTransaction();
        try {
            $lockRoom=$pdo->prepare('SELECT id FROM rooms WHERE id=? FOR UPDATE');$lockRoom->execute([$roomId]);
            if (!$lockRoom->fetchColumn()) {$pdo->rollBack();api_json(['error'=>'Room not found.'],404);}
            if ($method==='PUT') {$check=$pdo->prepare('SELECT id FROM schedules WHERE id=? FOR UPDATE');$check->execute([$id]);if(!$check->fetchColumn()){$pdo->rollBack();api_json(['error'=>'Schedule not found.'],404);}}
            $overlap=$pdo->prepare('SELECT id FROM schedules WHERE room_id=? AND day_of_week=? AND starts_at < ? AND ends_at > ? AND id <> ? LIMIT 1 FOR UPDATE');
            $overlap->execute([$roomId,$day+1,$end,$start,$id]);
            if ($overlap->fetchColumn()) {$pdo->rollBack();api_json(['error'=>'This room already has a schedule that overlaps that time.'],409);}
            $teacherId=api_find_or_create_name($pdo,'teachers',$teacher,'teacher');
            $subjectId=api_find_or_create_name($pdo,'subjects',$subject,'subject');
            $sectionId=api_find_or_create_section($pdo,$section);
            if ($method==='POST') {
                $save=$pdo->prepare('INSERT INTO schedules(id,room_id,teacher_id,subject_id,section_id,day_of_week,starts_at,ends_at,published) VALUES(?,?,?,?,?,?,?,?,1)');
                $save->execute([$id,$roomId,$teacherId,$subjectId,$sectionId,$day+1,$start,$end]);
            } else {
                $save=$pdo->prepare('UPDATE schedules SET room_id=?,teacher_id=?,subject_id=?,section_id=?,day_of_week=?,starts_at=?,ends_at=?,published=1 WHERE id=?');
                $save->execute([$roomId,$teacherId,$subjectId,$sectionId,$day+1,$start,$end,$id]);
            }
            $pdo->commit();api_json(['saved'=>true,'id'=>$id],$method==='POST'?201:200);
        } catch (Throwable $error) {if($pdo->inTransaction())$pdo->rollBack();throw $error;}
    }
    if ($method==='DELETE') {
        $id=(string)($_GET['id']??'');if($id==='')api_json(['error'=>'Schedule id is required.'],422);
        $stmt=$pdo->prepare('DELETE FROM schedules WHERE id=?');$stmt->execute([$id]);if(!$stmt->rowCount())api_json(['error'=>'Schedule not found.'],404);
        api_json(['deleted'=>true]);
    }
    api_json(['error'=>'Method not allowed.'],405);
} catch (Throwable $error) {api_db_error($error);}
