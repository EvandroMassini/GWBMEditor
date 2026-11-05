<?php
header('Content-Type: text/html; charset=utf-8');
$recebido = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $recebido = [
        'minimo'  => $_POST['conteudo_minimo']  ?? '',
        'medio'   => $_POST['conteudo_medio']   ?? '',
        'completo'=> $_POST['conteudo_completo'] ?? '',
        'custom'  => $_POST['conteudo_custom']  ?? '',
    ];
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Teste do GWBMEditor</title>
<style>
  body { font-family: system-ui, Arial, sans-serif; max-width: 1100px; margin: 20px auto; padding: 0 14px; background: #f6f7f9; color: #222; }
  h1 { font-size: 22px } h2 { font-size: 16px; margin: 26px 0 6px }
  pre { background: #fff; border: 1px solid #ccd; padding: 10px; overflow: auto; white-space: pre-wrap }
  .bar button, .btn { padding: 6px 12px; margin: 2px; cursor: pointer }
</style>
</head>
<body>
<h1>GWBMEditor – página de teste</h1>
<p>Biblioteca: <code>GWBMEditor/GWBMEditor.js</code> (arquivo único, sem dependências).</p>

<form method="post" id="frm">

  <h2>1) Barra mínima — <code>toolbar: 'minimal'</code></h2>
  <textarea name="conteudo_minimo" id="ed_min"><?= htmlspecialchars($recebido['minimo'] ?? '<p>Editor <b>mínimo</b>.</p>') ?></textarea>

  <h2>2) Barra média — <code>toolbar: 'medium'</code></h2>
  <textarea name="conteudo_medio" id="ed_med"><?= htmlspecialchars($recebido['medio'] ?? '<h2>Título</h2><p>Texto de exemplo com <a href="https://example.com">link</a>.</p>') ?></textarea>

  <h2>3) Barra completa — <code>toolbar: 'full'</code> (aceita script, style, iframe, formulário, atributos on*)</h2>
  <textarea name="conteudo_completo" id="ed_full"><?= htmlspecialchars($recebido['completo'] ?? '<h1>Editor completo</h1>
<p>Abra o <b>código-fonte</b> e cole qualquer HTML, inclusive:</p>
<style>.destaque { color: #c00; font-weight: bold; }</style>
<p class="destaque" onclick="alert(\'clicou!\')">Parágrafo com classe CSS e evento onclick.</p>
<script>document.title = "Título alterado pelo script da página";</script>
<form action="" method="post"><input type="text" name="nome" placeholder="Nome"> <button type="button">Botão</button></form>
<p><br></p>') ?></textarea>

  <h2>4) Barra personalizada (botões escolhidos + botão próprio)</h2>
  <textarea name="conteudo_custom" id="ed_custom"><?= htmlspecialchars($recebido['custom'] ?? '<p>Barra personalizada.</p>') ?></textarea>

  <p class="bar">
    <button type="submit" class="btn">Enviar (POST)</button>
    <button type="button" class="btn" onclick="alert(ed_full.getData())">getData() do completo</button>
    <button type="button" class="btn" onclick="ed_full.setData('<p>setData() funcionou</p>')">setData()</button>
    <button type="button" class="btn" onclick="ed_full.insertHtml('<b>[inserido]</b>')">insertHtml()</button>
    <button type="button" class="btn" onclick="ed_full.setMode(ed_full.getMode()==='source'?'wysiwyg':'source')">Alternar código-fonte</button>
  </p>
</form>

<?php if ($recebido): ?>
  <h2>Conteúdo recebido pelo PHP</h2>
  <?php foreach ($recebido as $k => $v): ?>
    <strong><?= htmlspecialchars($k) ?></strong>
    <pre><?= htmlspecialchars($v) ?></pre>
  <?php endforeach; ?>
<?php endif; ?>

<script src="../GWBMEditor.js"></script>
<script>
  // 1) mínima
  var ed_min = GWBMEditor.replace('ed_min', { toolbar: 'minimal', height: 160 });

  // 2) média
  var ed_med = GWBMEditor.replace('ed_med', { toolbar: 'medium', height: 240, language: 'pt' });

  // 3) completa
  var ed_full = GWBMEditor.replace('ed_full', { toolbar: 'full', height: 420, placeholder: 'Digite aqui...' });
  ed_full.on('change', function () { /* console.log('alterado'); */ });

  // 4) personalizada: lista de grupos + botão próprio
  var ed_custom = GWBMEditor.replace('ed_custom', {
    height: 220,
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['link', 'image', 'table'],
      ['dataHoje', 'insertScript', 'source']
    ],
    buttons: {
      dataHoje: {
        title: 'Inserir data de hoje',
        icon: '<b>📅</b>',
        exec: function (editor) { editor.insertText(new Date().toLocaleDateString()); }
      }
    }
  });
</script>
</body>
</html>
