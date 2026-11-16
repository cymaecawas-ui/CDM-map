<?php
declare(strict_types=1);

function api_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $https,
        'samesite' => 'Strict',
        'path' => '/',
    ]);
    session_start();
}

function api_json(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function api_body(): array {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) api_json(['error' => 'Expected a JSON object.'], 400);
    return $body;
}

function api_same_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return;
    $expected = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '');
    if (!hash_equals($expected, $origin)) api_json(['error' => 'Request origin is not allowed.'], 403);
}

function api_require_admin(): void {
    api_start_session();
    if (empty($_SESSION['admin_id'])) api_json(['error' => 'Administrator sign-in is required.'], 401);
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        api_json(['error' => 'Invalid or expired security token. Please sign in again.'], 403);
    }
    api_same_origin();
}

function api_id(string $prefix): string {
    return $prefix . '-' . bin2hex(random_bytes(16));
}
