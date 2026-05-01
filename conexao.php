<?php
$host = 'SEU_HOST_BANCO';   // Ex: sql101.ezyro.com (painel → MySQL Databases → Server hostname)
$dbname = 'SEU_BANCO_MAGOS'; // Ex: usuario_magos      (painel → MySQL Databases → Database name)
$user = 'SEU_USUARIO_BANCO'; // Ex: usuario            (painel → MySQL Databases → Username)
$pass = 'SUA_SENHA_BANCO';   // A senha definida ao criar o banco no painel

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die(json_encode([
        "success" => false, 
        "error" => "Falha na conexão com o banco de dados."
    ]));
}
?>
