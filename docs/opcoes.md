# Opções de configuração

Todas as opções são passadas no segundo argumento de `GWBMEditor.replace(alvo, opcoes)`.
Os valores padrão ficam em `GWBMEditor.defaults` e podem ser alterados globalmente:

```js
GWBMEditor.defaults.height = 500;
GWBMEditor.defaults.language = 'en';
```

`alvo` pode ser: o `id` do textarea, um seletor CSS, o elemento DOM ou um objeto jQuery.

## Tabela de opções

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `toolbar` | string \| array | `'medium'` | Preset (`'minimal'`, `'medium'`, `'full'`) ou lista de grupos. Ver [toolbars.md](toolbars.md). |
| `removeButtons` | string \| array | `''` | Botões a remover da barra escolhida (`'strike,emoji'`). |
| `extraToolbar` | array | `null` | Grupos acrescentados ao final da barra. |
| `buttons` | objeto | `{}` | Botões personalizados (nome → definição). |
| `height` | número \| string | `360` | Altura da área de edição (`400`, `'50vh'`). |
| `width` | número \| string | `'100%'` | Largura do editor. |
| `minHeight` | número | `0` | Altura mínima (útil com `autoGrow`). |
| `maxHeight` | número | `0` | Altura máxima com `autoGrow` (`0` = sem limite). |
| `autoGrow` | boolean | `false` | A altura acompanha o conteúdo. |
| `resizable` | boolean | `true` | Alça de redimensionamento vertical na barra de status. |
| `statusbar` | boolean | `true` | Barra inferior (caminho dos elementos e contagem). |
| `language` | string | `'auto'` | `'pt'`, `'en'` ou `'auto'` (usa `<html lang>`/idioma do navegador). |
| `strings` | objeto | `null` | Sobrescreve textos da interface: `{ bold: 'Negrito!' }`. Chaves em `GWBMEditor.strings`. |
| `theme` | string | `'light'` | `'light'`, `'dark'` ou `'auto'` (segue o sistema). Afeta apenas a interface, não o conteúdo. |
| `placeholder` | string | `''` | Texto exibido enquanto o editor está vazio. |
| `startupMode` | string | `'wysiwyg'` | `'wysiwyg'` ou `'source'`. |
| `readOnly` | boolean | `false` | Somente leitura. |
| `autofocus` | boolean | `false` | Foca o editor ao iniciar. |
| `tabSpaces` | número | `0` | Se `> 0`, `Tab` insere esse número de espaços. Com `0`, `Tab` move o foco (exceto em tabelas e listas, onde navega/recua). |
| `undoLevels` | número | `200` | Tamanho do histórico de desfazer. |
| `pasteMode` | string | `'clean'` | `'clean'` limpa HTML colado (Word/Docs/web); `'html'` mantém o do navegador; `'text'` cola somente texto. |
| `pasteKeepStyles` | RegExp | `/^(text-align\|font-weight\|font-style\|text-decoration\|vertical-align)$/i` | Propriedades CSS inline preservadas na colagem limpa. |
| `formatOutput` | boolean | `false` | Indenta o HTML devolvido por `getData()`. |
| `sourcePretty` | boolean | `true` | Indenta o HTML ao entrar no modo código-fonte. |
| `fullPage` | boolean | `false` | Edita um documento completo (`<!DOCTYPE>`, `<head>`, `<body>` preservados). |
| `contentCss` | string \| array | `[]` | URL(s) de CSS aplicadas **dentro** da área de edição, na visualização e na impressão. |
| `contentStyle` | string | `''` | CSS inline aplicado ao conteúdo (mesmas áreas). |
| `showGuides` | boolean | `true` | Pontilhado nas células de tabelas sem borda. |
| `fonts` | array | `null` | Lista de fontes do seletor (`['Arial','Georgia']`). |
| `fontSizes` | array | `null` | Tamanhos em px (`[10, 12, 16, 24]`). |
| `colors` | array | `null` | Paleta de cores (`['#000','#f00']`). |
| `templates` | array | `null` | Modelos do botão *Modelos*: `[{ title, description, html }]`. |
| `tableDefaults` | objeto | `{border:1, cellspacing:0, cellpadding:5, width:'100%'}` | Valores usados ao inserir tabelas. |
| `on` | objeto | `null` | Ouvintes de eventos: `{ ready: fn, change: fn }`. |
| `uploadUrl` | string | `null` | Endpoint de upload de imagens. |
| `uploadField` | string | `'upload'` | Nome do campo do arquivo no `FormData`. |
| `uploadHeaders` | objeto | `null` | Cabeçalhos HTTP do upload (ex.: CSRF). |
| `onUpload` | função | `null` | Upload totalmente customizado. |

## Upload de imagens

Ordem de decisão ao inserir/colar/arrastar uma imagem:

1. `onUpload(file, callback)` definido → é chamado. Chame `callback(url)` ou devolva uma `Promise` que resolva a URL.
2. `uploadUrl` definido → `POST multipart/form-data` com o campo `uploadField`. A resposta deve ser JSON com uma destas chaves: `url`, `location`, `data.url` ou `file`.
3. Nenhum dos dois → a imagem vira `data:` URL embutida no HTML.

```js
GWBMEditor.replace('t', {
  uploadUrl: '/api/upload',
  uploadHeaders: { 'X-CSRF-Token': token }
});

GWBMEditor.replace('t2', {
  onUpload: function (file, done) {
    meuServico.enviar(file).then(function (r) { done(r.link); });
  }
});
```

Exemplo de endpoint PHP: [`examples/upload.php`](../examples/upload.php).

## CSS do conteúdo

A área de edição é um `<iframe>`; o CSS do seu site **não** é aplicado nela automaticamente. Para que o texto se pareça com o resultado final:

```js
GWBMEditor.replace('t', {
  contentCss: ['/css/site.css', '/css/artigo.css'],
  contentStyle: 'body { font-family: Georgia, serif; max-width: 720px; margin: auto; }'
});
```

## Textos da interface

```js
GWBMEditor.replace('t', { language: 'pt', strings: { source: 'Ver HTML', link: 'Link' } });
```

As chaves disponíveis são as de `GWBMEditor.strings` (`console.log(Object.keys(GWBMEditor.strings))`); cada valor original é `[português, inglês]`.
