<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';

function api_db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $localConfig = __DIR__ . '/config.local.php';
    $config = is_file($localConfig) ? require $localConfig : require __DIR__ . '/config.example.php';
    $dsn = getenv('CDM_DB_DSN') ?: ($config['dsn'] ?? '');
    $user = getenv('CDM_DB_USER') ?: ($config['user'] ?? '');
    $password = getenv('CDM_DB_PASSWORD') ?: ($config['password'] ?? '');
    if ($dsn === '' || $user === '' || $password === 'replace-with-a-strong-password') {
        throw new RuntimeException('Set MySQL credentials in api/config.local.php or the CDM_DB_* environment variables.');
    }
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function api_db_error(Throwable $error): never {
    error_log('[CDM API] ' . $error->getMessage());
    api_json(['error' => 'The database request failed. Check the PHP server log and database configuration.'], 500);
}
