<?php
require_once __DIR__ . '/common.php';
api_start_session();
api_json([
    'admin' => !empty($_SESSION['admin_id']),
    'username' => $_SESSION['admin_username'] ?? null,
    'csrfToken' => $_SESSION['csrf_token'] ?? null,
]);
