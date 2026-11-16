<?php
require_once __DIR__ . '/db.php';
$method = $_SERVER['REQUEST_METHOD'];
$isAdmin = false;
api_start_session();
$isAdmin = !empty($_SESSION['admin_id']);

function room_response(array $row): array {
    $shape = json_decode((string)$row['polygon'], true) ?: [];
    return [
        'id' => (string)$row['id'], 'name' => $row['room_name'],
        'roomNumber' => $row['room_number'], 'floor' => (int)$row['floor_id'],
        'building' => $row['building'], 'type' => $row['room_type'],
        'capacity' => $row['capacity'] === null ? null : (int)$row['capacity'],
        'description' => $row['description'],
        'x' => (float)($shape['x'] ?? 0), 'y' => (float)($shape['y'] ?? 0),
        'w' => (float)($shape['w'] ?? 0), 'h' => (float)($shape['h'] ?? 0),
        'published' => (bool)$row['published'],
    ];
}

try {
    $pdo = api_db();
    if ($method === 'GET') {
        $sql = 'SELECT id,room_name,room_number,floor_id,building,room_type,capacity,description,polygon,published FROM rooms';
        $where = [];
        $params = [];
        if (!$isAdmin) $where[] = 'published = 1';
        if (isset($_GET['floor'])) {
            $floor = filter_var($_GET['floor'], FILTER_VALIDATE_INT);
            if ($floor === false || $floor < 1 || $floor > 4) api_json(['error' => 'floor must be between 1 and 4.'], 422);
            $where[] = 'floor_id = ?'; $params[] = $floor;
        }
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY floor_id,room_name';
        $stmt = $pdo->prepare($sql); $stmt->execute($params);
        api_json(['rooms' => array_map('room_response', $stmt->fetchAll())]);
    }

    api_require_admin();
    if ($method === 'POST' || $method === 'PUT') {
        $body = api_body();
        $id = $method === 'POST' ? api_id('room') : (string)($_GET['id'] ?? '');
        $name = trim((string)($body['name'] ?? ''));
        $floor = filter_var($body['floor'] ?? null, FILTER_VALIDATE_INT);
        $x = filter_var($body['x'] ?? null, FILTER_VALIDATE_FLOAT);
        $y = filter_var($body['y'] ?? null, FILTER_VALIDATE_FLOAT);
        $w = filter_var($body['w'] ?? null, FILTER_VALIDATE_FLOAT);
        $h = filter_var($body['h'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($method === 'PUT') {
            $currentStmt = $pdo->prepare('SELECT * FROM rooms WHERE id = ?'); $currentStmt->execute([$id]); $current = $currentStmt->fetch();
            if (!$current) api_json(['error' => 'Room not found.'], 404);
            $oldShape = json_decode((string)$current['polygon'], true) ?: [];
            if (!array_key_exists('name',$body)) $name = $current['room_name'];
            if (!array_key_exists('floor',$body)) $floor = (int)$current['floor_id'];
            if (!array_key_exists('x',$body)) $x = (float)($oldShape['x'] ?? 0);
            if (!array_key_exists('y',$body)) $y = (float)($oldShape['y'] ?? 0);
            if (!array_key_exists('w',$body)) $w = (float)($oldShape['w'] ?? 0);
            if (!array_key_exists('h',$body)) $h = (float)($oldShape['h'] ?? 0);
        }
        if ($name === '' || $floor === false || $floor < 1 || $floor > 4 || $x === false || $y === false || $w === false || $h === false || $w <= 0 || $h <= 0) {
            api_json(['error' => 'Provide a name, valid floor, and positive map coordinates x, y, w, h.'], 422);
        }
        $roomNumber = array_key_exists('roomNumber',$body) ? trim((string)$body['roomNumber']) : ($current['room_number'] ?? null);
        $building = trim((string)($body['building'] ?? ($current['building'] ?? 'Colegio de Montalban')));
        $type = trim((string)($body['type'] ?? ($current['room_type'] ?? 'Classroom')));
        $description = trim((string)($body['description'] ?? ($current['description'] ?? '')));
        $capacity = $body['capacity'] ?? ($current['capacity'] ?? null);
        $published = array_key_exists('published',$body) ? (int)(bool)$body['published'] : (int)($current['published'] ?? true);
        $polygon = json_encode(['x'=>$x,'y'=>$y,'w'=>$w,'h'=>$h], JSON_THROW_ON_ERROR);
        if ($method === 'POST') {
            $stmt=$pdo->prepare('INSERT INTO rooms(id,room_name,room_number,floor_id,building,room_type,capacity,description,polygon,published) VALUES(?,?,?,?,?,?,?,?,?,?)');
            $stmt->execute([$id,$name,$roomNumber ?: null,$floor,$building,$type,$capacity,$description,$polygon,$published]);
        } else {
            $stmt=$pdo->prepare('UPDATE rooms SET room_name=?,room_number=?,floor_id=?,building=?,room_type=?,capacity=?,description=?,polygon=?,published=? WHERE id=?');
            $stmt->execute([$name,$roomNumber ?: null,$floor,$building,$type,$capacity,$description,$polygon,$published,$id]);
        }
        api_json(['room'=>['id'=>$id,'name'=>$name,'roomNumber'=>$roomNumber,'floor'=>(int)$floor,'building'=>$building,'type'=>$type,'capacity'=>$capacity,'description'=>$description,'x'=>$x,'y'=>$y,'w'=>$w,'h'=>$h,'published'=>(bool)$published]], $method==='POST'?201:200);
    }
    if ($method === 'DELETE') {
        $id=(string)($_GET['id'] ?? ''); if ($id==='') api_json(['error'=>'Room id is required.'],422);
        $stmt=$pdo->prepare('DELETE FROM rooms WHERE id=?'); $stmt->execute([$id]);
        if (!$stmt->rowCount()) api_json(['error'=>'Room not found.'],404);
        api_json(['deleted'=>true]);
    }
    api_json(['error'=>'Method not allowed.'],405);
} catch (Throwable $error) { api_db_error($error); }
