# Receitas e exemplos complexos

Versões executáveis em [`examples/avancados.html`](../examples/avancados.html).

## 1. Vários editores com barras diferentes

```js
var titulo   = GWBMEditor.replace('titulo',   { toolbar: 'minimal', height: 120 });
var corpo    = GWBMEditor.replace('corpo',    { toolbar: 'full',    height: 500 });
var comentario = GWBMEditor.replace('coment', { toolbar: 'medium',  removeButtons: 'source,image' });
```

## 2. Editor dentro de um modal / aba oculta

O iframe do editor mede-se quando visível. Crie o editor **quando o modal abrir** e destrua ao fechar:

```js
var ed;
modal.addEventListener('shown', function () { ed = GWBMEditor.replace('txt', { toolbar: 'medium' }); });
modal.addEventListener('hidden', function () { if (ed) { ed.destroy(); ed = null; } });  // o textarea recebe o HTML
```

## 3. Formulário com AJAX

```js
var ed = GWBMEditor.replace('conteudo', { toolbar: 'full' });

document.getElementById('salvar').onclick = function () {
  var fd = new FormData();
  fd.append('conteudo', ed.getData());
  fetch('/salvar.php', { method: 'POST', body: fd })
    .then(function (r) { return r.json(); })
    .then(function () { ed.resetDirty(); });
};

window.addEventListener('beforeunload', function (e) {
  if (ed.isDirty()) { e.preventDefault(); e.returnValue = ''; }
});
```

## 4. Limite de caracteres

```js
ed.on('change', function () {
  if (ed.getText().length > 500) ed.undo();
});
```

## 5. Rascunho automático (localStorage)

```js
var chave = 'rascunho_' + location.pathname;
ed.on('ready', function () { var r = localStorage.getItem(chave); if (r) ed.setData(r); });
ed.on('change', (function (t) { return function () { clearTimeout(t); t = setTimeout(function () { localStorage.setItem(chave, ed.getData()); }, 800); }; })());
```

## 6. Variáveis de template (mala direta)

```js
GWBMEditor.replace('email', {
  toolbar: [['bold', 'italic'], ['vars'], ['source']],
  buttons: {
    vars: {
      label: 'Variáveis', title: 'Inserir variável',
      menu: [{ v: '{{nome}}', l: 'Nome' }, { v: '{{empresa}}', l: 'Empresa' }, { v: '{{link}}', l: 'Link de acesso' }],
      apply: function (ed, v) { ed.insertText(v); }
    }
  }
});
```

No PHP: `str_replace(['{{nome}}', '{{empresa}}'], [$nome, $empresa], $_POST['email'])`.

## 7. Editor de e-mail HTML completo (documento inteiro)

```js
GWBMEditor.replace('html_email', {
  toolbar: 'full',
  fullPage: true,
  contentStyle: 'body{font-family:Arial;font-size:14px}'
});
// getData() devolve <!DOCTYPE>…<head>…</head><body>…</body></html>
```

## 8. Inserir JavaScript e HTML dinâmico

Pelo botão **JS** (`insertScript`) ou pelo código-fonte:

```html
<div id="relogio"></div>
<script>
  setInterval(function () { document.getElementById('relogio').textContent = new Date().toLocaleTimeString(); }, 1000);
</script>
```

No editor aparecem o `div` e um bloco amarelo `⟨script⟩`. Use **Visualizar** para ver o relógio funcionando. Por código: `ed.insertHtml('<script>alert(1)</scr' + 'ipt>')`.

## 9. Formulários dentro do conteúdo

```js
ed.insertHtml('<form action="/contato" method="post"><p><label>E-mail <input type="email" name="email" required></label></p><button type="submit">Enviar</button></form>');
```

(O botão `formElements` oferece todos os tipos de campo; duplo clique em um campo abre suas propriedades — `name`, `id`, `value`, `placeholder`, `required`…, no campo "Outros atributos".)

## 10. Tema escuro automático e idioma por usuário

```js
GWBMEditor.replace('t', { theme: 'auto', language: usuario.idioma /* 'pt' | 'en' */ });
```

## 11. Personalizar textos da interface

```js
GWBMEditor.replace('t', { strings: { source: 'Ver HTML', image: 'Inserir foto', table: 'Planilha' } });
```

## 12. Botão que abre um diálogo próprio

```js
buttons: {
  botaoCta: {
    title: 'Botão de chamada', icon: '🔘',
    exec: function (ed) {
      ed.dialog({
        title: 'Botão de chamada', fields: [
          { name: 'txt', label: 'Texto', value: 'Saiba mais' },
          { name: 'url', label: 'Endereço', placeholder: 'https://' },
          { name: 'cor', label: 'Cor', type: 'color', value: '#2563eb' }
        ],
        onOk: function (v) {
          if (!v.url) return false;
          ed.insertHtml('<a href="' + v.url + '" style="display:inline-block;padding:10px 18px;border-radius:6px;background:' + v.cor + ';color:#fff;text-decoration:none">' + v.txt + '</a>');
        }
      });
    }
  }
}
```

## 13. Upload com barra de autenticação (CSRF)

```js
GWBMEditor.replace('t', {
  uploadUrl: '/api/imagens',
  uploadHeaders: { 'X-CSRF-Token': document.querySelector('meta[name=csrf]').content }
});
```

Resposta aceita: `{"url":"/img/abc.png"}`, `{"location":"…"}`, `{"data":{"url":"…"}}` ou `{"file":"…"}`.

## 14. Leitura/atualização externa do textarea

```js
document.getElementById('formulario').addEventListener('submit', function () {
  ed.updateElement();           // garante que o <textarea> tem o HTML final
});
```

(É feito automaticamente; só é necessário se você ler o textarea em um ouvinte executado **antes** do editor, ou fora de `submit`.)

## 15. Tabela de preços gerada por dados

```js
var linhas = dados.map(function (p) { return '<tr><td>' + p.nome + '</td><td style="text-align:right">R$ ' + p.preco.toFixed(2) + '</td></tr>'; }).join('');
ed.insertHtml('<table border="1" style="width:100%;border-collapse:collapse"><thead><tr><th>Produto</th><th>Preço</th></tr></thead><tbody>' + linhas + '</tbody></table>');
```

## 16. Conteúdo com o visual do site

```js
GWBMEditor.replace('artigo', {
  toolbar: 'full',
  contentCss: ['/css/bootstrap.min.css', '/css/site.css'],
  contentStyle: 'body{padding:20px}'
});
```
