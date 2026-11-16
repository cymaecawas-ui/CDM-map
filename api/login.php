<?php
require_once __DIR__ . '/db.php';
api_start_session();
api_same_origin();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_json(['error' => 'Use POST to sign in.'], 405);
$input = api_body();
$username = trim((string)($input['username'] ?? ''));
$password = (string)($input['password'] ?? '');
if ($username === '' || $password === '') api_json(['error' => 'Username and password are required.'], 422);
try {
    $stmt = api_db()->prepare('SELECT id, username, password_hash FROM administrators WHERE username = ? AND active = 1 LIMIT 1');
    $stmt->execute([$username]);
    $admin = $stmt->fetch();
    if (!$admin || !password_verify($password, $admin['password_hash'])) api_json(['error' => 'The username or password was not accepted.'], 401);
    session_regenerate_id(true);
    $_SESSION['admin_id'] = $admin['id'];
    $_SESSION['admin_username'] = $admin['username'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    api_json(['admin' => true, 'username' => $admin['username'], 'csrfToken' => $_SESSION['csrf_token']]);
} catch (Throwable $error) { api_db_error($error); }
