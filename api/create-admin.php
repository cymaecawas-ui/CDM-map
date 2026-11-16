<?php
require_once __DIR__ . '/db.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit("Not found\n"); }
$username=trim($argv[1]??'');
if ($username==='') {fwrite(STDERR,"Usage: php api/create-admin.php <username>\n");exit(1);}
try { $pdo=api_db(); }
catch (Throwable $error) { fwrite(STDERR,"Could not connect to MySQL: {$error->getMessage()}\n"); exit(1); }
$password=readline('New admin password (input is visible): ');
if (strlen($password)<12) {fwrite(STDERR,"Use a password with at least 12 characters.\n");exit(1);}
$id=api_id('admin');$hash=password_hash($password,PASSWORD_DEFAULT);
try {
    $stmt=$pdo->prepare('INSERT INTO administrators(id,username,password_hash,active) VALUES(?,?,?,1)');
    $stmt->execute([$id,$username,$hash]);
} catch (Throwable $error) { fwrite(STDERR,"Could not create administrator: {$error->getMessage()}\n"); exit(1); }
fwrite(STDOUT,"Administrator created.\n");
