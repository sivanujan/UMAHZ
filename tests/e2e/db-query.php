<?php

// Lightweight CLI helper for Playwright E2E DB assertions against umahz_e2e ONLY.
if ($argc < 2) {
    fwrite(STDERR, "Usage: php db-query.php <sql> [json_params]\n");
    exit(1);
}

$sql = $argv[1];
$params = isset($argv[2]) ? json_decode($argv[2], true) : [];

$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '5432';
$user = getenv('DB_USERNAME') ?: 'postgres';
$pass = getenv('DB_PASSWORD') ?: 'root';
$db = 'umahz_e2e';

$pdo = new PDO("pgsql:host={$host};port={$port};dbname={$db}", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$stmt = $pdo->prepare($sql);
$stmt->execute($params ?: []);
echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_SLASHES);
