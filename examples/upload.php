<?php
/**
 * Endpoint de exemplo para envio de imagens do GWBMEditor.
 * Opção do editor:  uploadUrl: 'upload.php'   (campo do formulário: "upload")
 * Resposta esperada: {"url": "caminho/da/imagem.png"}
 *
 * ATENÇÃO: é um exemplo didático. Em produção, exija autenticação/CSRF,
 * limite o tamanho e armazene fora da raiz web quando possível.
 */
header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['upload'])) fail('Nenhum arquivo enviado.');
$f = $_FILES['upload'];
if ($f['error'] !== UPLOAD_ERR_OK) fail('Erro no upload (' . $f['error'] . ').');
if ($f['size'] > 5 * 1024 * 1024) fail('Arquivo maior que 5 MB.');

$permitidos = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
$info = @getimagesize($f['tmp_name']);
if (!$info || !isset($permitidos[$info['mime']])) fail('Tipo de imagem não permitido.');

$dir = __DIR__ . '/uploads';
if (!is_dir($dir) && !mkdir($dir, 0775, true)) fail('Não foi possível criar a pasta de destino.', 500);

$nome = bin2hex(random_bytes(8)) . '.' . $permitidos[$info['mime']];
if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $nome)) fail('Falha ao gravar o arquivo.', 500);

echo json_encode(['url' => 'uploads/' . $nome]);
