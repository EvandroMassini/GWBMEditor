/*!
 * GWBMEditor v1.0.0
 * Editor HTML WYSIWYG (arquivo único, sem dependências) para elementos <textarea>.
 * Implementação própria ("clean-room"): nenhum código de terceiros foi utilizado.
 *
 * Copyright (C) 2026 Evandro
 * Licença: GNU Affero General Public License v3.0 (AGPL-3.0) — veja o arquivo LICENSE.
 * Este programa é distribuído SEM QUALQUER GARANTIA; veja a licença para detalhes.
 *
 * USO BÁSICO
 *   <textarea id="meu"></textarea>
 *   <script src="js/GWBMEditor.js"></script>
 *   <script>
 *     var ed = GWBMEditor.replace('meu', { toolbar: 'full', height: 400 });
 *     ed.getData();  ed.setData('<p>Olá</p>');
 *   </script>
 *
 * BARRAS DE FERRAMENTAS
 *   toolbar: 'minimal' | 'medium' | 'full'            (padrões da biblioteca; aliases: basic, standard, complete...)
 *   toolbar: [ ['bold','italic'], ['link','image'], '/', ['source'] ]   (grupos; '/' = quebra de linha)
 *   toolbar: ['bold','italic','|','link','source']    (lista simples; '|' = separador)
 *   removeButtons: 'strike,subscript'                 (remove botões do preset escolhido)
 *   extraToolbar: [ ['insertScript'] ]                (acrescenta grupos ao final)
 *   buttons: { meuBotao: { title:'Texto', icon:'<b>X</b>', exec:function(editor){ ... }, state:function(editor){ return false; } } }
 *     (também aceita menu:[{v,l}] + apply(editor,v)   ou   panel(editor, painel, fechar))
 *   GWBMEditor.toolbars.medium = [...]                (altera os presets globalmente)
 *   GWBMEditor.defaults.height = 500                  (altera opções padrão globalmente)
 *   GWBMEditor.addCommand('nome', definição)          (registra um comando/botão global)
 *
 * OPÇÕES PRINCIPAIS
 *   height, width, minHeight, autoGrow, maxHeight, resizable, statusbar, language ('auto'|'pt'|'en'),
 *   theme ('light'|'dark'|'auto'), pasteMode ('clean'|'html'|'text'), uploadUrl/uploadField/uploadHeaders/onUpload,
 *   contentCss (url ou array), contentStyle (string CSS), fullPage (edita documento completo),
 *   formatOutput (indenta o HTML retornado), sourcePretty, readOnly, autofocus, tabSpaces, fonts, fontSizes,
 *   colors, templates, tableDefaults, startupMode ('wysiwyg'|'source'), placeholder, strings, on:{evento:fn}
 *
 * API DA INSTÂNCIA
 *   getData() setData(html) insertHtml(html) insertText(txt) exec(cmd,val) focus() updateElement() destroy()
 *   setMode('source'|'wysiwyg') getMode() fullscreen(bool) setReadOnly(bool) isDirty() resetDirty()
 *   on(evento,fn) off(evento,fn)   eventos: ready, change, selectionChange, modeChange, focus, blur, destroy
 *   undo() redo() getText() getBody() getDocument() getContainer() setToolbar(spec) resize(w,h)
 *
 * SCRIPTS / HTML LIVRE: o editor preserva <script>, <style>, <iframe>, formulários, atributos on*, etc.
 * Elementos "perigosos" são exibidos como blocos protegidos na edição visual (não executam) e
 * retornam intactos em getData(). Na "Visualização" os scripts são executados.
 */
(function (global) {
'use strict';
if (global.GWBMEditor && global.GWBMEditor.version) return;

var VERSION = '1.0.0';
var doc = document;
var instances = [];
var idCounter = 0;

/* ===================================================================== utilitários */
function isStr(x) { return typeof x === 'string'; }
function isFn(x) { return typeof x === 'function'; }
function arr(x) { return Array.prototype.slice.call(x || []); }
function extend(t) {
  for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; }
  return t;
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function px(v) { return /^\d+$/.test(String(v)) ? v + 'px' : v; }
function el(tag, attrs, html, parent) {
  var e = doc.createElement(tag);
  if (attrs) for (var k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  if (html != null && html !== '') e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function closest(n, sel, root) {
  while (n && n !== root) { if (n.nodeType === 1 && n.matches(sel)) return n; n = n.parentNode; }
  return null;
}
function unwrap(n) {
  var p = n.parentNode; if (!p) return;
  while (n.firstChild) p.insertBefore(n.firstChild, n);
  p.removeChild(n);
}
function rep(s, n) { return new Array(n + 1).join(s); }
function warn() { if (global.console && console.warn) console.warn.apply(console, ['[GWBMEditor]'].concat(arr(arguments))); }
function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
function parseAttrLines(txt) {
  var map = {}, order = [];
  String(txt || '').split(/\r?\n/).forEach(function (l) {
    l = l.trim(); if (!l) return;
    var i = l.indexOf('='), k, v;
    if (i < 0) { k = l; v = ''; } else { k = l.slice(0, i).trim(); v = l.slice(i + 1).trim(); if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1); }
    if (/^[^\s"'<>\/=]+$/.test(k)) { map[k] = v; order.push(k); }
  });
  return map;
}
function attrName(n) { return n.indexOf('data-gwbm-on') === 0 ? n.slice(10) : n; }
function safeAttr(elm, name, val) {
  var n = String(name).toLowerCase();
  if (/^on/.test(n)) n = 'data-gwbm-' + n;
  if (val === null || val === undefined) elm.removeAttribute(n); else elm.setAttribute(n, val);
}
function attrLines(elm, skip) {
  var out = [];
  arr(elm.attributes).forEach(function (a) {
    var n = attrName(a.name);
    if (skip.indexOf(n) >= 0 || n === 'data-gwbm-raw' || n === 'data-gwbm-tag' || n === 'contenteditable') return;
    out.push(n + '=' + a.value);
  });
  return out.join('\n');
}
function langIdx(l) {
  l = l || 'auto';
  if (l === 'auto') l = doc.documentElement.lang || navigator.language || 'pt';
  return /^pt/i.test(l) ? 0 : 1;
}

/* ===================================================================== textos [pt, en] */
var STR = {
  bold: ['Negrito', 'Bold'], italic: ['Itálico', 'Italic'], underline: ['Sublinhado', 'Underline'], strike: ['Tachado', 'Strikethrough'],
  subscript: ['Subscrito', 'Subscript'], superscript: ['Sobrescrito', 'Superscript'], code: ['Código em linha', 'Inline code'],
  mark: ['Destacar (marca-texto)', 'Highlight'], kbd: ['Tecla de teclado', 'Keyboard key'], small: ['Texto pequeno', 'Small text'],
  inlineMenu: ['Mais estilos de texto', 'More text styles'], removeFormat: ['Remover formatação', 'Remove formatting'],
  undo: ['Desfazer', 'Undo'], redo: ['Refazer', 'Redo'], cut: ['Recortar', 'Cut'], copy: ['Copiar', 'Copy'],
  pasteText: ['Colar como texto simples', 'Paste as plain text'], pasteWord: ['Colar do Word/Web (limpo)', 'Paste from Word/Web (clean)'],
  selectAll: ['Selecionar tudo', 'Select all'], clearAll: ['Limpar todo o conteúdo', 'Clear all content'],
  format: ['Formato', 'Format'], fontFamily: ['Fonte', 'Font'], fontSize: ['Tamanho', 'Size'], lineHeight: ['Espaçamento entre linhas', 'Line height'],
  textColor: ['Cor do texto', 'Text color'], bgColor: ['Cor de fundo', 'Background color'], automatic: ['Automática', 'Automatic'],
  moreColors: ['Mais cores...', 'More colors...'],
  alignLeft: ['Alinhar à esquerda', 'Align left'], alignCenter: ['Centralizar', 'Center'], alignRight: ['Alinhar à direita', 'Align right'],
  alignJustify: ['Justificar', 'Justify'], bulletedList: ['Lista com marcadores', 'Bulleted list'], numberedList: ['Lista numerada', 'Numbered list'],
  checklist: ['Lista de tarefas', 'Task list'], definitionList: ['Lista de definição', 'Definition list'], outdent: ['Diminuir recuo', 'Decrease indent'],
  indent: ['Aumentar recuo', 'Increase indent'], blockquote: ['Citação', 'Block quote'], ltr: ['Direção: esquerda para direita', 'Direction: left to right'],
  rtl: ['Direção: direita para esquerda', 'Direction: right to left'], link: ['Inserir/editar link', 'Insert/edit link'], unlink: ['Remover link', 'Remove link'],
  anchor: ['Âncora', 'Anchor'], image: ['Imagem', 'Image'], table: ['Tabela', 'Table'], hr: ['Linha horizontal', 'Horizontal line'],
  pageBreak: ['Quebra de página', 'Page break'], specialChar: ['Caractere especial', 'Special character'], emoji: ['Emoji', 'Emoji'],
  dateTime: ['Data e hora', 'Date and time'], video: ['Vídeo', 'Video'], audio: ['Áudio', 'Audio'], iframe: ['Quadro incorporado (iframe)', 'Embedded frame (iframe)'],
  insertHtml: ['Inserir HTML livre', 'Insert raw HTML'], insertScript: ['Inserir JavaScript', 'Insert JavaScript'], insertStyle: ['Inserir CSS', 'Insert CSS'],
  insertComment: ['Comentário HTML', 'HTML comment'], insertElement: ['Inserir qualquer elemento HTML', 'Insert any HTML element'],
  structure: ['Estruturas (section, article, details...)', 'Structures (section, article, details...)'], formElements: ['Elementos de formulário', 'Form elements'],
  codeBlock: ['Bloco de código', 'Code block'], templates: ['Modelos', 'Templates'], showBlocks: ['Mostrar blocos', 'Show blocks'],
  elementProps: ['Propriedades do elemento (id, classe, estilo, atributos)', 'Element properties (id, class, style, attributes)'],
  editHtml: ['Editar HTML do elemento', 'Edit element HTML'], source: ['Código-fonte', 'Source code'], fullscreen: ['Tela cheia', 'Fullscreen'],
  preview: ['Visualizar (executa scripts)', 'Preview (runs scripts)'], print: ['Imprimir', 'Print'], find: ['Localizar e substituir', 'Find and replace'],
  about: ['Sobre o GWBMEditor', 'About GWBMEditor'], formatSource: ['Formatar código-fonte', 'Format source code'],
  tableTools: ['Ferramentas de tabela', 'Table tools'], tableRowAbove: ['Inserir linha acima', 'Insert row above'], tableRowBelow: ['Inserir linha abaixo', 'Insert row below'],
  tableRowDel: ['Excluir linha', 'Delete row'], tableColLeft: ['Inserir coluna à esquerda', 'Insert column left'], tableColRight: ['Inserir coluna à direita', 'Insert column right'],
  tableColDel: ['Excluir coluna', 'Delete column'], tableMerge: ['Mesclar com a célula à direita', 'Merge with right cell'], tableSplit: ['Dividir célula', 'Split cell'],
  tableCell: ['Propriedades da célula', 'Cell properties'], tableProps: ['Propriedades da tabela', 'Table properties'], tableDel: ['Excluir tabela', 'Delete table'],
  paragraph: ['Parágrafo', 'Paragraph'], heading: ['Título', 'Heading'], preformatted: ['Pré-formatado', 'Preformatted'], address: ['Endereço', 'Address'], normalDiv: ['Bloco (div)', 'Block (div)'],
  ok: ['OK', 'OK'], cancel: ['Cancelar', 'Cancel'], close: ['Fechar', 'Close'], insert: ['Inserir', 'Insert'], apply: ['Aplicar', 'Apply'],
  url: ['URL / endereço', 'URL / address'], text: ['Texto', 'Text'], title: ['Título (tooltip)', 'Title (tooltip)'], target: ['Destino', 'Target'],
  targetSelf: ['Mesma janela', 'Same window'], targetBlank: ['Nova janela', 'New window'], linkType: ['Tipo de link', 'Link type'],
  typeUrl: ['Endereço web', 'Web address'], typeAnchor: ['Âncora na página', 'Anchor in page'], typeEmail: ['E-mail', 'E-mail'], typePhone: ['Telefone', 'Phone'],
  name: ['Nome', 'Name'], alt: ['Texto alternativo', 'Alt text'], width: ['Largura', 'Width'], height: ['Altura', 'Height'], align: ['Alinhamento', 'Alignment'],
  none: ['Nenhum', 'None'], left: ['Esquerda', 'Left'], right: ['Direita', 'Right'], center: ['Centro', 'Center'], upload: ['Enviar arquivo', 'Upload file'],
  rows: ['Linhas', 'Rows'], cols: ['Colunas', 'Columns'], headerRow: ['Linha de cabeçalho', 'Header row'], border: ['Borda', 'Border'], caption: ['Legenda', 'Caption'],
  moreOptions: ['Mais opções...', 'More options...'],
  extraAttrs: ['Outros atributos (nome=valor, um por linha)', 'Other attributes (name=value, one per line)'],
  extraExample: ["data-id=15\naria-label=Descrição do elemento\nonclick=alert('olá')", "data-id=15\naria-label=Element description\nonclick=alert('hello')"],
  tmTable: ['Tabela', 'Table'], tmRow: ['Linha', 'Row'], tmCol: ['Coluna', 'Column'], tmCell: ['Célula', 'Cell'], tmFormat: ['Formatar...', 'Format...'],
  tableFormat: ['Formatação avançada da tabela', 'Advanced table formatting'], paraBefore: ['Inserir parágrafo antes da tabela', 'Insert paragraph before table'],
  paraAfter: ['Inserir parágrafo depois da tabela', 'Insert paragraph after table'], rowDup: ['Duplicar linha', 'Duplicate row'],
  tableMergeDown: ['Mesclar com a célula abaixo', 'Merge with cell below'], cellToggleHead: ['Alternar célula de cabeçalho (td/th)', 'Toggle header cell (td/th)'],
  tfTable: ['Tabela', 'Table'], tfCells: ['Células', 'Cells'], tfHead: ['Cabeçalho e linhas alternadas', 'Header and striped rows'],
  tfScope: ['Aplicar a formatação de célula em', 'Apply cell formatting to'], scopeTable: ['Tabela inteira', 'Whole table'], scopeRow: ['Linha atual', 'Current row'],
  scopeCol: ['Coluna atual', 'Current column'], scopeCell: ['Somente a célula atual', 'Current cell only'], collapse: ['Bordas', 'Borders'],
  collapseC: ['Unidas (collapse)', 'Merged (collapse)'], collapseS: ['Separadas', 'Separate'], borderStyle: ['Estilo da borda', 'Border style'],
  borderColor: ['Cor da borda', 'Border color'], borderWidth: ['Espessura da borda (px)', 'Border width (px)'], fontSizeF: ['Tamanho da fonte (px)', 'Font size (px)'],
  headBg: ['Fundo do cabeçalho (th)', 'Header background (th)'], headFg: ['Cor do texto do cabeçalho', 'Header text color'], headBold: ['Cabeçalho em negrito', 'Bold header'],
  zebra1: ['Cor das linhas ímpares', 'Odd rows color'], zebra2: ['Cor das linhas pares', 'Even rows color'], clearStyles: ['Limpar estilos anteriores das células-alvo', 'Clear previous styles of target cells'],
  capSide: ['Posição da legenda', 'Caption position'], top: ['Acima', 'Top'], bottom: ['Abaixo', 'Bottom'], tfHint: ['Campos em branco não alteram nada.', 'Blank fields change nothing.'],
  tbAlign: ['Posição da tabela na página', 'Table position on page'], spacingF: ['Espaçamento entre células (px)', 'Cell spacing (px)'], unchanged: ['— manter —', '— keep —'],
  imgPreview: ['Pré-visualização', 'Preview'], noImage: ['Nenhuma imagem selecionada', 'No image selected'], imgError: ['Não foi possível carregar a imagem.', 'Could not load the image.'],
  cssClass: ['Classe CSS', 'CSS class'], style: ['Estilo (CSS)', 'Style (CSS)'], lang: ['Idioma (lang)', 'Language (lang)'], dir: ['Direção', 'Direction'],
  html: ['HTML', 'HTML'], css: ['CSS', 'CSS'], jsCode: ['Código JavaScript', 'JavaScript code'], scriptSrc: ['URL do script (src) — opcional', 'Script URL (src) — optional'],
  scriptType: ['Tipo', 'Type'], media: ['Mídia (media)', 'Media (media query)'], async: ['async', 'async'], defer: ['defer', 'defer'],
  find_: ['Localizar', 'Find'], replace: ['Substituir por', 'Replace with'], findNext: ['Localizar próximo', 'Find next'], replaceOne: ['Substituir', 'Replace'],
  replaceAll: ['Substituir tudo', 'Replace all'], matchCase: ['Diferenciar maiúsculas/minúsculas', 'Match case'], notFound: ['Texto não encontrado.', 'Text not found.'],
  replacedN: ['substituições', 'replacements'], words: ['Palavras', 'Words'], chars: ['Caracteres', 'Characters'],
  pasteHere: ['Cole o conteúdo na área abaixo (Ctrl+V):', 'Paste the content in the area below (Ctrl+V):'],
  tag: ['Elemento (tag)', 'Element (tag)'], customTag: ['ou tag personalizada (ex.: meu-componente)', 'or custom tag (e.g. my-component)'],
  innerContent: ['Conteúdo interno (HTML)', 'Inner content (HTML)'], wrapSel: ['Envolver o texto selecionado', 'Wrap the selected text'],
  comment: ['Texto do comentário', 'Comment text'], language: ['Linguagem', 'Language'], controls: ['Controles', 'Controls'], autoplay: ['Reprodução automática', 'Autoplay'],
  loop: ['Repetir', 'Loop'], muted: ['Sem som', 'Muted'], poster: ['Imagem de capa (poster)', 'Poster image'], allowfs: ['Permitir tela cheia', 'Allow fullscreen'],
  sandbox: ['Atributo sandbox (opcional)', 'Sandbox attribute (optional)'], lazy: ['Carregamento tardio (lazy)', 'Lazy loading'],
  spacing: ['Espaçamento entre células', 'Cell spacing'], padding: ['Espaçamento interno', 'Cell padding'], bg: ['Cor de fundo', 'Background color'],
  valign: ['Alinhamento vertical', 'Vertical alignment'], colspan: ['Colspan', 'Colspan'], rowspan: ['Rowspan', 'Rowspan'], nowrap: ['Sem quebra de linha', 'No wrap'],
  cellType: ['Tipo de célula', 'Cell type'], dataCell: ['Dados (td)', 'Data (td)'], headCell: ['Cabeçalho (th)', 'Header (th)'], rel: ['Relação (rel)', 'Relationship (rel)'],
  idAttr: ['ID', 'ID'], anchorName: ['Nome da âncora', 'Anchor name'], confirmClear: ['Apagar todo o conteúdo?', 'Delete all content?'],
  uploadError: ['Falha no envio do arquivo.', 'File upload failed.'], noElement: ['Selecione um elemento primeiro.', 'Select an element first.'],
  noCell: ['Posicione o cursor dentro de uma célula de tabela.', 'Place the cursor inside a table cell.'],
  aboutText: ['Editor HTML WYSIWYG em arquivo único, sem dependências.', 'Single-file WYSIWYG HTML editor with no dependencies.'],
  clipboardDenied: ['O navegador bloqueou o acesso à área de transferência. Use Ctrl+V na caixa a seguir.', 'The browser blocked clipboard access. Use Ctrl+V in the box below.'],
  now: ['Agora', 'Now'], dateOnly: ['Data', 'Date'], timeOnly: ['Hora', 'Time'], dateTimeBoth: ['Data e hora', 'Date and time'],
  tplBasic: ['Duas colunas', 'Two columns'], tplBasicD: ['Layout com duas colunas de texto', 'Layout with two text columns'],
  tplNote: ['Aviso / destaque', 'Notice / callout'], tplNoteD: ['Caixa de destaque', 'Highlighted box'], tplImg: ['Imagem com legenda', 'Image with caption'], tplImgD: ['Figura com legenda', 'Figure with caption'],
  sampleText: ['Texto de exemplo', 'Sample text'], item: ['Item', 'Item'], term: ['Termo', 'Term'], definition: ['Definição', 'Definition'], summary: ['Resumo (clique para expandir)', 'Summary (click to expand)'],
  contentHere: ['Conteúdo aqui', 'Content here'], legendTxt: ['Legenda', 'Caption'], showDlg: ['Propriedades', 'Properties']
};

/* ===================================================================== ícones */
function svg(p) { return '<svg class="gwbm-ico" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
var I = {
  undo: svg('<path d="M3 6h7a3.5 3.5 0 010 7H6"/><path d="M6 3L3 6l3 3"/>'),
  redo: svg('<path d="M13 6H6a3.5 3.5 0 000 7h4"/><path d="M10 3l3 3-3 3"/>'),
  link: svg('<path d="M7 9a3 3 0 004 0l2-2a3 3 0 00-4-4l-1 1"/><path d="M9 7a3 3 0 00-4 0L3 9a3 3 0 004 4l1-1"/>'),
  unlink: svg('<path d="M7 9a3 3 0 004 0l2-2a3 3 0 00-4-4l-1 1"/><path d="M9 7a3 3 0 00-4 0L3 9a3 3 0 004 4l1-1"/><path d="M2 2l12 12" stroke="#d33"/>'),
  image: svg('<rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="6" cy="7" r="1"/><path d="M2 12l4-4 3 3 2-2 3 3"/>'),
  table: svg('<rect x="2" y="3" width="12" height="10"/><path d="M2 7h12M2 10h12M7 3v10"/>'),
  left: svg('<path d="M2 3h12M2 6h8M2 9h12M2 12h8"/>'), center: svg('<path d="M2 3h12M4 6h8M2 9h12M4 12h8"/>'),
  right: svg('<path d="M2 3h12M6 6h8M2 9h12M6 12h8"/>'), justify: svg('<path d="M2 3h12M2 6h12M2 9h12M2 12h12"/>'),
  ul: svg('<path d="M6 4h8M6 8h8M6 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"/>'),
  ol: svg('<path d="M7 4h7M7 8h7M7 12h7"/><path d="M2 3l1-.6V6M2 9.4c0-1 2-1 2 0S2 11 2 12h2"/>'),
  indent: svg('<path d="M2 3h12M7 6h7M7 9h7M2 12h12M2 6l3 1.5L2 9z"/>'), outdent: svg('<path d="M2 3h12M7 6h7M7 9h7M2 12h12M5 6L2 7.5 5 9z"/>'),
  hr: svg('<path d="M2 8h12M5 4v2M8 4v2M11 4v2M5 10v2M8 10v2M11 10v2" stroke-width="1"/>'),
  eye: svg('<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>'),
  print: svg('<path d="M4 6V2h8v4M4 12H2V6h12v6h-2"/><rect x="4" y="9" width="8" height="5"/>'),
  find: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>'),
  full: svg('<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>'),
  clear: svg('<path d="M3 4h10M6 4V2.5h4V4M4.5 4l.7 9.5h5.6l.7-9.5M7 7v4M9 7v4"/>'),
  info: svg('<circle cx="8" cy="8" r="6"/><path d="M8 7.5V11M8 5h.01"/>'),
  cut: svg('<circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><path d="M5.5 10.5L12 2M10.5 10.5L4 2"/>'),
  copy: svg('<rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2"/>'),
  paste: svg('<rect x="3" y="3" width="10" height="11" rx="1"/><path d="M6 3V2h4v1M6 7h4M6 10h4"/>'),
  anchor: svg('<circle cx="8" cy="3.5" r="1.5"/><path d="M8 5v9M4 8h8M3 10a5 5 0 0010 0"/>'),
  quote: svg('<path d="M3 11V8c0-2 1-3 3-3M9 11V8c0-2 1-3 3-3"/><path d="M3 11h3V8H3zM9 11h3V8H9z" fill="currentColor"/>'),
  blocks: svg('<rect x="2" y="2" width="12" height="5" stroke-dasharray="2 1.5"/><rect x="2" y="9" width="12" height="5" stroke-dasharray="2 1.5"/>'),
  tools: svg('<path d="M10.5 2.5a3 3 0 00-3 4L2.5 11.5a1.4 1.4 0 002 2l5-5a3 3 0 004-3l-2 2-2-.5-.5-2z"/>'),
  tpl: svg('<rect x="2" y="2" width="12" height="12" rx="1"/><path d="M2 6h12M7 6v8"/>'),
  film: svg('<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M7 6l3 2-3 2z" fill="currentColor"/>'),
  note: svg('<path d="M5 13V4l8-1.5v9"/><circle cx="3.5" cy="13" r="1.5"/><circle cx="11.5" cy="11.5" r="1.5"/>'),
  frame: svg('<rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 6h12"/>'),
  txt: function (t, s) { return '<span class="gwbm-t"' + (s ? ' style="' + s + '"' : '') + '>' + t + '</span>'; }
};

/* ===================================================================== estilos */
var HOST_CSS =
'.gwbm-editor,.gwbm-overlay,.gwbm-pop{--gb-bg:#fff;--gb-fg:#1f2933;--gb-bd:#cfd6df;--gb-tb:#f3f5f8;--gb-hov:#e4e9f0;--gb-act:#cfe2ff;--gb-acc:#2563eb;--gb-pop:#fff;--gb-inp:#fff;--gb-sh:0 6px 24px rgba(0,0,0,.2)}' +
'.gwbm-dark.gwbm-editor,.gwbm-dark.gwbm-overlay,.gwbm-dark.gwbm-pop,.gwbm-dark .gwbm-pop{--gb-bg:#1e2227;--gb-fg:#e6e9ee;--gb-bd:#3a424d;--gb-tb:#272c33;--gb-hov:#343b45;--gb-act:#2f4f86;--gb-acc:#6ea0ff;--gb-pop:#272c33;--gb-inp:#1a1d21;--gb-sh:0 6px 24px rgba(0,0,0,.6)}' +
'.gwbm-editor{border:1px solid var(--gb-bd);background:var(--gb-bg);color:var(--gb-fg);font:13px/1.4 system-ui,"Segoe UI",Arial,sans-serif;display:flex;flex-direction:column;position:relative;border-radius:4px;max-width:100%}' +
'.gwbm-editor *,.gwbm-overlay *,.gwbm-pop *{box-sizing:border-box}' +
'.gwbm-toolbar{display:flex;flex-wrap:wrap;gap:3px 2px;padding:4px;background:var(--gb-tb);border-bottom:1px solid var(--gb-bd);border-radius:4px 4px 0 0;user-select:none}' +
'.gwbm-group{display:flex;flex-wrap:wrap;align-items:center;gap:1px;padding-right:5px;margin-right:3px;border-right:1px solid var(--gb-bd)}' +
'.gwbm-group:last-child{border-right:0}.gwbm-break{flex-basis:100%;height:0}' +
'.gwbm-btn{min-width:28px;height:28px;padding:0 6px;border:1px solid transparent;background:transparent;color:inherit;border-radius:3px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:3px;font:inherit;line-height:1}' +
'.gwbm-btn:hover:not(:disabled){background:var(--gb-hov);border-color:var(--gb-bd)}.gwbm-btn.gwbm-on{background:var(--gb-act);border-color:var(--gb-acc)}' +
'.gwbm-btn:disabled{opacity:.35;cursor:default}.gwbm-btn .gwbm-ico{display:block}.gwbm-t{font-weight:600;font-size:13px}' +
'.gwbm-cap{min-width:54px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}.gwbm-arrow{font-size:9px;opacity:.7}' +
'.gwbm-body{position:relative;overflow:hidden;background:#fff;flex:1 1 auto;min-height:60px}' +
'.gwbm-frame{display:block;width:100%;height:100%;border:0;background:#fff}' +
'.gwbm-source{display:none;width:100%;height:100%;border:0;margin:0;padding:10px;resize:none;outline:0;background:var(--gb-inp);color:var(--gb-fg);font:13px/1.5 Consolas,"Courier New",monospace;tab-size:2;white-space:pre;overflow:auto}' +
'.gwbm-source-on .gwbm-source{display:block}.gwbm-source-on .gwbm-frame{display:none}.gwbm-source-on .gwbm-selbox,.gwbm-source-on .gwbm-handle{display:none!important}' +
'.gwbm-status{display:flex;align-items:center;gap:10px;padding:2px 6px;border-top:1px solid var(--gb-bd);background:var(--gb-tb);font-size:11px;min-height:22px;border-radius:0 0 4px 4px}' +
'.gwbm-path{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;opacity:.85}.gwbm-path span{cursor:pointer;padding:0 2px}.gwbm-path span:hover{text-decoration:underline}' +
'.gwbm-count{opacity:.8;white-space:nowrap}.gwbm-grip{width:14px;height:14px;cursor:ns-resize;opacity:.6;background:linear-gradient(135deg,transparent 50%,currentColor 50%,currentColor 56%,transparent 56%,transparent 68%,currentColor 68%,currentColor 74%,transparent 74%)}' +
'.gwbm-selbox{position:absolute;display:none;border:2px solid var(--gb-acc);pointer-events:none;z-index:3}' +
'.gwbm-handle{position:absolute;display:none;width:11px;height:11px;background:var(--gb-acc);border:1px solid #fff;cursor:nwse-resize;z-index:4}' +
'.gwbm-shield{position:absolute;inset:0;z-index:9;cursor:nwse-resize}' +
'.gwbm-tmenu{position:absolute;display:none;z-index:6;gap:1px;padding:2px;background:var(--gb-pop);color:var(--gb-fg);border:1px solid var(--gb-bd);border-radius:4px;box-shadow:var(--gb-sh);font-size:12px;user-select:none}' +
'.gwbm-tbtn{border:0;background:transparent;color:inherit;padding:3px 8px;cursor:pointer;border-radius:3px;font:inherit;white-space:nowrap}.gwbm-tbtn:hover{background:var(--gb-hov)}.gwbm-source-on .gwbm-tmenu{display:none!important}' +
'.gwbm-imgprev{min-height:90px;max-height:210px;border:1px dashed var(--gb-bd);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;border-radius:4px;background:repeating-conic-gradient(#e2e2e2 0 25%,#fff 0 50%) 50%/14px 14px;color:#333}.gwbm-imgprev img{max-width:100%;max-height:150px;display:none}.gwbm-imgprev small{background:rgba(255,255,255,.85);padding:0 6px;border-radius:3px}' +
'.gwbm-fullscreen{position:fixed!important;inset:0;z-index:2147482000;width:auto!important;height:auto!important;border-radius:0;max-width:none}.gwbm-fullscreen .gwbm-body{height:auto!important;flex:1 1 auto}' +
'.gwbm-pop{position:absolute;z-index:50;background:var(--gb-pop);color:var(--gb-fg);border:1px solid var(--gb-bd);box-shadow:var(--gb-sh);border-radius:4px;padding:4px;max-height:340px;overflow:auto;font:13px/1.4 system-ui,"Segoe UI",Arial,sans-serif}' +
'.gwbm-item{padding:4px 10px;cursor:pointer;white-space:nowrap;border-radius:3px}.gwbm-item:hover{background:var(--gb-hov)}.gwbm-item.gwbm-cur{background:var(--gb-act)}' +
'.gwbm-colors{display:grid;grid-template-columns:repeat(10,20px);gap:3px;padding:2px}.gwbm-sw{width:20px;height:20px;border:1px solid rgba(0,0,0,.25);cursor:pointer;padding:0}.gwbm-sw:hover{outline:2px solid var(--gb-acc)}' +
'.gwbm-pbtn{display:block;width:100%;margin-top:4px;padding:4px;border:1px solid var(--gb-bd);background:var(--gb-tb);color:inherit;border-radius:3px;cursor:pointer;font:inherit}.gwbm-pbtn:hover{background:var(--gb-hov)}' +
'.gwbm-chars{display:grid;grid-template-columns:repeat(12,28px);gap:1px}.gwbm-chars button{width:28px;height:28px;border:1px solid transparent;background:transparent;color:inherit;cursor:pointer;font-size:16px;border-radius:3px;padding:0}.gwbm-chars button:hover{background:var(--gb-hov);border-color:var(--gb-bd)}' +
'.gwbm-grid{display:grid;grid-template-columns:repeat(10,18px);gap:2px;padding:2px}.gwbm-grid i{width:18px;height:18px;border:1px solid var(--gb-bd);background:var(--gb-inp);display:block}.gwbm-grid i.gwbm-hl{background:var(--gb-act);border-color:var(--gb-acc)}.gwbm-gridlbl{text-align:center;padding:3px;font-size:12px}' +
'.gwbm-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.42);display:flex;align-items:flex-start;justify-content:center;padding:5vh 10px;overflow:auto;font:13px/1.4 system-ui,"Segoe UI",Arial,sans-serif}' +
'.gwbm-overlay.gwbm-nomodal{background:transparent;pointer-events:none;justify-content:flex-end}.gwbm-nomodal .gwbm-dialog{pointer-events:auto}' +
'.gwbm-dialog{background:var(--gb-pop);color:var(--gb-fg);border:1px solid var(--gb-bd);box-shadow:var(--gb-sh);border-radius:6px;max-width:100%;display:flex;flex-direction:column}' +
'.gwbm-dhead{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--gb-bd);font-weight:600;font-size:14px}' +
'.gwbm-dhead button{border:0;background:transparent;color:inherit;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}' +
'.gwbm-dbody{padding:12px 14px;display:flex;flex-wrap:wrap;gap:8px;max-height:72vh;overflow:auto}' +
'.gwbm-field{display:flex;flex-direction:column;gap:3px;flex:1 1 100%;font-size:12px}.gwbm-field.gwbm-half{flex:1 1 calc(50% - 4px);min-width:120px}' +
'.gwbm-field.gwbm-chk{flex-direction:row;align-items:center;gap:6px;flex:0 1 auto;min-width:40%}' +
'.gwbm-field input[type=text],.gwbm-field input[type=number],.gwbm-field select,.gwbm-field textarea{width:100%;padding:6px 8px;border:1px solid var(--gb-bd);border-radius:4px;background:var(--gb-inp);color:var(--gb-fg);font:13px system-ui,"Segoe UI",Arial,sans-serif}' +
'.gwbm-field textarea{font-family:Consolas,"Courier New",monospace;resize:vertical;white-space:pre}.gwbm-field input:focus,.gwbm-field select:focus,.gwbm-field textarea:focus{outline:2px solid var(--gb-acc);outline-offset:-1px}' +
'.gwbm-colorrow{display:flex;gap:6px}.gwbm-colorrow input[type=color]{width:40px;padding:0;border:1px solid var(--gb-bd);background:transparent;height:30px}' +
'.gwbm-dfoot{display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid var(--gb-bd);flex-wrap:wrap}' +
'.gwbm-dfoot button{padding:6px 16px;border:1px solid var(--gb-bd);background:var(--gb-tb);color:inherit;border-radius:4px;cursor:pointer;font:inherit}.gwbm-dfoot button:hover{background:var(--gb-hov)}' +
'.gwbm-dfoot button.gwbm-primary{background:var(--gb-acc);border-color:var(--gb-acc);color:#fff}' +
'.gwbm-paste{width:100%;min-height:160px;border:1px solid var(--gb-bd);background:#fff;color:#000;padding:8px;overflow:auto;border-radius:4px}' +
'.gwbm-note{font-size:12px;opacity:.8;flex:1 1 100%}.gwbm-prevframe{width:100%;height:68vh;border:1px solid var(--gb-bd);background:#fff}';

var FRAME_CSS =
'html{cursor:text}body{margin:0;padding:12px 14px;min-height:calc(100vh - 24px);font:15px/1.55 Arial,Helvetica,sans-serif;color:#222;background:#fff;word-wrap:break-word;overflow-wrap:anywhere;outline:0}' +
'body.gwbm-empty::before{content:attr(data-placeholder);color:#999;pointer-events:none;position:absolute}' +
'img,video,canvas,svg{max-width:100%}table{border-collapse:collapse}td,th{padding:3px 5px}blockquote{margin:1em 0;padding:.2em 1em;border-left:4px solid #ccd;color:#444;background:#f7f8fa}' +
'pre{background:#f4f4f6;padding:10px;border-radius:4px;overflow:auto}code,kbd,samp{font-family:Consolas,"Courier New",monospace}kbd{border:1px solid #bbb;border-bottom-width:2px;border-radius:3px;padding:0 4px;background:#f6f6f6}mark{background:#fff176}' +
'body.gwbm-guides table td,body.gwbm-guides table th{outline:1px dotted #b5b5b5;outline-offset:-1px}' +
'.gwbm-protected{display:inline-block;background:#fff6d1;border:1px dashed #d19a00;color:#6b4e00;font:12px/1.4 Consolas,monospace;padding:1px 6px;border-radius:3px;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;vertical-align:middle;cursor:default;user-select:all}' +
'.gwbm-protected[data-gwbm-tag=iframe],.gwbm-protected[data-gwbm-tag=object],.gwbm-protected[data-gwbm-tag=embed]{display:inline-flex;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,#f4f6fa,#f4f6fa 8px,#eaeef5 8px,#eaeef5 16px);border:1px solid #9aa7bd;color:#44546f;white-space:normal;text-align:center}' +
'a[id]:empty::before,a[name]:empty::before{content:"\\2693";color:#2563eb;font-size:14px;padding:0 2px}' +
'div[style*="page-break-after"]{border-top:2px dashed #888;margin:14px 0;min-height:18px;text-align:center;color:#777;font:11px Arial}div[style*="page-break-after"]::after{content:"- - - page break - - -"}' +
'ul.gwbm-todo{list-style:none;padding-left:6px}details>summary{cursor:pointer}' +
'body.gwbm-blocks :is(p,div,h1,h2,h3,h4,h5,h6,section,article,aside,header,footer,nav,main,blockquote,pre,ul,ol,li,table,form,fieldset,figure,details,address){outline:1px dashed #7a9;outline-offset:1px}';

/* ===================================================================== proteção / codificação do conteúdo */
var BLOCK_TAGS = 'address,article,aside,blockquote,details,dialog,div,dl,dd,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,header,hgroup,hr,li,main,nav,ol,p,pre,section,table,thead,tbody,tfoot,tr,td,th,caption,colgroup,col,summary,legend,ul,menu,search'.split(',');
var BLOCK = {}; BLOCK_TAGS.forEach(function (t) { BLOCK[t] = 1; });
var BLOCK_SEL = BLOCK_TAGS.join(',');
var LEAF_BLOCK_SEL = 'p,h1,h2,h3,h4,h5,h6,div,li,pre,blockquote,td,th,dd,dt,address,figcaption,caption,summary,legend';
var RAWT = { pre: 1, textarea: 1, script: 1, style: 1 };
var PROTECT = 'script,style,link,meta,noscript,iframe,object,embed,base,title,template';
var VOIDS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr'.split(',');

function dim(v) { return /^\d+$/.test(String(v)) ? v + 'px' : v; }
function decoPh(p, n) {
  var tag = n.localName, lbl, src = n.getAttribute('src') || n.getAttribute('href') || n.getAttribute('data') || '';
  if (tag === 'script') lbl = '⟨script⟩ ' + (src ? src + ' ' : '') + (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70);
  else if (tag === 'style') lbl = '⟨style⟩ ' + (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70);
  else if (tag === 'iframe' || tag === 'object' || tag === 'embed') {
    lbl = '⧉ ' + tag + (src ? ': ' + src : '');
    p.style.width = dim(n.getAttribute('width') || '300'); p.style.height = dim(n.getAttribute('height') || '150');
  } else lbl = '⟨' + tag + '⟩ ' + (src || n.getAttribute('name') || n.getAttribute('http-equiv') || n.getAttribute('rel') || (n.textContent || '').trim().slice(0, 40));
  p.textContent = lbl;
  p.title = n.outerHTML.slice(0, 400);
}
function makePh(n) {
  var p = doc.createElement('span');
  p.className = 'gwbm-protected';
  p.setAttribute('contenteditable', 'false');
  p.setAttribute('data-gwbm-tag', n.localName);
  p.setAttribute('data-gwbm-raw', encodeURIComponent(n.outerHTML));
  decoPh(p, n);
  return p;
}
function protectTree(root) {
  arr(root.querySelectorAll(PROTECT)).forEach(function (n) {
    if (!root.contains(n) || !n.parentNode) return;
    n.parentNode.replaceChild(makePh(n), n);
  });
  arr(root.querySelectorAll('*')).forEach(function (n) {
    if (n.classList && n.classList.contains('gwbm-protected')) return;
    arr(n.attributes).forEach(function (a) {
      if (/^on/i.test(a.name)) { n.setAttribute('data-gwbm-' + a.name.toLowerCase(), a.value); n.removeAttribute(a.name); }
    });
  });
}
function encodeHtml(html) {
  var t = doc.createElement('template');
  t.innerHTML = html;
  protectTree(t.content);
  var d = doc.createElement('div'); d.appendChild(t.content);
  return d.innerHTML;
}
function encodeFrag(html) {
  var t = doc.createElement('template');
  t.innerHTML = html;
  protectTree(t.content);
  return t.content;
}
function decodeTree(root) {
  arr(root.querySelectorAll('*')).forEach(function (n) {
    arr(n.attributes).forEach(function (a) {
      if (a.name.indexOf('data-gwbm-on') === 0) { n.setAttribute(a.name.slice(10), a.value); n.removeAttribute(a.name); }
    });
  });
  arr(root.querySelectorAll('[data-gwbm-raw]')).forEach(function (p) {
    var t = doc.createElement('template');
    try { t.innerHTML = decodeURIComponent(p.getAttribute('data-gwbm-raw')); } catch (e) { t.innerHTML = ''; }
    if (p.parentNode) p.parentNode.replaceChild(t.content, p);
  });
}
function serialize(node, outer) {
  var c;
  if (outer) { c = doc.createElement('div'); c.appendChild(node.cloneNode(true)); } else c = node.cloneNode(true);
  decodeTree(c);
  return c.innerHTML.replace(/​/g, '');
}
function pretty(html) {
  var t = doc.createElement('template'); t.innerHTML = html;
  var lines = [];
  function ser(n) {
    if (n.nodeType === 3) return n.nodeValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
    if (n.nodeType === 8) return '<!--' + n.nodeValue + '-->';
    return n.outerHTML || '';
  }
  function walk(parent, d) {
    var run = '', pad = rep('  ', d);
    function flush() { if (run.trim()) lines.push(pad + run.trim()); run = ''; }
    arr(parent.childNodes).forEach(function (c) {
      if (c.nodeType === 1 && BLOCK[c.localName]) {
        flush();
        if (RAWT[c.localName] || !c.querySelector(BLOCK_SEL)) lines.push(pad + c.outerHTML);
        else {
          var o = c.cloneNode(false).outerHTML, ci = o.lastIndexOf('</');
          lines.push(pad + o.slice(0, ci)); walk(c, d + 1); lines.push(pad + o.slice(ci));
        }
      } else if (c.nodeType === 1 && (RAWT[c.localName])) { flush(); lines.push(pad + c.outerHTML); }
      else run += ser(c);
    });
    flush();
  }
  walk(t.content, 0);
  return lines.join('\n');
}

/* ===================================================================== dados estáticos */
var SPECIAL = Array.from('©®™€£¥¢§¶†‡•…‰′″‹›«»‘’“”‚„¡¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿŒœŠšŸžƒˆ˜ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω←↑→↓↔⇐⇒⇔∀∂∃∅∇∈∉∋∏∑−√∞∠∧∨∩∪∫∴∼≅≈≠≡≤≥⊂⊃⊆⊇⊕⊗⊥★☆☎☑☒♠♣♥♦♪°±²³¼½¾×÷µ·¹ºª¬¦¨¯´¸');
var EMOJI = Array.from('😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗🙂🤗🤔😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤕🤢🤮🤧😇🥳🥺🤠🤡🤥🤫🤭🧐🤓😈👿💀☠👻👽🤖💩👍👎👌✌🤞🤟🤘👈👉👆👇✋🖐👋🤝🙏💪👏🙌❤🧡💛💚💙💜🖤💔💕💖🔥⭐🌟✨⚡☀🌈☁❄💧🌹🌻🍎🍌🍇🍕🍔🍟🍺☕🎂🎉🎁🏆⚽🎵📞💻📷🔒🔑📌📎✅❌⚠❓❗');
var COLORS = ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'];
var FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Comic Sans MS', 'Impact', 'Lucida Console', 'Palatino Linotype', 'Garamond', 'Segoe UI', 'Calibri', 'Cambria', 'monospace', 'sans-serif', 'serif'];
var FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 60, 72];
var LINE_HEIGHTS = ['1', '1.15', '1.3', '1.5', '1.75', '2', '2.5', '3'];
var TAG_GROUPS = [
  ['Estrutura / Sections', 'address,article,aside,footer,header,hgroup,main,nav,search,section'],
  ['Texto em bloco / Block text', 'blockquote,dd,div,dl,dt,figcaption,figure,hr,li,menu,ol,p,pre,ul,h1,h2,h3,h4,h5,h6'],
  ['Texto em linha / Inline', 'a,abbr,b,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr'],
  ['Mídia / Media', 'area,audio,canvas,img,map,picture,source,track,video,svg,math'],
  ['Incorporação / Embedded', 'embed,iframe,object,param'],
  ['Script / Scripting', 'noscript,script,template,slot'],
  ['Edição / Edits', 'del,ins'],
  ['Tabela / Table', 'caption,col,colgroup,table,tbody,td,tfoot,th,thead,tr'],
  ['Formulário / Forms', 'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea'],
  ['Interativo / Interactive', 'details,dialog,summary'],
  ['Metadados / Metadata', 'base,link,meta,style,title']
];
var FORM_SNIPPETS = [
  ['form', '<form action="" method="post"><p><label>Nome: <input type="text" name="nome"></label></p><p><button type="submit">Enviar</button></p></form>'],
  ['input text', '<input type="text" name="texto" placeholder="Texto">'], ['input password', '<input type="password" name="senha">'],
  ['input email', '<input type="email" name="email" placeholder="email@exemplo.com">'], ['input number', '<input type="number" name="numero" value="0">'],
  ['input tel', '<input type="tel" name="telefone">'], ['input url', '<input type="url" name="site">'], ['input search', '<input type="search" name="busca">'],
  ['input date', '<input type="date" name="data">'], ['input time', '<input type="time" name="hora">'], ['input datetime-local', '<input type="datetime-local" name="datahora">'],
  ['input month / week', '<input type="month" name="mes"> <input type="week" name="semana">'], ['input color', '<input type="color" name="cor" value="#2563eb">'],
  ['input range', '<input type="range" name="faixa" min="0" max="100">'], ['input file', '<input type="file" name="arquivo">'], ['input hidden', '<input type="hidden" name="oculto" value="">'],
  ['checkbox', '<label><input type="checkbox" name="opcao" value="1"> Opção</label>'], ['radio', '<label><input type="radio" name="grupo" value="1"> Opção 1</label> <label><input type="radio" name="grupo" value="2"> Opção 2</label>'],
  ['textarea', '<textarea name="mensagem" rows="4" cols="40"></textarea>'], ['select', '<select name="lista"><option value="1">Opção 1</option><option value="2">Opção 2</option></select>'],
  ['datalist', '<input list="gwbm-lista" name="sugestao"><datalist id="gwbm-lista"><option value="Um"><option value="Dois"></datalist>'],
  ['button', '<button type="button">Botão</button>'], ['button submit', '<button type="submit">Enviar</button>'], ['button reset', '<button type="reset">Limpar</button>'],
  ['input submit / reset / button', '<input type="submit" value="Enviar"> <input type="reset" value="Limpar"> <input type="button" value="Botão">'],
  ['input image', '<input type="image" src="" alt="Enviar">'], ['fieldset + legend', '<fieldset><legend>Grupo</legend><p><br></p></fieldset>'],
  ['label', '<label for="">Rótulo</label>'], ['output', '<output name="resultado">0</output>'], ['progress', '<progress value="50" max="100"></progress>'], ['meter', '<meter value="6" min="0" max="10"></meter>']
];

/* ===================================================================== classe Editor */
function Editor(ta, opts) {
  var self = this;
  this.ta = ta; this.opts = opts; this.id = ++idCounter;
  this.li = langIdx(opts.language);
  this.listeners = {}; this.buttons = {}; this.mode = 'wysiwyg'; this.ready = false; this._q = []; this.range = null;
  this.selEl = null; this.hist = []; this.hi = -1; this.readOnly = !!opts.readOnly; this.isFs = false; this.docInfo = null;
  this._initial = ta.value;
  injectCss();
  if (opts.on) for (var ev in opts.on) this.on(ev, opts.on[ev]);

  var dark = opts.theme === 'dark' || (opts.theme === 'auto' && global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
  this.dark = dark;
  var c = this.container = el('div', { 'class': 'gwbm-editor' + (dark ? ' gwbm-dark' : ''), id: 'gwbm_' + this.id });
  c.style.width = px(opts.width || '100%');
  this.tb = el('div', { 'class': 'gwbm-toolbar', role: 'toolbar' }, '', c);
  this.bodyEl = el('div', { 'class': 'gwbm-body' }, '', c);
  this.bodyEl.style.height = px(opts.height);
  if (opts.minHeight) this.bodyEl.style.minHeight = px(opts.minHeight);
  this.frame = el('iframe', { 'class': 'gwbm-frame', title: 'GWBMEditor', frameborder: '0' });
  this.src = el('textarea', { 'class': 'gwbm-source', spellcheck: 'false', wrap: 'off' });
  this.selbox = el('div', { 'class': 'gwbm-selbox' }, '', this.bodyEl);
  this.handle = el('div', { 'class': 'gwbm-handle' }, '', this.bodyEl);
  this.tmenu = el('div', { 'class': 'gwbm-tmenu' }, '', this.bodyEl);
  this.buildTableMenu();
  this.bodyEl.insertBefore(this.src, this.selbox);
  this.bodyEl.insertBefore(this.frame, this.src);
  if (opts.statusbar) {
    this.status = el('div', { 'class': 'gwbm-status' }, '', c);
    this.pathEl = el('div', { 'class': 'gwbm-path' }, '', this.status);
    this.countEl = el('div', { 'class': 'gwbm-count' }, '', this.status);
    if (opts.resizable) { this.grip = el('div', { 'class': 'gwbm-grip' }, '', this.status); this.bindGrip(); }
  }
  ta.style.display = 'none';
  ta.parentNode.insertBefore(c, ta.nextSibling);
  ta._gwbm = this;

  this.buildToolbar();
  this.bindHost();

  var css = [].concat(opts.contentCss || []).map(function (h) { return '<link rel="stylesheet" href="' + esc(h) + '">'; }).join('');
  var skeleton = '<!DOCTYPE html><html><head><meta charset="utf-8">' + css + '<style>' + FRAME_CSS + (opts.contentStyle || '') + '</style></head><body class="gwbm-content' + (opts.showGuides ? ' gwbm-guides' : '') + '"></body></html>';
  this.frame.addEventListener('load', function () { if (self._inited) return; self._inited = true; self.initFrame(); });
  this.frame.srcdoc = skeleton;
}
var P = Editor.prototype;

function injectCss() {
  if (injectCss.done) return; injectCss.done = true;
  var s = doc.createElement('style'); s.setAttribute('data-gwbm', ''); s.textContent = HOST_CSS;
  (doc.head || doc.documentElement).appendChild(s);
}

/* ---------- textos / eventos ---------- */
P.t = function (k) {
  var o = this.opts.strings; if (o && o[k]) return o[k];
  var a = STR[k]; return a ? a[this.li] : k;
};
P.on = function (n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); return this; };
P.off = function (n, f) { var l = this.listeners[n]; if (!l) return this; if (!f) delete this.listeners[n]; else this.listeners[n] = l.filter(function (x) { return x !== f; }); return this; };
P.emit = function (n, d) { var self = this; (this.listeners[n] || []).slice().forEach(function (f) { try { f.call(self, d, self); } catch (e) { warn(e); } }); };
P.whenReady = function (f) { if (this.ready) f.call(this); else this._q.push(f); };

/* ---------- inicialização do iframe ---------- */
P.initFrame = function () {
  var self = this, d;
  this.win = this.frame.contentWindow; d = this.idoc = this.frame.contentDocument; this.area = d.body;
  this.area.setAttribute('contenteditable', 'true');
  if (this.opts.placeholder) this.area.setAttribute('data-placeholder', this.opts.placeholder);
  try { d.execCommand('styleWithCSS', false, true); d.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
  this.bindFrame();
  this.ready = true;
  if (this.opts.fullPage || this.opts.startupMode === 'source') {}
  this.loadData(this._initial);
  if (this.readOnly) this.setReadOnly(true);
  this.refresh();
  var q = this._q; this._q = []; q.forEach(function (f) { f.call(self); });
  if (this.opts.startupMode === 'source') this.setMode('source');
  this.emit('ready');
  if (this.opts.autofocus) this.focus();
};

P.bindFrame = function () {
  var self = this, d = this.idoc, a = this.area;
  var onInput = function () { self.scheduleRecord(); self.changed(); };
  a.addEventListener('input', onInput);
  a.addEventListener('keydown', function (e) { self.onKeydown(e); });
  a.addEventListener('keyup', function () { self.saveSel(); self.refreshSoon(); });
  a.addEventListener('mouseup', function () { self.saveSel(); self.refreshSoon(); });
  a.addEventListener('click', function (e) { self.onClick(e); });
  a.addEventListener('dblclick', function (e) { self.onDbl(e); });
  a.addEventListener('paste', function (e) { self.onPaste(e); });
  a.addEventListener('drop', function (e) { self.onDrop(e); });
  a.addEventListener('beforeinput', function (e) {
    if (e.inputType === 'historyUndo') { e.preventDefault(); self.undo(); } else if (e.inputType === 'historyRedo') { e.preventDefault(); self.redo(); }
  });
  a.addEventListener('focus', function () { self.emit('focus'); });
  a.addEventListener('blur', function () { self.saveSel(); self.sync(); self.emit('blur'); });
  d.addEventListener('submit', function (e) { e.preventDefault(); }, true);
  d.addEventListener('selectionchange', function () { self.refreshSoon(); });
  d.documentElement.addEventListener('mousedown', function (e) {
    if (e.target === d.documentElement) { e.preventDefault(); self.area.focus(); var r = d.createRange(); r.selectNodeContents(self.area); r.collapse(false); self.setRange(r); }
  });
  this.win.addEventListener('scroll', function () { self.positionHandle(); });
  this.win.addEventListener('resize', function () { self.positionHandle(); });
  this.handle.addEventListener('mousedown', function (e) { self.startResize(e); });
};

P.bindHost = function () {
  var self = this;
  this.src.addEventListener('input', function () { self.sync(); self.emit('change'); self.updateStatus(); });
  this.src.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
      e.preventDefault(); var s = self.src, a = s.selectionStart, b = s.selectionEnd;
      s.value = s.value.slice(0, a) + '  ' + s.value.slice(b); s.selectionStart = s.selectionEnd = a + 2; self.sync();
    }
  });
  this.src.addEventListener('blur', function () { self.sync(); });
  var form = this.ta.form;
  if (form) {
    this._onSubmit = function () { self.updateElement(); };
    this._onReset = function () { setTimeout(function () { self.setData(self.ta.defaultValue); self.resetDirty(); }, 0); };
    form.addEventListener('submit', this._onSubmit, true);
    form.addEventListener('reset', this._onReset);
  }
  this._onEsc = function (e) { if (e.key === 'Escape') { if (self.pop) self.closePanel(); else if (self.isFs && !doc.querySelector('.gwbm-overlay')) self.fullscreen(false); } };
  doc.addEventListener('keydown', this._onEsc);
  this._winResize = function () { self.positionHandle(); };
  global.addEventListener('resize', this._winResize);
};

P.bindGrip = function () {
  var self = this;
  this.grip.addEventListener('mousedown', function (e) {
    e.preventDefault(); var y0 = e.clientY, h0 = self.bodyEl.offsetHeight;
    var shield = el('div', { 'class': 'gwbm-shield', style: 'cursor:ns-resize' }, '', self.bodyEl);
    var mm = function (m) { self.bodyEl.style.height = Math.max(100, h0 + m.clientY - y0) + 'px'; self.positionHandle(); };
    var mu = function () { doc.removeEventListener('mousemove', mm); doc.removeEventListener('mouseup', mu); shield.parentNode && shield.parentNode.removeChild(shield); };
    doc.addEventListener('mousemove', mm); doc.addEventListener('mouseup', mu);
  });
};

/* ---------- seleção ---------- */
P.inArea = function () {
  var s = this.win.getSelection(); return !!(s && s.rangeCount && s.anchorNode && this.area.contains(s.anchorNode));
};
P.saveSel = function () {
  if (this.mode !== 'wysiwyg' || !this.ready) return;
  var s = this.win.getSelection();
  if (this.inArea()) this.range = s.getRangeAt(0).cloneRange();
};
P.selRange = function () {
  if (!this.ready) return null;
  var s = this.win.getSelection();
  if (s && s.rangeCount && this.inArea()) return s.getRangeAt(0);
  if (this.range && this.area.contains(this.range.commonAncestorContainer)) return this.range;
  return null;
};
P.setRange = function (r) {
  var s = this.win.getSelection(); s.removeAllRanges(); s.addRange(r); this.range = r.cloneRange();
};
P.focus = function () {
  if (this.mode === 'source') { this.src.focus(); return; }
  if (!this.ready) return;
  var had = this.inArea();
  this.area.focus();
  if (!had) {
    var r;
    if (this.range && this.area.contains(this.range.commonAncestorContainer)) r = this.range;
    else { r = this.idoc.createRange(); r.selectNodeContents(this.area); r.collapse(false); }
    try { this.setRange(r); } catch (e) {}
  }
};
P.blur = function () { if (this.ready) this.area.blur(); };
P.startNode = function () { var r = this.selRange(); return r ? r.startContainer : null; };
P.ancestor = function (sel) { var n = this.startNode(); return n ? closest(n, sel, this.area) : null; };
P.qs = function (c) { try { return this.idoc.queryCommandState(c); } catch (e) { return false; } };
P.selectedHtml = function () {
  var r = this.selRange(); if (!r || r.collapsed) return '';
  var d = doc.createElement('div'); d.appendChild(r.cloneContents()); return serialize(d, false);
};
P.selectedText = function () { var r = this.selRange(); return r ? r.toString() : ''; };
P.selectedBlocks = function () {
  var r = this.selRange(); if (!r) return [];
  var root = r.commonAncestorContainer; if (root.nodeType === 3) root = root.parentNode;
  var list = arr(root.querySelectorAll(LEAF_BLOCK_SEL)).filter(function (n) { return r.intersectsNode(n) && !n.querySelector(LEAF_BLOCK_SEL); });
  if (!list.length) { var b = closest(root, LEAF_BLOCK_SEL, this.area); if (b) list = [b]; }
  return list;
};

/* ---------- histórico ---------- */
P.pathOf = function (n) {
  var p = [];
  while (n && n !== this.area) { var par = n.parentNode; if (!par) return null; p.unshift(Array.prototype.indexOf.call(par.childNodes, n)); n = par; }
  return n === this.area ? p : null;
};
P.nodeAt = function (p) { var n = this.area; for (var i = 0; i < p.length; i++) { n = n.childNodes[p[i]]; if (!n) return null; } return n; };
P.snapSel = function () {
  var r = this.selRange(); if (!r) return null;
  var a = this.pathOf(r.startContainer), b = this.pathOf(r.endContainer);
  return a && b ? { a: a, ao: r.startOffset, b: b, bo: r.endOffset } : null;
};
P.restoreSnapSel = function (s) {
  if (!s) return;
  var a = this.nodeAt(s.a), b = this.nodeAt(s.b); if (!a || !b) return;
  var len = function (n) { return n.nodeType === 3 ? n.length : n.childNodes.length; };
  try { var r = this.idoc.createRange(); r.setStart(a, Math.min(s.ao, len(a))); r.setEnd(b, Math.min(s.bo, len(b))); this.setRange(r); } catch (e) {}
};
P.record = function () {
  if (!this.ready || this.mode !== 'wysiwyg') return;
  if (this._rt) { clearTimeout(this._rt); this._rt = null; }
  var h = this.area.innerHTML, cur = this.hist[this.hi];
  if (cur && cur.h === h) { cur.s = this.snapSel() || cur.s; return; }
  this.hist.splice(this.hi + 1); this.hist.push({ h: h, s: this.snapSel() });
  if (this.hist.length > this.opts.undoLevels) this.hist.shift();
  this.hi = this.hist.length - 1;
};
P.scheduleRecord = function () { var self = this; clearTimeout(this._rt); this._rt = setTimeout(function () { self._rt = null; self.record(); }, 350); };
P.applySnap = function (s) {
  this.area.innerHTML = s.h; this.selEl = null; this.restoreSnapSel(s.s); this.syncStyles(); this.sync(); this.updateStatus(); this.positionHandle(); this.emit('change'); this.refresh();
};
P.undo = function () { if (this.mode !== 'wysiwyg') return; this.record(); if (this.hi > 0) { this.hi--; this.applySnap(this.hist[this.hi]); } this.area.focus(); };
P.redo = function () { if (this.mode !== 'wysiwyg') return; this.record(); if (this.hi < this.hist.length - 1) { this.hi++; this.applySnap(this.hist[this.hi]); } this.area.focus(); };

P.changed = function (immediate) {
  if (!this.ready) return;
  if (immediate) this.record();
  this.dirty = true;
  this.syncSoon(); this.updateStatus(); this.positionHandle();
  if (this.opts.autoGrow) this.autoGrow();
  this.emit('change');
};
P.syncSoon = function () { var self = this; clearTimeout(this._st); this._st = setTimeout(function () { self.syncStyles(); self.sync(); }, 250); };
P.sync = function () { if (!this.ready) return; this.ta.value = this.getData(); };
P.updateElement = function () { this.sync(); };
P.isDirty = function () { return !!this.dirty; };
P.resetDirty = function () { this.dirty = false; };
P.autoGrow = function () {
  var h = Math.max(this.opts.minHeight || 160, this.idoc.documentElement.scrollHeight + 4);
  if (this.opts.maxHeight) h = Math.min(h, this.opts.maxHeight);
  this.bodyEl.style.height = h + 'px';
};

/* ---------- dados ---------- */
P.encode = encodeHtml;
P.loadData = function (html) {
  html = html == null ? '' : String(html);
  var body = html;
  if (this.opts.fullPage) {
    var m = /^\s*(<!doctype[^>]*>)/i.exec(html);
    var p = new DOMParser().parseFromString(html || '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>', 'text/html');
    var at = function (e) { return arr(e.attributes).map(function (a) { return ' ' + a.name + '="' + esc(a.value) + '"'; }).join(''); };
    this.docInfo = { dt: m ? m[1] : '<!DOCTYPE html>', ha: at(p.documentElement), hh: p.head.innerHTML, ba: at(p.body) };
    body = p.body.innerHTML.trim();
  }
  this.area.innerHTML = encodeHtml(body) || '<p><br></p>';
  this.selEl = null; this.range = null;
  this.syncStyles();
  this.hist = []; this.hi = -1; this.record();
  this.updateStatus(); this.positionHandle();
};
P.setData = function (html) {
  if (!this.ready) { this._initial = html; this.ta.value = html; this.whenReady(function () { this.loadData(html); }); return; }
  if (this.mode === 'source') { this.src.value = html; this.sync(); this.emit('change'); return; }
  this.loadData(html); this.sync(); this.dirty = true; this.emit('change');
};
P.getData = function () {
  if (!this.ready) return this.ta.value;
  var h;
  if (this.mode === 'source') h = this.src.value;
  else {
    var c = this.area.cloneNode(true);
    decodeTree(c);
    h = c.innerHTML.replace(/​/g, '');
    var tmp = doc.createElement('div'); tmp.innerHTML = h;
    if (!tmp.textContent.replace(/\s/g, '') && !tmp.querySelector('*:not(p):not(br):not(div):not(span)')) h = '';
    if (this.opts.formatOutput && h) h = pretty(h);
  }
  if (this.opts.fullPage && this.docInfo) {
    var i = this.docInfo;
    h = i.dt + '\n<html' + i.ha + '>\n<head>' + i.hh + '</head>\n<body' + i.ba + '>\n' + h + '\n</body>\n</html>';
  }
  return h;
};
P.getText = function () { return this.ready ? (this.mode === 'source' ? this.src.value.replace(/<[^>]*>/g, '') : this.area.textContent.replace(/​/g, '')) : ''; };
P.getBody = function () { return this.area; };
P.getDocument = function () { return this.idoc; };
P.getContainer = function () { return this.container; };
P.getMode = function () { return this.mode; };
P.syncStyles = function () {
  if (!this.ready) return;
  var out = '', head = this.idoc.head;
  var collect = function (root) {
    arr(root.querySelectorAll('style,link')).forEach(function (n) { if (n.localName === 'style' || /stylesheet/i.test(n.getAttribute('rel') || '')) out += n.outerHTML; });
  };
  arr(this.area.querySelectorAll('.gwbm-protected[data-gwbm-tag="style"],.gwbm-protected[data-gwbm-tag="link"]')).forEach(function (p) {
    var t = doc.createElement('template'); try { t.innerHTML = decodeURIComponent(p.getAttribute('data-gwbm-raw')); } catch (e) {} collect(t.content);
  });
  if (this.docInfo) { var t2 = doc.createElement('template'); t2.innerHTML = this.docInfo.hh; collect(t2.content); }
  if (out === this._lastCss) return;
  this._lastCss = out;
  arr(head.querySelectorAll('.gwbm-us')).forEach(function (n) { n.parentNode.removeChild(n); });
  var t3 = doc.createElement('template'); t3.innerHTML = out;
  var idoc = this.idoc;
  arr(t3.content.children).forEach(function (n) { var c = idoc.importNode(n, true); c.classList.add('gwbm-us'); head.appendChild(c); });
};

/* ---------- inserção ---------- */
P.isEmptyBlock = function (b) { return !b.textContent.replace(/[\s​]/g, '') && !b.querySelector('*:not(br)'); };
P.insertFragment = function (frag) {
  if (this.mode !== 'wysiwyg') return;
  this.focus(); this.record();
  var d = this.idoc, r = this.selRange(); if (!r) return;
  r.deleteContents();
  frag = d.importNode(frag, true);
  var last = frag.lastChild; if (!last) return;
  var hasBlock = arr(frag.childNodes).some(function (n) { return n.nodeType === 1 && (BLOCK[n.localName] || n.localName === 'table'); });
  var blk = hasBlock ? closest(r.startContainer, 'p,h1,h2,h3,h4,h5,h6,pre,address', this.area) : null;
  if (blk) {
    var tail = d.createRange(); tail.setStart(r.startContainer, r.startOffset); tail.setEnd(blk, blk.childNodes.length);
    var rest = tail.extractContents(), after = blk.cloneNode(false); after.appendChild(rest);
    blk.parentNode.insertBefore(after, blk.nextSibling);
    blk.parentNode.insertBefore(frag, after);
    var nx = after;
    if (this.isEmptyBlock(blk)) blk.parentNode.removeChild(blk);
    if (this.isEmptyBlock(after)) { after.innerHTML = '<br>'; }
    var rr = d.createRange(); rr.selectNodeContents(nx); rr.collapse(true); this.setRange(rr);
  } else {
    r.insertNode(frag);
    var r2 = d.createRange(); r2.setStartAfter(last); r2.collapse(true);
    if (hasBlock && !last.nextSibling && last.parentNode) { var np = d.createElement('p'); np.innerHTML = '<br>'; last.parentNode.insertBefore(np, last.nextSibling); r2.selectNodeContents(np); r2.collapse(true); }
    this.setRange(r2);
  }
  this.changed(true);
};
P.insertHtml = function (html) {
  if (this.mode !== 'wysiwyg') {
    var s = this.src, a = s.selectionStart, b = s.selectionEnd;
    s.value = s.value.slice(0, a) + html + s.value.slice(b); s.selectionStart = s.selectionEnd = a + html.length; this.sync(); this.emit('change'); return;
  }
  this.insertFragment(encodeFrag(html));
};
P.insertNodeAtCaret = function (node) { var f = doc.createDocumentFragment(); f.appendChild(node); this.insertFragment(f); };
P.insertText = function (txt) {
  if (this.mode !== 'wysiwyg') { this.insertHtml(txt); return; }
  this.focus(); this.record();
  var ok = false; try { ok = this.idoc.execCommand('insertText', false, txt); } catch (e) {}
  if (!ok) this.insertHtml(esc(txt).replace(/\n/g, '<br>'));
  this.changed(true);
};
P.exec = function (cmd, val) {
  if (this.mode !== 'wysiwyg') return false;
  this.focus(); this.record();
  var r = false; try { r = this.idoc.execCommand(cmd, false, val); } catch (e) {}
  this.changed(true); this.refreshSoon();
  return r;
};
P.execCommand = P.exec;

/* marcação por <font size=7> para estilos de seleção */
P.markSelection = function () {
  var d = this.idoc;
  d.execCommand('styleWithCSS', false, false); d.execCommand('fontSize', false, '7'); d.execCommand('styleWithCSS', false, true);
  return arr(this.area.querySelectorAll('font[size="7"]'));
};
P.markWrap = function (make) {
  var d = this.idoc, fonts = this.markSelection(); if (!fonts.length) return [];
  var first = fonts[0].firstChild, last = fonts[fonts.length - 1].lastChild, made = [];
  fonts.forEach(function (f) { var n = make(f); while (f.firstChild) n.appendChild(f.firstChild); f.parentNode.replaceChild(n, f); made.push(n); });
  try { if (first && last) { var r = d.createRange(); r.setStartBefore(first); r.setEndAfter(last); this.setRange(r); } } catch (e) {}
  return made;
};
P.cleanSpans = function () {
  arr(this.area.querySelectorAll('span')).forEach(function (s) {
    if (s.hasAttribute('style') && !s.getAttribute('style').trim()) s.removeAttribute('style');
    if (!s.attributes.length) unwrap(s);
  });
};
P.inlineStyle = function (prop, val) {
  if (this.mode !== 'wysiwyg') return;
  this.focus(); this.record();
  var d = this.idoc, r = this.selRange(); if (!r) return;
  if (r.collapsed) {
    if (!val) return;
    var sp = d.createElement('span'); sp.style.setProperty(prop, val); sp.appendChild(d.createTextNode('​'));
    r.insertNode(sp); var rr = d.createRange(); rr.setStart(sp.firstChild, 1); rr.collapse(true); this.setRange(rr);
  } else {
    var made = this.markWrap(function () { var s = d.createElement('span'); if (val) s.style.setProperty(prop, val); return s; });
    made.forEach(function (s) {
      arr(s.querySelectorAll('*')).forEach(function (x) {
        if (x.style && x.style.getPropertyValue(prop)) { x.style.removeProperty(prop); if (!x.getAttribute('style')) x.removeAttribute('style'); }
      });
    });
    this.cleanSpans();
  }
  this.changed(true); this.refreshSoon();
};
P.toggleTag = function (tag, attrs) {
  if (this.mode !== 'wysiwyg') return;
  this.focus(); this.record();
  var d = this.idoc, r = this.selRange(); if (!r) return;
  var anc = this.ancestor(tag);
  if (anc) {
    arr(this.area.querySelectorAll(tag)).filter(function (n) { return r.intersectsNode(n); }).forEach(unwrap);
  } else if (r.collapsed) {
    var w = d.createElement(tag); w.appendChild(d.createTextNode('​')); r.insertNode(w);
    var rr = d.createRange(); rr.setStart(w.firstChild, 1); rr.collapse(true); this.setRange(rr);
  } else {
    this.markWrap(function () { var n = d.createElement(tag); if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]); return n; });
  }
  this.changed(true); this.refreshSoon();
};
P.removeFormat = function () {
  if (this.mode !== 'wysiwyg') return;
  this.focus(); this.record();
  var r = this.selRange(); if (!r) return;
  try { this.idoc.execCommand('removeFormat'); } catch (e) {}
  if (!r.collapsed) {
    arr(this.area.querySelectorAll('span:not(.gwbm-protected),font,mark,kbd,samp,var,small,cite,q,del,ins,dfn,code,big,tt')).forEach(function (n) { if (r.intersectsNode(n)) unwrap(n); });
    arr(this.area.querySelectorAll('[style]')).forEach(function (n) { if (r.intersectsNode(n) && !n.classList.contains('gwbm-protected') && !BLOCK[n.localName]) n.removeAttribute('style'); });
  }
  this.changed(true); this.refreshSoon();
};
P.blockStyle = function (prop, val) {
  this.focus(); this.record();
  var bl = this.selectedBlocks();
  if (!bl.length) { this.idoc.execCommand('formatBlock', false, '<p>'); bl = this.selectedBlocks(); }
  bl.forEach(function (b) { if (val) b.style.setProperty(prop, val); else b.style.removeProperty(prop); if (!b.getAttribute('style')) b.removeAttribute('style'); });
  this.changed(true); this.refreshSoon();
};
P.blockAttr = function (name, val) {
  this.focus(); this.record();
  this.selectedBlocks().forEach(function (b) { if (b.getAttribute(name) === val) b.removeAttribute(name); else b.setAttribute(name, val); });
  this.changed(true); this.refreshSoon();
};

/* ---------- eventos do editor ---------- */
P.runCmd = function (name) { var d = this.cmd(name); if (d && d.exec) d.exec.call(d, this); };
P.cellOf = function () { return this.ancestor('td,th'); };
P.onKeydown = function (e) {
  var k = e.key, mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey) {
    var l = k.toLowerCase();
    if (l === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (l === 'y') { e.preventDefault(); this.redo(); return; }
    if (l === 'k') { e.preventDefault(); this.runCmd('link'); return; }
  }
  if (k === 'Tab' && !mod && !e.altKey) {
    var cell = this.cellOf();
    if (cell) { e.preventDefault(); this.tabCell(e.shiftKey); return; }
    if (this.ancestor('li')) { e.preventDefault(); this.exec(e.shiftKey ? 'outdent' : 'indent'); return; }
    if (this.opts.tabSpaces > 0) { e.preventDefault(); this.insertText(rep(' ', this.opts.tabSpaces)); return; }
  }
  if (k === 'Escape' && this.selEl) { this.selectElement(null); }
  this.emit('keydown', e);
};
P.onClick = function (e) {
  var t = e.target, a = closest(t, 'a', this.area);
  if (a) e.preventDefault();
  var sel = closest(t, 'img,video,audio,hr,canvas,svg,.gwbm-protected,input,select,textarea,button,progress,meter', this.area);
  this.selectElement(sel);
  if (sel && /^(img|video|audio|hr|canvas|svg)$/.test(sel.localName) || (sel && sel.classList.contains('gwbm-protected'))) {
    var r = this.idoc.createRange(); r.selectNode(sel); this.setRange(r);
  }
  this.refreshSoon();
};
P.onDbl = function (e) {
  var t = e.target, ph = closest(t, '.gwbm-protected', this.area);
  if (ph) { e.preventDefault(); this.editHtml(ph); return; }
  var x;
  if ((x = closest(t, 'img', this.area))) { this.selectElement(x); this.runCmd('image'); return; }
  if ((x = closest(t, 'a', this.area))) { this.runCmd('link'); return; }
  if ((x = closest(t, 'video,audio,canvas,svg,progress,meter', this.area))) { this.editHtml(x); return; }
  if ((x = closest(t, 'input,select,textarea,button,hr', this.area))) { this.selectElement(x); this.elementProps(x); return; }
};
P.cleanPaste = function (html) {
  var m = /<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i.exec(html); if (m) html = m[1];
  var t = doc.createElement('template'); t.innerHTML = html;
  var root = t.content, keep = this.opts.pasteKeepStyles;
  arr(root.querySelectorAll('script,style,meta,link,title,xml,head,object,embed,iframe,noscript')).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
  var walker = doc.createTreeWalker(root, 128), cm = [];
  while (walker.nextNode()) cm.push(walker.currentNode);
  cm.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
  arr(root.querySelectorAll('*')).forEach(function (n) {
    if (!n.parentNode) return;
    if (n.localName.indexOf(':') >= 0) { unwrap(n); return; }
    if (n.localName === 'font') { unwrap(n); return; }
    if (n.localName === 'b' && /font-weight:\s*(normal|400)/i.test(n.getAttribute('style') || '')) { unwrap(n); return; }
    arr(n.attributes).forEach(function (a) {
      var nm = a.name;
      if (nm === 'style') {
        var ok = a.value.split(';').filter(function (s) { return keep.test(s.split(':')[0].trim()); }).join(';');
        if (ok) n.setAttribute('style', ok); else n.removeAttribute('style');
      } else if (['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width', 'height', 'target', 'start', 'type', 'dir'].indexOf(nm) < 0) n.removeAttribute(nm);
    });
  });
  arr(root.querySelectorAll('span')).forEach(function (n) { if (!n.attributes.length) unwrap(n); });
  var d = doc.createElement('div'); d.appendChild(root); return d.innerHTML;
};
P.onPaste = function (e) {
  var cd = e.clipboardData; if (!cd) return;
  var self = this, files = arr(cd.files).filter(function (f) { return /^image\//.test(f.type); });
  var html = cd.getData('text/html'), text = cd.getData('text/plain');
  if (files.length && !html) {
    e.preventDefault();
    files.forEach(function (f) { self.uploadFile(f, function (u) { self.insertHtml('<img src="' + esc(u) + '" alt="">'); }); });
    return;
  }
  var mode = this.opts.pasteMode;
  if (mode === 'html' && html) return;
  e.preventDefault();
  if (mode === 'text' || !html) { if (text) this.insertText(text); }
  else this.insertHtml(this.cleanPaste(html));
};
P.onDrop = function (e) {
  var dt = e.dataTransfer; if (!dt || !dt.files || !dt.files.length) return;
  var files = arr(dt.files).filter(function (f) { return /^image\//.test(f.type); });
  if (!files.length) return;
  e.preventDefault();
  var self = this, d = this.idoc;
  try {
    var rg = d.caretRangeFromPoint ? d.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if (rg) this.setRange(rg);
  } catch (x) {}
  files.forEach(function (f) { self.uploadFile(f, function (u) { self.insertHtml('<img src="' + esc(u) + '" alt="">'); }); });
};
P.uploadFile = function (file, cb) {
  var o = this.opts, self = this;
  if (isFn(o.onUpload)) { var r = o.onUpload(file, cb); if (r && isFn(r.then)) r.then(cb, function () { self.alertMsg(self.t('uploadError')); }); return; }
  if (o.uploadUrl) {
    var x = new XMLHttpRequest(), fd = new FormData(); fd.append(o.uploadField || 'upload', file);
    x.open('POST', o.uploadUrl);
    if (o.uploadHeaders) for (var h in o.uploadHeaders) x.setRequestHeader(h, o.uploadHeaders[h]);
    x.onload = function () {
      try { var j = JSON.parse(x.responseText); var u = j.url || j.location || (j.data && j.data.url) || j.file; if (u) return cb(u); } catch (e) {}
      self.alertMsg(self.t('uploadError'));
    };
    x.onerror = function () { self.alertMsg(self.t('uploadError')); };
    x.send(fd); return;
  }
  var fr = new FileReader(); fr.onload = function () { cb(fr.result); }; fr.readAsDataURL(file);
};
P.alertMsg = function (m) { this.emit('error', m); global.alert(m); };

/* ---------- seleção de elemento / redimensionamento ---------- */
P.selectElement = function (e) {
  this.selEl = e || null; this.positionHandle();
};
P.positionHandle = function () {
  var e = this.selEl, b = this.selbox, h = this.handle;
  this.updateTableMenu();
  if (!this.ready || !e || !e.isConnected || this.mode !== 'wysiwyg') { b.style.display = 'none'; h.style.display = 'none'; return; }
  var r = e.getBoundingClientRect(), W = this.frame.clientWidth, H = this.frame.clientHeight;
  if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) { b.style.display = 'none'; h.style.display = 'none'; return; }
  b.style.display = 'block'; b.style.left = r.left + 'px'; b.style.top = r.top + 'px'; b.style.width = r.width + 'px'; b.style.height = r.height + 'px';
  var resizable = /^(img|video|canvas|svg)$/.test(e.localName) || (e.classList.contains('gwbm-protected') && /^(iframe|object|embed)$/.test(e.getAttribute('data-gwbm-tag')));
  if (resizable) { h.style.display = 'block'; h.style.left = (r.right - 6) + 'px'; h.style.top = (r.bottom - 6) + 'px'; } else h.style.display = 'none';
};
P.setSize = function (e, w, h) {
  if (e.classList.contains('gwbm-protected')) {
    var raw = this.phElement(e); if (!raw) return;
    raw.setAttribute('width', w); raw.setAttribute('height', h); this.phSet(e, raw);
  } else {
    e.setAttribute('width', w); e.setAttribute('height', h);
    e.style.removeProperty('width'); e.style.removeProperty('height'); if (!e.getAttribute('style')) e.removeAttribute('style');
  }
};
P.startResize = function (ev) {
  var self = this, e = this.selEl; if (!e) return;
  ev.preventDefault(); this.record();
  var x0 = ev.clientX, y0 = ev.clientY, r = e.getBoundingClientRect(), w0 = r.width, h0 = r.height;
  var shield = el('div', { 'class': 'gwbm-shield' }, '', this.bodyEl);
  var mm = function (m) {
    var w = Math.max(16, Math.round(w0 + m.clientX - x0));
    var hh = m.shiftKey ? Math.max(16, Math.round(h0 + m.clientY - y0)) : Math.round(w * h0 / w0);
    self.setSize(e, w, hh); self.positionHandle();
  };
  var mu = function () { doc.removeEventListener('mousemove', mm); doc.removeEventListener('mouseup', mu); if (shield.parentNode) shield.parentNode.removeChild(shield); self.changed(true); };
  doc.addEventListener('mousemove', mm); doc.addEventListener('mouseup', mu);
};
P.phElement = function (ph) {
  var t = doc.createElement('template');
  try { t.innerHTML = decodeURIComponent(ph.getAttribute('data-gwbm-raw')); } catch (e) { return null; }
  return t.content.firstElementChild;
};
P.phSet = function (ph, node) {
  ph.setAttribute('data-gwbm-raw', encodeURIComponent(node.outerHTML)); decoPh(ph, node);
};

/* ---------- barra de ferramentas ---------- */
P.cmd = function (name) { return (this.opts.buttons && this.opts.buttons[name]) || COMMANDS[name]; };
function normToolbar(t) {
  var groups = [], cur = [];
  function flush() { if (cur.length) groups.push(cur); cur = []; }
  t.forEach(function (g) {
    if (Array.isArray(g)) { flush(); groups.push(g.slice()); }
    else if (g === '/') { flush(); groups.push('/'); }
    else if (g === '|' || g === '-') flush();
    else cur.push(g);
  });
  flush(); return groups;
}
var ALIAS = { minimal: 'minimal', min: 'minimal', basic: 'minimal', basico: 'minimal', 'mínimo': 'minimal', minimo: 'minimal', small: 'minimal', simple: 'minimal',
  medium: 'medium', med: 'medium', standard: 'medium', normal: 'medium', medio: 'medium', 'médio': 'medium', middle: 'medium', default: 'medium',
  full: 'full', complete: 'full', completo: 'full', all: 'full', max: 'full' };
P.resolveToolbar = function () {
  var o = this.opts, t = o.toolbar;
  var TB = global.GWBMEditor.toolbars;
  if (isStr(t)) t = TB[ALIAS[t.toLowerCase()] || 'medium'] || TB.medium;
  else if (!Array.isArray(t)) t = TB.medium;
  var list = normToolbar(JSON.parse(JSON.stringify(t)));
  if (o.extraToolbar) list = list.concat(normToolbar(o.extraToolbar));
  var rm = isStr(o.removeButtons) ? o.removeButtons.split(/[,\s]+/) : (o.removeButtons || []);
  if (rm.length) list = list.map(function (g) { return Array.isArray(g) ? g.filter(function (n) { return rm.indexOf(n) < 0; }) : g; }).filter(function (g) { return !Array.isArray(g) || g.length; });
  return list;
};
P.setToolbar = function (spec) { this.opts.toolbar = spec; this.buildToolbar(); this.refresh(); };
P.buildToolbar = function () {
  var self = this; this.tb.innerHTML = ''; this.buttons = {};
  var group = null;
  this.resolveToolbar().forEach(function (g) {
    if (g === '/') { el('div', { 'class': 'gwbm-break' }, '', self.tb); return; }
    group = el('div', { 'class': 'gwbm-group', role: 'group' }, '', self.tb);
    g.forEach(function (n) { var b = self.mkBtn(n); if (b) group.appendChild(b); });
    if (!group.childNodes.length) group.parentNode.removeChild(group);
  });
};
P.mkBtn = function (name) {
  var d = this.cmd(name), self = this;
  if (!d) { warn('botão desconhecido:', name); return null; }
  var ttl = (d.title ? this.t(d.title) : this.t(name)) + (d.key ? ' (' + d.key + ')' : '');
  var b = el('button', { type: 'button', 'class': 'gwbm-btn gwbm-btn-' + name, title: ttl, 'aria-label': ttl });
  var icon = d.icon || (d.label ? '' : esc(this.t(name)));
  var rec = { el: b, def: d };
  if (d.menu) {
    rec.cap = el('span', { 'class': 'gwbm-cap' }, esc(d.label ? this.t(d.label) : this.t(name)));
    b.appendChild(rec.cap); el('span', { 'class': 'gwbm-arrow' }, '▾', b);
  } else {
    b.innerHTML = icon + (d.label && !d.icon ? esc(this.t(d.label)) : '');
    if (d.panel) el('span', { 'class': 'gwbm-arrow' }, '▾', b);
  }
  b.addEventListener('mousedown', function (e) { e.preventDefault(); });
  b.addEventListener('click', function (e) {
    e.preventDefault(); if (b.disabled || !self.ready) return;
    var same = self.pop && self.popAnchor === b; self.closePanel();
    if (same) return;
    self.saveSel();
    try {
      if (d.menu) self.openMenu(b, d);
      else if (d.panel) self.openPanel(b, function (pop, close) { d.panel.call(d, self, pop, close); });
      else if (d.exec) d.exec.call(d, self, b);
    } catch (err) { warn(err); }
  });
  this.buttons[name] = rec;
  return b;
};
P.refreshSoon = function () {
  var self = this; if (this._rf) return;
  this._rf = global.requestAnimationFrame ? global.requestAnimationFrame(function () { self._rf = 0; self.refresh(); }) : setTimeout(function () { self._rf = 0; self.refresh(); }, 30);
};
P.refresh = function () {
  if (!this.ready) return;
  var src = this.mode === 'source', n, rec, d, dis;
  for (n in this.buttons) {
    rec = this.buttons[n]; d = rec.def;
    dis = this.readOnly ? !d.always : (src && !d.always && !d.srcOk);
    rec.el.disabled = !!dis;
    var on = false;
    try { on = !dis && !!(d.state && d.state.call(d, this)); } catch (e) {}
    rec.el.classList.toggle('gwbm-on', on);
    if (rec.cap && d.caption) { try { var c = d.caption.call(d, this); if (c) rec.cap.textContent = c; else rec.cap.textContent = d.label ? this.t(d.label) : this.t(n); } catch (e2) {} }
  }
  if (!src) this.updatePath();
  this.updateTableMenu();
  this.emit('selectionChange');
};
P.updatePath = function () {
  if (!this.pathEl) return;
  var self = this, n = this.startNode(), chain = [];
  while (n && n !== this.area) { if (n.nodeType === 1) chain.unshift(n); n = n.parentNode; }
  this.pathEl.innerHTML = '';
  var b = el('span', {}, 'body', this.pathEl);
  b.addEventListener('click', function () { self.focus(); });
  chain.forEach(function (c) {
    el('span', {}, ' › ', self.pathEl).style.cursor = 'default';
    var s = el('span', {}, c.classList.contains('gwbm-protected') ? esc(c.getAttribute('data-gwbm-tag')) : esc(c.localName), self.pathEl);
    s.addEventListener('click', function () {
      self.focus(); var r = self.idoc.createRange(); r.selectNodeContents(c); self.setRange(r); self.selectElement(/^(img|table|hr|video|audio)$/.test(c.localName) ? c : null); self.refreshSoon();
    });
  });
};
P.updateStatus = function () {
  if (!this.ready) return;
  if (this.mode === 'wysiwyg') {
    var empty = !this.area.textContent.replace(/[\s​]/g, '') && !this.area.querySelector('img,table,hr,video,audio,.gwbm-protected,input,iframe,canvas,svg,select,textarea');
    this.area.classList.toggle('gwbm-empty', empty && !!this.opts.placeholder);
  }
  if (!this.countEl) return;
  var txt = this.getText().trim(), w = txt ? txt.split(/\s+/).length : 0;
  this.countEl.textContent = this.t('words') + ': ' + w + '  ·  ' + this.t('chars') + ': ' + txt.length;
};

/* ---------- painéis e menus ---------- */
P.openPanel = function (anchor, build, cls) {
  var self = this; this.closePanel();
  var pop = el('div', { 'class': 'gwbm-pop' + (cls ? ' ' + cls : '') }, '', this.container);
  build(pop, function () { self.closePanel(); });
  var br = anchor.getBoundingClientRect(), cr = this.container.getBoundingClientRect();
  pop.style.top = (br.bottom - cr.top + 2) + 'px';
  pop.style.left = Math.max(0, Math.min(br.left - cr.left, cr.width - pop.offsetWidth - 2)) + 'px';
  this.pop = pop; this.popAnchor = anchor;
  this._popOut = function (e) { if (pop.contains(e.target) || anchor.contains(e.target)) return; self.closePanel(); };
  doc.addEventListener('mousedown', this._popOut, true);
  this.idoc.addEventListener('mousedown', this._popOut, true);
};
P.closePanel = function () {
  if (!this.pop) return;
  if (this.pop.parentNode) this.pop.parentNode.removeChild(this.pop);
  doc.removeEventListener('mousedown', this._popOut, true);
  try { this.idoc.removeEventListener('mousedown', this._popOut, true); } catch (e) {}
  this.pop = null; this.popAnchor = null;
};
P.openMenu = function (anchor, d) {
  var self = this, items = isFn(d.menu) ? d.menu(this) : d.menu, cur = d.current ? d.current(this) : null;
  this.openPanel(anchor, function (pop, close) {
    items.forEach(function (it) {
      if (isStr(it)) it = { v: it, l: it };
      var row = el('div', { 'class': 'gwbm-item' + (cur != null && String(cur) === String(it.v) ? ' gwbm-cur' : ''), style: it.s || '' }, it.h || esc(it.l));
      row.addEventListener('mousedown', function (e) { e.preventDefault(); });
      row.addEventListener('click', function () { close(); d.apply.call(d, self, it.v, it); });
      pop.appendChild(row);
    });
  });
};

/* ---------- diálogos ---------- */
P.dialog = function (cfg) {
  var self = this, T = function (k) { return self.t(k); };
  this.saveSel();
  var ov = el('div', { 'class': 'gwbm-overlay' + (this.dark ? ' gwbm-dark' : '') + (cfg.modal === false ? ' gwbm-nomodal' : '') });
  var box = el('div', { 'class': 'gwbm-dialog', role: 'dialog', 'aria-modal': 'true' }, '', ov);
  box.style.width = isStr(cfg.width) ? cfg.width : (cfg.width || 460) + 'px';
  var head = el('div', { 'class': 'gwbm-dhead' }, '<span>' + esc(cfg.title) + '</span>', box);
  var x = el('button', { type: 'button', 'aria-label': T('close') }, '×', head);
  var body = el('div', { 'class': 'gwbm-dbody' }, '', box);
  var ctl = {};
  (cfg.fields || []).forEach(function (f) {
    var lab = f.label ? (STR[f.label] ? T(f.label) : f.label) : '';
    if (f.type === 'html') { el('div', { 'class': 'gwbm-note' }, f.html, body); return; }
    var wrap = el('label', { 'class': 'gwbm-field' + (f.half ? ' gwbm-half' : '') + (f.type === 'checkbox' ? ' gwbm-chk' : '') }, '', body), c;
    var span = function () { if (lab) el('span', {}, esc(lab), wrap); };
    if (f.type === 'checkbox') { c = el('input', { type: 'checkbox' }, '', wrap); c.checked = !!f.value; span(); }
    else if (f.type === 'select') {
      span(); c = el('select', {}, '', wrap);
      (f.options || []).forEach(function (o) {
        if (o.group) { var og = el('optgroup', { label: o.group }, '', c); o.options.forEach(function (oo) { var op = el('option', { value: oo[0] }, esc(oo[1]), og); }); }
        else { if (isStr(o)) o = [o, o]; el('option', { value: o[0] }, esc(STR[o[1]] ? T(o[1]) : o[1]), c); }
      });
      c.value = f.value == null ? '' : f.value;
    } else if (f.type === 'textarea') {
      span(); c = el('textarea', { rows: f.rows || 5, spellcheck: 'false' }, '', wrap); c.value = f.value || '';
      var ph = f.placeholder || (f.label === 'extraAttrs' ? T('extraExample') : ''); if (ph) c.placeholder = ph;
    } else if (f.type === 'preview') {
      span(); c = el('div', { 'class': 'gwbm-imgprev' }, '<img alt=""><small></small>', wrap);
      c.update = function (u) {
        var im = c.firstChild, sm = c.lastChild;
        if (!u) { im.style.display = 'none'; sm.textContent = T('noImage'); return; }
        im.onload = function () { sm.textContent = im.naturalWidth + ' × ' + im.naturalHeight + ' px'; };
        im.onerror = function () { im.style.display = 'none'; sm.textContent = T('imgError'); };
        im.style.display = 'block'; sm.textContent = ''; im.src = u;
      };
      c.update(f.value || '');
    } else if (f.type === 'file') { span(); c = el('input', { type: 'file', accept: f.accept || '' }, '', wrap); }
    else if (f.type === 'color') {
      span(); var row = el('div', { 'class': 'gwbm-colorrow' }, '', wrap);
      c = el('input', { type: 'text' }, '', row); c.value = f.value || '';
      var cc = el('input', { type: 'color' }, '', row); try { cc.value = /^#[0-9a-f]{6}$/i.test(c.value) ? c.value : '#ffffff'; } catch (e) {}
      cc.addEventListener('input', function () { c.value = cc.value; });
    } else if (f.type === 'paste') {
      span(); c = el('div', { 'class': 'gwbm-paste', contenteditable: 'true' }, '', wrap);
    } else { span(); c = el('input', { type: f.type || 'text' }, '', wrap); c.value = f.value == null ? '' : f.value; if (f.placeholder) c.placeholder = f.placeholder; }
    if (f.onChange) c.addEventListener(f.type === 'file' || f.type === 'select' || f.type === 'checkbox' ? 'change' : 'input', function () { f.onChange(c, ctl); });
    ctl[f.name] = c; c._f = f;
  });
  if (cfg.node) body.appendChild(cfg.node);
  var foot = el('div', { 'class': 'gwbm-dfoot' }, '', box);
  var api = {
    el: ov, box: box, ctl: ctl,
    close: function (noRestore) {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      doc.removeEventListener('keydown', onKey, true);
      if (!noRestore && !cfg.noRestore) { self.focus(); }
    },
    values: function () {
      var v = {};
      for (var n in ctl) {
        var c = ctl[n], f = c._f;
        if (f.type === 'preview') continue;
        v[n] = f.type === 'checkbox' ? c.checked : f.type === 'file' ? (c.files && c.files[0]) : f.type === 'paste' ? c.innerHTML : c.value;
      }
      return v;
    }
  };
  var submit = function () { if (cfg.onOk && cfg.onOk(api.values(), api) === false) return; api.close(); };
  var onKey = function (e) {
    if (!ov.parentNode) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(); }
    else if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.tagName === 'INPUT' && e.target.type !== 'file' && cfg.onOk) { e.preventDefault(); submit(); }
  };
  (cfg.buttons || []).forEach(function (b) {
    var btn = el('button', { type: 'button' }, esc(STR[b.label] ? T(b.label) : b.label), foot);
    btn.addEventListener('click', function () { b.onClick(api.values(), api); });
  });
  if (cfg.onOk) { var ok = el('button', { type: 'button', 'class': 'gwbm-primary' }, esc(T(cfg.okText || 'ok')), foot); ok.addEventListener('click', submit); }
  var cb = el('button', { type: 'button' }, esc(T(cfg.onOk ? 'cancel' : 'close')), foot); cb.addEventListener('click', function () { api.close(); });
  x.addEventListener('click', function () { api.close(); });
  if (!cfg.modal !== false) ov.addEventListener('mousedown', function (e) { if (e.target === ov && cfg.modal !== false) { /* clique fora não fecha, evita perda de dados */ } });
  doc.body.appendChild(ov);
  doc.addEventListener('keydown', onKey, true);
  var first = body.querySelector('input:not([type=checkbox]):not([type=color]),textarea,select,.gwbm-paste');
  if (first) setTimeout(function () { first.focus(); if (first.select && first.type === 'text') first.select(); }, 20);
  return api;
};

/* ---------- comandos auxiliares: links / imagens / mídia / tabelas ---------- */
P.linkDialog = function () {
  var self = this, r = this.selRange();
  var a = r ? closest(r.startContainer, 'a', this.area) : null;
  if (!a && this.selEl && this.selEl.localName === 'a') a = this.selEl;
  var href = a ? (a.getAttribute('href') || '') : '', type = 'url', val = href;
  if (/^mailto:/i.test(href)) { type = 'email'; val = href.replace(/^mailto:/i, ''); }
  else if (/^tel:/i.test(href)) { type = 'tel'; val = href.replace(/^tel:/i, ''); }
  else if (/^#/.test(href)) { type = 'anchor'; val = href.slice(1); }
  var text = a ? a.textContent : (r && !r.collapsed ? r.toString() : '');
  var anchors = arr(this.area.querySelectorAll('a[id],a[name],[id]')).map(function (n) { return n.getAttribute('id') || n.getAttribute('name'); }).filter(Boolean);
  var extra = a ? attrLines(a, ['href', 'title', 'target', 'rel', 'class', 'id']) : '';
  this.dialog({
    title: this.t('link'), width: 500,
    fields: [
      { name: 'type', label: 'linkType', type: 'select', value: type, half: true, options: [['url', 'typeUrl'], ['anchor', 'typeAnchor'], ['email', 'typeEmail'], ['tel', 'typePhone']] },
      { name: 'target', label: 'target', type: 'select', value: a ? (a.getAttribute('target') || '') : '', half: true, options: [['', 'targetSelf'], ['_blank', 'targetBlank'], ['_parent', '_parent'], ['_top', '_top']] },
      { name: 'url', label: 'url', value: val, placeholder: 'https://' },
      { name: 'text', label: 'text', value: text },
      { name: 'title', label: 'title', value: a ? a.getAttribute('title') || '' : '', half: true },
      { name: 'rel', label: 'rel', value: a ? a.getAttribute('rel') || '' : '', half: true },
      { name: 'cls', label: 'cssClass', value: a ? a.getAttribute('class') || '' : '', half: true },
      { name: 'id', label: 'idAttr', value: a ? a.getAttribute('id') || '' : '', half: true },
      { name: 'extra', label: 'extraAttrs', type: 'textarea', rows: 3, value: extra }
    ],
    onOk: function (v) {
      var url = v.url.trim();
      if (v.type === 'email' && url && !/^mailto:/i.test(url)) url = 'mailto:' + url;
      if (v.type === 'tel' && url && !/^tel:/i.test(url)) url = 'tel:' + url;
      if (v.type === 'anchor' && url) url = '#' + url.replace(/^#/, '');
      self.focus(); self.record();
      var links = [];
      if (!url && !v.extra.trim()) { if (a) unwrap(a); self.changed(true); return; }
      if (a) links = [a];
      else if (r && !r.collapsed) {
        self.idoc.execCommand('createLink', false, '#gwbm-tmp-link');
        links = arr(self.area.querySelectorAll('a[href="#gwbm-tmp-link"]'));
      } else {
        var na = self.idoc.createElement('a'); na.textContent = v.text || url; self.insertNodeAtCaret(na); links = [na];
      }
      var ex = parseAttrLines(v.extra);
      links.forEach(function (l) {
        var set = function (n, val) { if (val) l.setAttribute(n, val); else l.removeAttribute(n); };
        set('href', url); set('title', v.title); set('target', v.target); set('rel', v.rel); set('class', v.cls); set('id', v.id);
        arr(l.attributes).forEach(function (at) { var nm = attrName(at.name); if (['href', 'title', 'target', 'rel', 'class', 'id'].indexOf(nm) < 0 && !(nm in ex)) l.removeAttribute(at.name); });
        for (var k in ex) safeAttr(l, k, ex[k]);
        if (a && v.text && v.text !== l.textContent && !l.children.length) l.textContent = v.text;
      });
      self.changed(true);
    }
  });
};
P.imageDialog = function () {
  var self = this, img = this.selEl && this.selEl.localName === 'img' ? this.selEl : null;
  var st = img ? img.style : null, al = 'none';
  if (st) { if (st.cssFloat === 'left') al = 'left'; else if (st.cssFloat === 'right') al = 'right'; else if (st.display === 'block' && st.marginLeft === 'auto') al = 'center'; }
  var lnk = img ? closest(img.parentNode, 'a', this.area) : null;
  this.dialog({
    title: this.t('image'), width: 520,
    fields: [
      { name: 'src', label: 'url', value: img ? img.getAttribute('src') || '' : '', placeholder: 'https://', onChange: function (c, ctl) { ctl.prev.update(c.value.trim()); } },
      { name: 'file', label: 'upload', type: 'file', accept: 'image/*', onChange: function (c, ctl) {
        var f = c.files && c.files[0]; if (!f) return;
        var fr = new FileReader(); fr.onload = function () { ctl.prev.update(fr.result); }; fr.readAsDataURL(f);
      } },
      { name: 'prev', label: 'imgPreview', type: 'preview', value: img ? img.getAttribute('src') || '' : '' },
      { name: 'alt', label: 'alt', value: img ? img.getAttribute('alt') || '' : '' },
      { name: 'title', label: 'title', value: img ? img.getAttribute('title') || '' : '' },
      { name: 'width', label: 'width', value: img ? img.getAttribute('width') || '' : '', half: true },
      { name: 'height', label: 'height', value: img ? img.getAttribute('height') || '' : '', half: true },
      { name: 'align', label: 'align', type: 'select', value: al, half: true, options: [['none', 'none'], ['left', 'left'], ['right', 'right'], ['center', 'center']] },
      { name: 'cls', label: 'cssClass', value: img ? img.getAttribute('class') || '' : '', half: true },
      { name: 'link', label: 'link (href)', value: lnk ? lnk.getAttribute('href') || '' : '', half: true },
      { name: 'linkTarget', label: 'target', type: 'select', value: lnk ? lnk.getAttribute('target') || '' : '', half: true, options: [['', 'targetSelf'], ['_blank', 'targetBlank']] },
      { name: 'extra', label: 'extraAttrs', type: 'textarea', rows: 2, value: img ? attrLines(img, ['src', 'alt', 'title', 'width', 'height', 'class', 'style']) : '' }
    ],
    onOk: function (v, dlg) {
      var finish = function (src) {
        if (!src) return;
        self.focus(); self.record();
        var im = img || self.idoc.createElement('img'), set = function (n, val) { if (val) im.setAttribute(n, val); else im.removeAttribute(n); };
        im.setAttribute('src', src); set('alt', v.alt || ''); if (!v.alt) im.setAttribute('alt', ''); set('title', v.title); set('width', v.width); set('height', v.height); set('class', v.cls);
        ['float', 'display', 'margin-left', 'margin-right', 'margin'].forEach(function (p) { im.style.removeProperty(p); });
        if (v.align === 'left') { im.style.cssFloat = 'left'; im.style.margin = '0 1em 1em 0'; }
        else if (v.align === 'right') { im.style.cssFloat = 'right'; im.style.margin = '0 0 1em 1em'; }
        else if (v.align === 'center') { im.style.display = 'block'; im.style.marginLeft = 'auto'; im.style.marginRight = 'auto'; }
        if (!im.getAttribute('style')) im.removeAttribute('style');
        var ex = parseAttrLines(v.extra);
        for (var k in ex) safeAttr(im, k, ex[k]);
        var parentA = closest(im.parentNode, 'a', self.area);
        if (v.link) {
          if (!parentA) { var a = self.idoc.createElement('a'); if (im.parentNode) im.parentNode.replaceChild(a, im); a.appendChild(im); parentA = a; }
          parentA.setAttribute('href', v.link); if (v.linkTarget) parentA.setAttribute('target', v.linkTarget); else parentA.removeAttribute('target');
          if (!img) self.insertNodeAtCaret(parentA);
        } else {
          if (parentA && parentA.childNodes.length === 1) unwrap(parentA);
          if (!img) self.insertNodeAtCaret(im);
        }
        self.changed(true); self.positionHandle();
      };
      if (v.file) { self.uploadFile(v.file, finish); return; }
      finish(v.src.trim());
    }
  });
};
P.mediaDialog = function (kind) {
  var self = this, isVideo = kind === 'video';
  var f = [
    { name: 'src', label: 'url', placeholder: 'https://' }
  ];
  if (isVideo) f.push({ name: 'poster', label: 'poster' });
  if (isVideo) f.push({ name: 'width', label: 'width', half: true, value: '480' }, { name: 'height', label: 'height', half: true });
  f.push({ name: 'controls', label: 'controls', type: 'checkbox', value: true }, { name: 'autoplay', label: 'autoplay', type: 'checkbox' },
    { name: 'loop', label: 'loop', type: 'checkbox' }, { name: 'muted', label: 'muted', type: 'checkbox' });
  this.dialog({
    title: this.t(kind), fields: f,
    onOk: function (v) {
      if (!v.src.trim()) return false;
      var h = '<' + kind + ' src="' + esc(v.src.trim()) + '"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : '') + (v.width ? ' width="' + esc(v.width) + '"' : '') + (v.height ? ' height="' + esc(v.height) + '"' : '') +
        (v.controls ? ' controls' : '') + (v.autoplay ? ' autoplay' : '') + (v.loop ? ' loop' : '') + (v.muted ? ' muted' : '') + '></' + kind + '>';
      self.insertHtml(h);
    }
  });
};
P.iframeDialog = function () {
  var self = this;
  this.dialog({
    title: this.t('iframe'), width: 500,
    fields: [
      { name: 'src', label: 'url', placeholder: 'https://' },
      { name: 'width', label: 'width', half: true, value: '560' }, { name: 'height', label: 'height', half: true, value: '315' },
      { name: 'title', label: 'title' }, { name: 'sandbox', label: 'sandbox' },
      { name: 'fs', label: 'allowfs', type: 'checkbox', value: true }, { name: 'lazy', label: 'lazy', type: 'checkbox' }
    ],
    onOk: function (v) {
      var u = v.src.trim(); if (!u) return false;
      var m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/))([\w-]{6,})/i.exec(u);
      if (m) u = 'https://www.youtube.com/embed/' + m[1];
      else if ((m = /vimeo\.com\/(\d+)/i.exec(u))) u = 'https://player.vimeo.com/video/' + m[1];
      self.insertHtml('<iframe src="' + esc(u) + '" width="' + esc(v.width) + '" height="' + esc(v.height) + '"' + (v.title ? ' title="' + esc(v.title) + '"' : '') + (v.sandbox ? ' sandbox="' + esc(v.sandbox) + '"' : '') +
        (v.fs ? ' allowfullscreen' : '') + (v.lazy ? ' loading="lazy"' : '') + ' style="border:0"></iframe>');
    }
  });
};
P.tableHtml = function (rows, cols, o) {
  o = extend({}, this.opts.tableDefaults, o || {});
  var h = '<table' + (o.border != null && o.border !== '' ? ' border="' + esc(o.border) + '"' : '') + (o.cellspacing != null ? ' cellspacing="' + esc(o.cellspacing) + '"' : '') +
    (o.cellpadding != null ? ' cellpadding="' + esc(o.cellpadding) + '"' : '') + (o.cls ? ' class="' + esc(o.cls) + '"' : '') +
    ' style="' + (o.width ? 'width:' + esc(o.width) + ';' : '') + 'border-collapse:collapse">';
  if (o.caption) h += '<caption>' + esc(o.caption) + '</caption>';
  if (o.header) { h += '<thead><tr>' + rep('<th><br></th>', cols) + '</tr></thead>'; rows--; }
  h += '<tbody>' + rep('<tr>' + rep('<td><br></td>', cols) + '</tr>', Math.max(rows, 0)) + '</tbody></table>';
  return h;
};
P.tableDialog = function () {
  var self = this;
  this.dialog({
    title: this.t('table'),
    fields: [
      { name: 'rows', label: 'rows', type: 'number', value: 3, half: true }, { name: 'cols', label: 'cols', type: 'number', value: 3, half: true },
      { name: 'width', label: 'width', value: this.opts.tableDefaults.width || '', half: true }, { name: 'border', label: 'border', value: this.opts.tableDefaults.border, half: true },
      { name: 'cellspacing', label: 'spacing', value: this.opts.tableDefaults.cellspacing, half: true }, { name: 'cellpadding', label: 'padding', value: this.opts.tableDefaults.cellpadding, half: true },
      { name: 'caption', label: 'caption' }, { name: 'cls', label: 'cssClass', half: true },
      { name: 'header', label: 'headerRow', type: 'checkbox', value: true }
    ],
    onOk: function (v) {
      self.insertHtml(self.tableHtml(Math.max(1, +v.rows || 1), Math.max(1, +v.cols || 1), { width: v.width, border: v.border, cellspacing: v.cellspacing, cellpadding: v.cellpadding, caption: v.caption, cls: v.cls, header: v.header }));
    }
  });
};
function renameEl(n, tag) {
  var d = n.ownerDocument.createElement(tag);
  arr(n.attributes).forEach(function (a) { d.setAttribute(a.name, a.value); });
  while (n.firstChild) d.appendChild(n.firstChild);
  n.parentNode.replaceChild(d, n); return d;
}
P.tableOp = function (op) {
  var cell = this.cellOf();
  if (!cell) { this.alertMsg(this.t('noCell')); return; }
  var tr = cell.parentNode, table = closest(tr, 'table', this.area), d = this.idoc;
  if (!table) return;
  this.focus(); this.record();
  var idx = cell.cellIndex, rows = arr(table.rows), inHead = tr.parentNode.localName === 'thead';
  var mk = function (ref, tag) { var c = d.createElement(tag || ref.localName); c.innerHTML = '<br>'; if (ref.colSpan > 1 && !tag) c.colSpan = ref.colSpan; return c; };
  if (op === 'rowAbove' || op === 'rowBelow') {
    var n = d.createElement('tr'); arr(tr.cells).forEach(function (c) { n.appendChild(mk(c, inHead && op === 'rowBelow' ? 'td' : null)); });
    if (inHead && op === 'rowBelow') { var tb = table.tBodies[0] || table.appendChild(d.createElement('tbody')); tb.insertBefore(n, tb.firstChild); }
    else tr.parentNode.insertBefore(n, op === 'rowAbove' ? tr : tr.nextSibling);
  } else if (op === 'rowDel') { tr.parentNode.removeChild(tr); if (!table.rows.length) table.parentNode.removeChild(table); }
  else if (op === 'colLeft' || op === 'colRight') {
    rows.forEach(function (r) { var ref = r.cells[idx]; if (!ref) return; r.insertBefore(mk(ref), op === 'colLeft' ? ref : ref.nextSibling); });
  } else if (op === 'colDel') {
    rows.forEach(function (r) { if (r.cells[idx]) r.deleteCell(idx); });
    if (!arr(table.rows).some(function (r) { return r.cells.length; })) table.parentNode.removeChild(table);
  } else if (op === 'merge') {
    var nx = cell.nextElementSibling;
    if (nx) { cell.colSpan = (cell.colSpan || 1) + (nx.colSpan || 1); if (nx.textContent.trim() || nx.querySelector('img')) cell.innerHTML += ' ' + nx.innerHTML; nx.parentNode.removeChild(nx); }
  } else if (op === 'split') {
    if (cell.colSpan > 1) { cell.colSpan = cell.colSpan - 1; if (cell.colSpan === 1) cell.removeAttribute('colspan'); cell.parentNode.insertBefore(mk(cell), cell.nextSibling); }
  } else if (op === 'mergeDown') {
    var ri = rows.indexOf(tr), nr = rows[ri + 1], tg = nr && nr.cells[idx];
    if (tg) { cell.rowSpan = (cell.rowSpan || 1) + (tg.rowSpan || 1); if (tg.textContent.trim() || tg.querySelector('img')) cell.innerHTML += ' ' + tg.innerHTML; tg.parentNode.removeChild(tg); }
  } else if (op === 'dupRow') {
    tr.parentNode.insertBefore(tr.cloneNode(true), tr.nextSibling);
  } else if (op === 'toggleTh') {
    renameEl(cell, cell.localName === 'td' ? 'th' : 'td');
  } else if (op === 'paraBefore' || op === 'paraAfter') {
    var p = d.createElement('p'); p.innerHTML = '<br>';
    table.parentNode.insertBefore(p, op === 'paraBefore' ? table : table.nextSibling);
    var rg = d.createRange(); rg.selectNodeContents(p); rg.collapse(true); this.setRange(rg);
  } else if (op === 'del') table.parentNode.removeChild(table);
  this.changed(true); this.refreshSoon();
};
P.buildTableMenu = function () {
  var self = this, m = this.tmenu; m.innerHTML = '';
  [['tmTable', 'table'], ['tmRow', 'row'], ['tmCol', 'col'], ['tmCell', 'cell']].forEach(function (d) {
    var b = el('button', { type: 'button', 'class': 'gwbm-tbtn' }, esc(self.t(d[0])) + ' <span class="gwbm-arrow">▾</span>', m);
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () {
      var same = self.pop && self.popAnchor === b; self.closePanel(); if (same) return;
      self.saveSel();
      self.openMenu(b, { menu: self.tableMenuItems(d[1]), apply: function (ed, v) { self.tableAction(v); } });
    });
  });
  var f = el('button', { type: 'button', 'class': 'gwbm-tbtn', title: this.t('tableFormat') }, '⚙ ' + esc(this.t('tmFormat')), m);
  f.addEventListener('mousedown', function (e) { e.preventDefault(); });
  f.addEventListener('click', function () { self.closePanel(); self.saveSel(); self.tableFormatDialog(); });
};
P.tableMenuItems = function (kind) {
  var map = {
    table: [['tprops', 'tableProps'], ['tformat', 'tableFormat'], ['paraBefore', 'paraBefore'], ['paraAfter', 'paraAfter'], ['del', 'tableDel']],
    row: [['rowAbove', 'tableRowAbove'], ['rowBelow', 'tableRowBelow'], ['dupRow', 'rowDup'], ['rowDel', 'tableRowDel']],
    col: [['colLeft', 'tableColLeft'], ['colRight', 'tableColRight'], ['colDel', 'tableColDel']],
    cell: [['cellProps', 'tableCell'], ['merge', 'tableMerge'], ['mergeDown', 'tableMergeDown'], ['split', 'tableSplit'], ['toggleTh', 'cellToggleHead']]
  };
  var self = this; return map[kind].map(function (x) { return { v: x[0], l: self.t(x[1]) }; });
};
P.tableAction = function (v) {
  if (v === 'tprops') this.tablePropsDialog();
  else if (v === 'tformat') this.tableFormatDialog();
  else if (v === 'cellProps') this.cellDialog();
  else this.tableOp(v);
};
P.updateTableMenu = function () {
  var m = this.tmenu; if (!m) return;
  var c = (this.ready && this.mode === 'wysiwyg' && !this.readOnly) ? this.cellOf() : null;
  if (!c) { m.style.display = 'none'; return; }
  var t = closest(c, 'table', this.area), r = t.getBoundingClientRect(), H = this.frame.clientHeight, W = this.frame.clientWidth;
  if (r.bottom < 0 || r.top > H) { m.style.display = 'none'; return; }
  m.style.display = 'flex';
  var top = r.top - m.offsetHeight - 2;
  if (top < 2) top = (r.bottom + 2 + m.offsetHeight < H) ? r.bottom + 2 : 2;
  m.style.top = top + 'px'; m.style.left = Math.max(2, Math.min(r.left, W - m.offsetWidth - 2)) + 'px';
};
P.tableFormatDialog = function () {
  var self = this, c = this.cellOf(), t = c ? closest(c, 'table', this.area) : null;
  if (!t) { this.alertMsg(this.t('noCell')); return; }
  var T = function (k) { return self.t(k); }, tr = c.parentNode, idx = c.cellIndex, S = t.style, cap = t.querySelector('caption');
  var bst = [['', 'unchanged'], ['solid', 'solid'], ['dashed', 'dashed'], ['dotted', 'dotted'], ['double', 'double'], ['groove', 'groove'], ['ridge', 'ridge'], ['none', 'none']];
  var al = [['', 'unchanged'], ['left', 'left'], ['center', 'center'], ['right', 'right'], ['justify', 'justify']];
  this.dialog({
    title: this.t('tableFormat'), width: 660,
    fields: [
      { type: 'html', html: '<b>' + T('tfTable') + '</b> &nbsp; <i>' + T('tfHint') + '</i>' },
      { name: 'width', label: 'width', value: S.width || '', placeholder: '100% / 600px', half: true }, { name: 'height', label: 'height', value: S.height || '', half: true },
      { name: 'tbAlign', label: 'tbAlign', type: 'select', value: '', half: true, options: [['', 'unchanged'], ['none', 'none'], ['left', 'left'], ['center', 'center'], ['right', 'right']] },
      { name: 'collapse', label: 'collapse', type: 'select', value: '', half: true, options: [['', 'unchanged'], ['collapse', 'collapseC'], ['separate', 'collapseS']] },
      { name: 'spacing', label: 'spacingF', half: true }, { name: 'bg', label: 'bg', type: 'color', value: S.backgroundColor || '', half: true },
      { name: 'tbw', label: 'borderWidth', type: 'number', half: true }, { name: 'tbs', label: 'borderStyle', type: 'select', options: bst, half: true },
      { name: 'tbc', label: 'borderColor', type: 'color', half: true }, { name: 'caption', label: 'caption', value: cap ? cap.textContent : '', half: true },
      { name: 'capSide', label: 'capSide', type: 'select', value: '', half: true, options: [['', 'unchanged'], ['top', 'top'], ['bottom', 'bottom']] },
      { type: 'html', html: '<b>' + T('tfCells') + '</b>' },
      { name: 'scope', label: 'tfScope', type: 'select', value: 'table', options: [['table', 'scopeTable'], ['row', 'scopeRow'], ['col', 'scopeCol'], ['cell', 'scopeCell']] },
      { name: 'padding', label: 'padding', half: true, placeholder: '8px' }, { name: 'fsz', label: 'fontSizeF', type: 'number', half: true },
      { name: 'ta', label: 'align', type: 'select', options: al, half: true }, { name: 'va', label: 'valign', type: 'select', half: true, options: [['', 'unchanged'], ['top', 'top'], ['middle', 'middle'], ['bottom', 'bottom']] },
      { name: 'cbg', label: 'bg', type: 'color', half: true }, { name: 'cfg', label: 'textColor', type: 'color', half: true },
      { name: 'cbw', label: 'borderWidth', type: 'number', half: true }, { name: 'cbs', label: 'borderStyle', type: 'select', options: bst, half: true },
      { name: 'cbc', label: 'borderColor', type: 'color', half: true },
      { name: 'clear', label: 'clearStyles', type: 'checkbox' },
      { type: 'html', html: '<b>' + T('tfHead') + '</b>' },
      { name: 'hbg', label: 'headBg', type: 'color', half: true }, { name: 'hfg', label: 'headFg', type: 'color', half: true },
      { name: 'hbold', label: 'headBold', type: 'checkbox' },
      { name: 'z1', label: 'zebra1', type: 'color', half: true }, { name: 'z2', label: 'zebra2', type: 'color', half: true }
    ],
    onOk: function (v) {
      self.focus(); self.record();
      var own = function (n) { return closest(n, 'table') === t; };
      var sp = function (e, p, val) { if (val !== '' && val != null) e.style.setProperty(p, val); };
      var bd = function (w, s, col) { return (w ? px(w) : '1px') + ' ' + (s || 'solid') + ' ' + (col || '#999999'); };
      sp(t, 'width', v.width); sp(t, 'height', v.height); sp(t, 'background-color', v.bg); sp(t, 'border-collapse', v.collapse);
      if (v.spacing !== '') { t.style.setProperty('border-spacing', px(v.spacing)); t.removeAttribute('cellspacing'); }
      if (v.tbAlign === 'none') { t.style.removeProperty('margin-left'); t.style.removeProperty('margin-right'); }
      else if (v.tbAlign) { t.style.setProperty('margin-left', v.tbAlign === 'left' ? '0' : 'auto'); t.style.setProperty('margin-right', v.tbAlign === 'right' ? '0' : 'auto'); }
      if (v.tbw !== '' || v.tbs || v.tbc) t.style.setProperty('border', bd(v.tbw, v.tbs, v.tbc));
      var cp = t.querySelector('caption');
      if (v.caption) { if (!cp) { cp = self.idoc.createElement('caption'); t.insertBefore(cp, t.firstChild); } cp.textContent = v.caption; sp(cp, 'caption-side', v.capSide); }
      else if (cp) cp.parentNode.removeChild(cp);
      var cells = arr(t.querySelectorAll('td,th')).filter(own);
      if (v.scope === 'row') cells = arr(tr.cells);
      else if (v.scope === 'col') cells = arr(t.rows).map(function (r) { return r.cells[idx]; }).filter(Boolean);
      else if (v.scope === 'cell') cells = [c];
      cells.forEach(function (x) {
        if (v.clear) x.removeAttribute('style');
        if (v.padding !== '') x.style.setProperty('padding', px(v.padding));
        if (v.fsz !== '') x.style.setProperty('font-size', v.fsz + 'px');
        sp(x, 'text-align', v.ta); sp(x, 'vertical-align', v.va); sp(x, 'background-color', v.cbg); sp(x, 'color', v.cfg);
        if (v.cbw !== '' || v.cbs || v.cbc) x.style.setProperty('border', bd(v.cbw, v.cbs, v.cbc));
      });
      arr(t.querySelectorAll('th')).filter(own).forEach(function (h) { sp(h, 'background-color', v.hbg); sp(h, 'color', v.hfg); if (v.hbold) h.style.setProperty('font-weight', 'bold'); });
      if (v.z1 || v.z2) arr(t.tBodies).forEach(function (tb) { arr(tb.rows).forEach(function (r, i) { if (own(r)) sp(r, 'background-color', i % 2 === 0 ? v.z1 : v.z2); }); });
      arr(t.querySelectorAll('[style]')).forEach(function (n) { if (!n.getAttribute('style').trim()) n.removeAttribute('style'); });
      self.changed(true); self.positionHandle();
    }
  });
};
P.tabCell = function (back) {
  var cell = this.cellOf(); if (!cell) return;
  var table = closest(cell, 'table', this.area), cells = arr(table.querySelectorAll('td,th')).filter(function (c) { return closest(c.parentNode, 'table', null) === table; });
  var i = cells.indexOf(cell) + (back ? -1 : 1), nx = cells[i];
  if (!nx && !back) { this.tableOp('rowBelow'); cells = arr(table.querySelectorAll('td,th')); nx = cells[i]; }
  if (nx) { var r = this.idoc.createRange(); r.selectNodeContents(nx); r.collapse(true); this.setRange(r); }
};
P.cellDialog = function () {
  var self = this, c = this.cellOf();
  if (!c) { this.alertMsg(this.t('noCell')); return; }
  this.dialog({
    title: this.t('tableCell'),
    fields: [
      { name: 'tag', label: 'cellType', type: 'select', value: c.localName, half: true, options: [['td', 'dataCell'], ['th', 'headCell']] },
      { name: 'align', label: 'align', type: 'select', value: c.style.textAlign || c.getAttribute('align') || '', half: true, options: [['', 'none'], ['left', 'left'], ['center', 'center'], ['right', 'right'], ['justify', 'justify']] },
      { name: 'valign', label: 'valign', type: 'select', value: c.style.verticalAlign || c.getAttribute('valign') || '', half: true, options: [['', 'none'], ['top', 'top'], ['middle', 'middle'], ['bottom', 'bottom']] },
      { name: 'bg', label: 'bg', type: 'color', value: c.style.backgroundColor || c.getAttribute('bgcolor') || '', half: true },
      { name: 'width', label: 'width', value: c.style.width || c.getAttribute('width') || '', half: true }, { name: 'height', label: 'height', value: c.style.height || c.getAttribute('height') || '', half: true },
      { name: 'colspan', label: 'colspan', type: 'number', value: c.colSpan, half: true }, { name: 'rowspan', label: 'rowspan', type: 'number', value: c.rowSpan, half: true },
      { name: 'nowrap', label: 'nowrap', type: 'checkbox', value: c.style.whiteSpace === 'nowrap' }
    ],
    onOk: function (v) {
      self.focus(); self.record();
      var n = c;
      if (v.tag !== c.localName) n = renameEl(c, v.tag);
      var sp = function (p, val) { if (val) n.style.setProperty(p, val); else n.style.removeProperty(p); };
      n.removeAttribute('align'); n.removeAttribute('valign'); n.removeAttribute('bgcolor'); n.removeAttribute('width'); n.removeAttribute('height');
      sp('text-align', v.align); sp('vertical-align', v.valign); sp('background-color', v.bg); sp('width', v.width); sp('height', v.height); sp('white-space', v.nowrap ? 'nowrap' : '');
      var cs = Math.max(1, +v.colspan || 1), rs = Math.max(1, +v.rowspan || 1);
      if (cs > 1) n.colSpan = cs; else n.removeAttribute('colspan'); if (rs > 1) n.rowSpan = rs; else n.removeAttribute('rowspan');
      if (!n.getAttribute('style')) n.removeAttribute('style');
      self.changed(true);
    }
  });
};
P.tablePropsDialog = function () {
  var self = this, c = this.cellOf(), t = c ? closest(c, 'table', this.area) : (this.selEl && this.selEl.localName === 'table' ? this.selEl : null);
  if (!t) { this.alertMsg(this.t('noCell')); return; }
  var cap = t.querySelector('caption');
  this.dialog({
    title: this.t('tableProps'),
    fields: [
      { name: 'width', label: 'width', value: t.style.width || t.getAttribute('width') || '', half: true }, { name: 'height', label: 'height', value: t.style.height || t.getAttribute('height') || '', half: true },
      { name: 'border', label: 'border', value: t.getAttribute('border') || '', half: true }, { name: 'align', label: 'align', type: 'select', value: t.getAttribute('align') || '', half: true, options: [['', 'none'], ['left', 'left'], ['center', 'center'], ['right', 'right']] },
      { name: 'cellspacing', label: 'spacing', value: t.getAttribute('cellspacing') || '', half: true }, { name: 'cellpadding', label: 'padding', value: t.getAttribute('cellpadding') || '', half: true },
      { name: 'bg', label: 'bg', type: 'color', value: t.style.backgroundColor || '', half: true }, { name: 'cls', label: 'cssClass', value: t.getAttribute('class') || '', half: true },
      { name: 'caption', label: 'caption', value: cap ? cap.textContent : '' },
      { name: 'head', label: 'headerRow', type: 'checkbox', value: !!(t.rows[0] && arr(t.rows[0].cells).every(function (x) { return x.localName === 'th'; })) }
    ],
    onOk: function (v) {
      self.focus(); self.record();
      var sa = function (n, val) { if (val !== '' && val != null) t.setAttribute(n, val); else t.removeAttribute(n); };
      ['border', 'align', 'cellspacing', 'cellpadding'].forEach(function (n) { sa(n, v[n]); });
      var sp = function (p, val) { if (val) t.style.setProperty(p, val); else t.style.removeProperty(p); };
      sp('width', v.width); sp('height', v.height); sp('background-color', v.bg); if (!t.getAttribute('style')) t.removeAttribute('style');
      if (v.cls) t.setAttribute('class', v.cls); else t.removeAttribute('class');
      var cp = t.querySelector('caption');
      if (v.caption) { if (!cp) { cp = self.idoc.createElement('caption'); t.insertBefore(cp, t.firstChild); } cp.textContent = v.caption; } else if (cp) cp.parentNode.removeChild(cp);
      var r0 = t.rows[0];
      if (r0) { var allTh = arr(r0.cells).every(function (x) { return x.localName === 'th'; }); if (v.head && !allTh) arr(r0.cells).forEach(function (x) { renameEl(x, 'th'); }); else if (!v.head && allTh) arr(r0.cells).forEach(function (x) { renameEl(x, 'td'); }); }
      self.changed(true);
    }
  });
};

/* ---------- elementos genéricos ---------- */
P.currentElement = function () {
  if (this.selEl && this.selEl.isConnected) return this.selEl;
  var n = this.startNode(); if (!n) return null;
  if (n.nodeType === 3) n = n.parentNode;
  return n && n !== this.area ? n : null;
};
P.editHtml = function (elm) {
  var self = this; elm = elm || this.currentElement();
  if (!elm || elm === this.area) { this.alertMsg(this.t('noElement')); return; }
  this.dialog({
    title: this.t('editHtml') + ' — <' + (elm.classList.contains('gwbm-protected') ? elm.getAttribute('data-gwbm-tag') : elm.localName) + '>', width: 720,
    fields: [{ name: 'html', label: 'html', type: 'textarea', rows: 16, value: serialize(elm, true) }],
    onOk: function (v) {
      self.focus(); self.record();
      var frag = encodeFrag(v.html), d = self.idoc;
      if (elm.parentNode) { elm.parentNode.replaceChild(d.importNode(frag, true), elm); }
      self.selEl = null; self.changed(true); self.syncStyles();
    }
  });
};
P.elementProps = function (elm) {
  var self = this; elm = elm || this.currentElement();
  if (!elm || elm === this.area) { this.alertMsg(this.t('noElement')); return; }
  if (elm.classList.contains('gwbm-protected')) { this.editHtml(elm); return; }
  var std = ['id', 'class', 'style', 'title', 'lang', 'dir'];
  this.dialog({
    title: this.t('elementProps') + ' — <' + elm.localName + '>', width: 520,
    fields: [
      { name: 'id', label: 'idAttr', value: elm.getAttribute('id') || '', half: true }, { name: 'cls', label: 'cssClass', value: elm.getAttribute('class') || '', half: true },
      { name: 'style', label: 'style', type: 'textarea', rows: 3, value: elm.getAttribute('style') || '' },
      { name: 'title', label: 'title', value: elm.getAttribute('title') || '', half: true }, { name: 'lang', label: 'lang', value: elm.getAttribute('lang') || '', half: true },
      { name: 'dir', label: 'dir', type: 'select', value: elm.getAttribute('dir') || '', half: true, options: [['', 'none'], ['ltr', 'ltr'], ['rtl', 'rtl'], ['auto', 'auto']] },
      { name: 'extra', label: 'extraAttrs', type: 'textarea', rows: 5, value: attrLines(elm, std) }
    ],
    onOk: function (v) {
      self.focus(); self.record();
      var ex = parseAttrLines(v.extra), keep = { id: v.id, 'class': v.cls, style: v.style, title: v.title, lang: v.lang, dir: v.dir };
      arr(elm.attributes).forEach(function (a) { if (a.name === 'contenteditable') return; elm.removeAttribute(a.name); });
      for (var k in keep) if (keep[k]) elm.setAttribute(k, keep[k]);
      for (var e in ex) safeAttr(elm, e, ex[e]);
      self.changed(true); self.positionHandle();
    }
  });
};
P.insertElementDialog = function () {
  var self = this, opts = TAG_GROUPS.map(function (g) { return { group: g[0], options: g[1].split(',').map(function (t) { return [t, '<' + t + '>']; }) }; });
  var sel = this.selectedHtml();
  this.dialog({
    title: this.t('insertElement'), width: 560,
    fields: [
      { name: 'tag', label: 'tag', type: 'select', options: opts, value: 'div', half: true },
      { name: 'custom', label: 'customTag', half: true },
      { name: 'attrs', label: 'extraAttrs', type: 'textarea', rows: 3 },
      { name: 'content', label: 'innerContent', type: 'textarea', rows: 6, value: sel },
      { name: 'wrap', label: 'wrapSel', type: 'checkbox', value: !!sel }
    ],
    onOk: function (v) {
      var tag = (v.custom || v.tag).trim().toLowerCase();
      if (!/^[a-z][a-z0-9-]*$/.test(tag)) return false;
      var at = parseAttrLines(v.attrs), s = '<' + tag;
      for (var k in at) s += ' ' + k + '="' + esc(at[k]) + '"';
      s += '>';
      if (VOIDS.indexOf(tag) < 0) s += (v.content || '') + '</' + tag + '>';
      self.insertHtml(s);
    }
  });
};
P.structureInsert = function (tag, extra) {
  var sel = this.selectedHtml(), inner = sel;
  if (!inner) inner = '<p>' + this.t('contentHere') + '</p>';
  else if (!/<(p|div|ul|ol|table|h\d|blockquote|pre|section|article)[\s>]/i.test(inner)) inner = '<p>' + inner + '</p>';
  var h = (extra && extra.pre ? extra.pre : '') + inner + (extra && extra.post ? extra.post : '');
  this.insertHtml('<' + tag + (extra && extra.attr ? ' ' + extra.attr : '') + '>' + h + '</' + tag + '>');
};
P.findDialog = function () {
  var self = this, last = '';
  var msg = function (m) { if (dlg && dlg.ctl) dlg.box.querySelector('.gwbm-note') && (dlg.box.querySelector('.gwbm-note').textContent = m); };
  var dlg = this.dialog({
    title: this.t('find'), width: 380, modal: false, noRestore: true,
    fields: [{ name: 'find', label: 'find_' }, { name: 'rep', label: 'replace' }, { name: 'cs', label: 'matchCase', type: 'checkbox' }, { type: 'html', html: '&nbsp;' }],
    buttons: [
      { label: 'findNext', onClick: function (v) { next(v); } },
      { label: 'replaceOne', onClick: function (v) { replaceOne(v); } },
      { label: 'replaceAll', onClick: function (v) { replaceAll(v); } }
    ]
  });
  function next(v) {
    if (!v.find) return false;
    self.win.focus();
    var ok = self.win.find(v.find, !!v.cs, false, true, false, false, false);
    if (!ok) msg(self.t('notFound')); else { msg(''); self.saveSel(); }
    return ok;
  }
  function replaceOne(v) {
    var cur = self.selectedText();
    if (cur && (v.cs ? cur === v.find : cur.toLowerCase() === v.find.toLowerCase())) { self.insertText(v.rep); }
    next(v);
  }
  function replaceAll(v) {
    if (!v.find) return;
    self.record();
    var re = new RegExp(v.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), v.cs ? 'g' : 'gi'), n = 0;
    var w = self.idoc.createTreeWalker(self.area, 4), nodes = [];
    while (w.nextNode()) { if (!closest(w.currentNode.parentNode, '.gwbm-protected', self.area)) nodes.push(w.currentNode); }
    nodes.forEach(function (t) { var s = t.nodeValue; if (re.test(s)) { re.lastIndex = 0; t.nodeValue = s.replace(re, function () { n++; return v.rep; }); } re.lastIndex = 0; });
    self.changed(true); msg(n + ' ' + self.t('replacedN'));
  }
};
P.pasteDialog = function (mode) {
  var self = this;
  this.dialog({
    title: this.t(mode === 'text' ? 'pasteText' : 'pasteWord'), width: 560,
    fields: [{ type: 'html', html: this.t('pasteHere') }, { name: 'p', type: 'paste' }],
    onOk: function (v, dlg) {
      var box = dlg.ctl.p;
      if (mode === 'text') self.insertText(box.innerText); else self.insertHtml(self.cleanPaste(box.innerHTML));
    }
  });
};
P.preview = function () {
  var f = el('iframe', { 'class': 'gwbm-prevframe' });
  var css = [].concat(this.opts.contentCss || []).map(function (h) { return '<link rel="stylesheet" href="' + esc(h) + '">'; }).join('');
  var data = this.getData();
  f.srcdoc = this.opts.fullPage ? data : '<!DOCTYPE html><html><head><meta charset="utf-8">' + css + '<style>body{font:15px/1.55 Arial,sans-serif;margin:14px}' + (this.opts.contentStyle || '') + '</style></head><body>' + data + '</body></html>';
  this.dialog({ title: this.t('preview'), width: '94vw', node: f, noRestore: true });
};
P.print = function () {
  var f = el('iframe', { style: 'position:fixed;right:0;bottom:0;width:0;height:0;border:0' });
  var css = [].concat(this.opts.contentCss || []).map(function (h) { return '<link rel="stylesheet" href="' + esc(h) + '">'; }).join('');
  f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 2000); };
  var data = this.getData();
  f.srcdoc = this.opts.fullPage ? data : '<!DOCTYPE html><html><head><meta charset="utf-8">' + css + '<style>body{font:15px/1.55 Arial,sans-serif}' + (this.opts.contentStyle || '') + '</style></head><body>' + data + '</body></html>';
  doc.body.appendChild(f);
};

/* ---------- modos / API ---------- */
P.setMode = function (m) {
  if (!this.ready) { var s = this; this.whenReady(function () { s.setMode(m); }); return; }
  if (m === this.mode) return;
  this.closePanel();
  if (m === 'source') {
    this.record();
    var h = this.getData();
    this.mode = 'source';
    this.src.value = this.opts.sourcePretty && !this.opts.fullPage ? pretty(h) : h;
    this.container.classList.add('gwbm-source-on');
    this.selEl = null; this.positionHandle();
    this.src.focus();
  } else {
    var html = this.src.value;
    this.mode = 'wysiwyg';
    this.container.classList.remove('gwbm-source-on');
    if (this.opts.fullPage) { this.loadData(html); } else { this.area.innerHTML = encodeHtml(html) || '<p><br></p>'; this.syncStyles(); this.record(); this.updateStatus(); }
    this.sync();
    this.area.focus();
  }
  this.refresh(); this.updateStatus();
  this.emit('modeChange', this.mode);
};
P.toggleSource = function () { this.setMode(this.mode === 'source' ? 'wysiwyg' : 'source'); };
P.fullscreen = function (on) {
  if (on === undefined) on = !this.isFs;
  if (on === this.isFs) return;
  this.isFs = on;
  this.container.classList.toggle('gwbm-fullscreen', on);
  if (on) { this._prevOv = doc.documentElement.style.overflow; doc.documentElement.style.overflow = 'hidden'; }
  else doc.documentElement.style.overflow = this._prevOv || '';
  this.closePanel(); this.refresh(); this.positionHandle();
};
P.setReadOnly = function (v) {
  this.readOnly = !!v;
  if (this.ready) this.area.setAttribute('contenteditable', v ? 'false' : 'true');
  this.src.readOnly = !!v; this.refresh();
};
P.resize = function (w, h) { if (w) this.container.style.width = px(w); if (h) this.bodyEl.style.height = px(h); this.positionHandle(); };
P.destroy = function () {
  this.sync(); this.closePanel(); this.emit('destroy');
  if (this.isFs) this.fullscreen(false);
  var form = this.ta.form;
  if (form) { form.removeEventListener('submit', this._onSubmit, true); form.removeEventListener('reset', this._onReset); }
  doc.removeEventListener('keydown', this._onEsc); global.removeEventListener('resize', this._winResize);
  if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  this.ta.style.display = ''; delete this.ta._gwbm;
  var i = instances.indexOf(this); if (i >= 0) instances.splice(i, 1);
};

/* ===================================================================== comandos (botões) */
var COMMANDS = {};
function def(name, o) { COMMANDS[name] = o; }
function simple(name, icon, execCmd, stateCmd, key) {
  def(name, { icon: icon, key: key, exec: function (e) { e.exec(execCmd); }, state: function (e) { return e.qs(stateCmd || execCmd); } });
}
function tagBtn(name, icon, tag) {
  def(name, { icon: icon, exec: function (e) { e.toggleTag(tag); }, state: function (e) { return !!e.ancestor(tag); } });
}
def('source', { icon: I.txt('&lt;/&gt;'), always: true, exec: function (e) { e.toggleSource(); }, state: function (e) { return e.mode === 'source'; } });
def('fullscreen', { icon: I.full, always: true, exec: function (e) { e.fullscreen(); }, state: function (e) { return e.isFs; } });
def('preview', { icon: I.eye, always: true, exec: function (e) { e.preview(); } });
def('print', { icon: I.print, always: true, exec: function (e) { e.print(); } });
def('about', {
  icon: I.info, always: true, exec: function (e) {
    e.dialog({ title: e.t('about'), width: 380, fields: [{ type: 'html', html: '<b>GWBMEditor v' + VERSION + '</b><br>' + e.t('aboutText') }], noRestore: true });
  }
});
def('formatSource', { icon: I.txt('{ }'), srcOk: true, exec: function (e) { if (e.mode === 'source') e.src.value = pretty(e.src.value); } });
def('find', { icon: I.find, exec: function (e) { e.findDialog(); } });
def('undo', { icon: I.undo, key: 'Ctrl+Z', exec: function (e) { e.undo(); } });
def('redo', { icon: I.redo, key: 'Ctrl+Y', exec: function (e) { e.redo(); } });
def('cut', { icon: I.cut, exec: function (e) { e.exec('cut'); } });
def('copy', { icon: I.copy, exec: function (e) { e.focus(); try { e.idoc.execCommand('copy'); } catch (x) {} } });
def('pasteText', {
  icon: I.paste, exec: function (e) {
    if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { e.insertText(t); }, function () { e.pasteDialog('text'); });
    else e.pasteDialog('text');
  }
});
def('pasteWord', { icon: I.paste + I.txt('W'), exec: function (e) { e.pasteDialog('word'); } });
def('selectAll', { icon: I.txt('☐'), exec: function (e) { e.exec('selectAll'); } });
def('clearAll', { icon: I.clear, exec: function (e) { if (global.confirm(e.t('confirmClear'))) { e.setData(''); e.focus(); } } });
simple('bold', I.txt('<b>B</b>'), 'bold', 'bold', 'Ctrl+B');
simple('italic', I.txt('<i>I</i>'), 'italic', 'italic', 'Ctrl+I');
simple('underline', I.txt('<u>U</u>'), 'underline', 'underline', 'Ctrl+U');
simple('strike', I.txt('<s>S</s>'), 'strikeThrough');
simple('subscript', I.txt('x<sub>2</sub>'), 'subscript');
simple('superscript', I.txt('x<sup>2</sup>'), 'superscript');
tagBtn('code', I.txt('&lt;/&gt;', 'font-family:monospace;font-size:11px'), 'code');
tagBtn('mark', I.txt('ab', 'background:#fff176;padding:0 2px'), 'mark');
tagBtn('kbd', I.txt('⌨'), 'kbd');
tagBtn('small', I.txt('<small>a</small>'), 'small');
def('removeFormat', { icon: I.txt('T<sub>x</sub>'), exec: function (e) { e.removeFormat(); } });
def('inlineMenu', {
  label: 'inlineMenu', menu: [['samp', 'samp'], ['var', 'var'], ['cite', 'cite'], ['q', 'q'], ['del', 'del'], ['ins', 'ins'], ['dfn', 'dfn'], ['abbr', 'abbr'], ['time', 'time'], ['bdi', 'bdi'], ['span', 'span'], ['b', 'b'], ['i', 'i'], ['u', 'u'], ['s', 's']]
    .map(function (x) { return { v: x[0], l: '<' + x[1] + '>' }; }),
  apply: function (e, v) {
    if (v === 'abbr') { e.dialog({ title: 'abbr', fields: [{ name: 't', label: 'title' }], onOk: function (o) { e.toggleTag('abbr', { title: o.t }); } }); return; }
    if (v === 'time') { e.dialog({ title: 'time', fields: [{ name: 't', label: 'datetime', placeholder: '2025-01-31' }], onOk: function (o) { e.toggleTag('time', o.t ? { datetime: o.t } : null); } }); return; }
    e.toggleTag(v);
  }
});
/* parágrafo / fonte */
var FORMATS = [['p', 'paragraph'], ['h1', 'heading 1'], ['h2', 'heading 2'], ['h3', 'heading 3'], ['h4', 'heading 4'], ['h5', 'heading 5'], ['h6', 'heading 6'], ['pre', 'preformatted'], ['div', 'normalDiv'], ['address', 'address']];
def('format', {
  label: 'format',
  menu: function (e) {
    return FORMATS.map(function (f) {
      var m = /^h(\d)$/.exec(f[0]), l = m ? e.t('heading') + ' ' + m[1] : e.t(f[1]);
      var sz = m ? 'font-size:' + [0, 1.7, 1.4, 1.2, 1.05, .95, .85][m[1]] + 'em;font-weight:700' : '';
      return { v: f[0], l: l, s: sz };
    });
  },
  current: function (e) { var b = e.ancestor('p,h1,h2,h3,h4,h5,h6,pre,div,address'); return b ? b.localName : ''; },
  caption: function (e) { var b = e.ancestor('p,h1,h2,h3,h4,h5,h6,pre,div,address'); if (!b) return ''; var m = /^h(\d)$/.exec(b.localName); return m ? e.t('heading') + ' ' + m[1] : e.t(FORMATS.filter(function (f) { return f[0] === b.localName; })[0][1]); },
  apply: function (e, v) { e.exec('formatBlock', '<' + v + '>'); }
});
def('fontFamily', {
  label: 'fontFamily',
  menu: function (e) { return (e.opts.fonts || FONTS).map(function (f) { return { v: f, l: f, s: 'font-family:' + f }; }); },
  caption: function (e) { var n = e.startNode(); if (!n) return ''; if (n.nodeType === 3) n = n.parentNode; try { return e.win.getComputedStyle(n).fontFamily.split(',')[0].replace(/["']/g, '').trim(); } catch (x) { return ''; } },
  apply: function (e, v) { e.inlineStyle('font-family', v); }
});
def('fontSize', {
  label: 'fontSize',
  menu: function (e) { return (e.opts.fontSizes || FONT_SIZES).map(function (s) { return { v: s, l: s + '' }; }); },
  caption: function (e) { var n = e.startNode(); if (!n) return ''; if (n.nodeType === 3) n = n.parentNode; try { return Math.round(parseFloat(e.win.getComputedStyle(n).fontSize)) + ''; } catch (x) { return ''; } },
  apply: function (e, v) { e.inlineStyle('font-size', v + 'px'); }
});
def('lineHeight', {
  icon: I.txt('↕'), label: 'lineHeight',
  menu: LINE_HEIGHTS.map(function (v) { return { v: v, l: v }; }).concat([{ v: '', l: '✕' }]),
  apply: function (e, v) { e.blockStyle('line-height', v); }
});
function colorPanel(prop) {
  return function (e, pop, close) {
    var colors = e.opts.colors || COLORS, g = el('div', { 'class': 'gwbm-colors' }, '', pop);
    colors.forEach(function (c) {
      var b = el('button', { type: 'button', 'class': 'gwbm-sw', title: c, style: 'background:' + c }, '', g);
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function () { close(); e.inlineStyle(prop, c); });
    });
    var a = el('button', { type: 'button', 'class': 'gwbm-pbtn' }, esc(e.t('automatic')), pop);
    a.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    a.addEventListener('click', function () { close(); e.inlineStyle(prop, ''); });
    var m = el('button', { type: 'button', 'class': 'gwbm-pbtn' }, esc(e.t('moreColors')), pop);
    m.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    m.addEventListener('click', function () {
      close(); e.dialog({ title: e.t(prop === 'color' ? 'textColor' : 'bgColor'), width: 320, fields: [{ name: 'c', label: 'bg', type: 'color', value: '#000000' }], onOk: function (v) { if (v.c) e.inlineStyle(prop, v.c); } });
    });
  };
}
def('textColor', { icon: I.txt('A', 'border-bottom:3px solid #d33;line-height:1.1'), panel: colorPanel('color') });
def('bgColor', { icon: I.txt('A', 'background:#fff176;padding:0 3px;border-radius:2px'), panel: colorPanel('background-color') });
[['alignLeft', I.left, 'justifyLeft'], ['alignCenter', I.center, 'justifyCenter'], ['alignRight', I.right, 'justifyRight'], ['alignJustify', I.justify, 'justifyFull']].forEach(function (a) { simple(a[0], a[1], a[2]); });
simple('bulletedList', I.ul, 'insertUnorderedList');
simple('numberedList', I.ol, 'insertOrderedList');
def('checklist', { icon: I.txt('☑'), exec: function (e) { e.insertHtml('<ul class="gwbm-todo"><li><input type="checkbox"> ' + e.t('item') + '</li></ul>'); } });
def('definitionList', { icon: I.txt('dl'), exec: function (e) { e.insertHtml('<dl><dt>' + e.t('term') + '</dt><dd>' + e.t('definition') + '</dd></dl>'); } });
def('outdent', { icon: I.outdent, exec: function (e) { e.exec('outdent'); } });
def('indent', { icon: I.indent, exec: function (e) { e.exec('indent'); } });
def('blockquote', {
  icon: I.quote, state: function (e) { return !!e.ancestor('blockquote'); },
  exec: function (e) { var b = e.ancestor('blockquote'); if (b) { e.focus(); e.record(); unwrap(b); e.changed(true); } else e.exec('formatBlock', '<blockquote>'); }
});
def('ltr', { icon: I.txt('LTR', 'font-size:10px'), state: function (e) { var b = e.ancestor('[dir]'); return !!b && b.getAttribute('dir') === 'ltr'; }, exec: function (e) { e.blockAttr('dir', 'ltr'); } });
def('rtl', { icon: I.txt('RTL', 'font-size:10px'), state: function (e) { var b = e.ancestor('[dir]'); return !!b && b.getAttribute('dir') === 'rtl'; }, exec: function (e) { e.blockAttr('dir', 'rtl'); } });
/* inserções */
def('link', { icon: I.link, key: 'Ctrl+K', state: function (e) { return !!e.ancestor('a'); }, exec: function (e) { e.linkDialog(); } });
def('unlink', {
  icon: I.unlink, exec: function (e) {
    e.focus(); e.record(); var a = e.ancestor('a');
    if (a) unwrap(a); else e.idoc.execCommand('unlink');
    e.changed(true); e.refreshSoon();
  }
});
def('anchor', {
  icon: I.anchor, exec: function (e) {
    e.dialog({ title: e.t('anchor'), fields: [{ name: 'n', label: 'anchorName' }], onOk: function (v) { var n = v.n.trim(); if (!n) return false; e.insertHtml('<a id="' + esc(n) + '" name="' + esc(n) + '"></a>'); } });
  }
});
def('image', { icon: I.image, exec: function (e) { e.imageDialog(); } });
def('video', { icon: I.film, exec: function (e) { e.mediaDialog('video'); } });
def('audio', { icon: I.note, exec: function (e) { e.mediaDialog('audio'); } });
def('iframe', { icon: I.frame, exec: function (e) { e.iframeDialog(); } });
def('table', {
  icon: I.table,
  panel: function (e, pop, close) {
    var grid = el('div', { 'class': 'gwbm-grid' }, '', pop), lbl = el('div', { 'class': 'gwbm-gridlbl' }, '0 × 0', pop), cells = [];
    for (var r = 0; r < 8; r++) for (var c = 0; c < 10; c++) (function (r, c) {
      var i = el('i', {}, '', grid); cells.push(i);
      i.addEventListener('mouseenter', function () { cells.forEach(function (x, k) { x.classList.toggle('gwbm-hl', Math.floor(k / 10) <= r && k % 10 <= c); }); lbl.textContent = (c + 1) + ' × ' + (r + 1); });
      i.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      i.addEventListener('click', function () { close(); e.insertHtml(e.tableHtml(r + 1, c + 1, { header: r > 0 })); });
    })(r, c);
    var m = el('button', { type: 'button', 'class': 'gwbm-pbtn' }, esc(e.t('moreOptions')), pop);
    m.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    m.addEventListener('click', function () { close(); e.tableDialog(); });
  }
});
def('hr', { icon: I.hr, exec: function (e) { e.insertHtml('<hr>'); } });
def('pageBreak', { icon: I.txt('↵↵'), exec: function (e) { e.insertHtml('<div style="page-break-after: always; break-after: page;"></div>'); } });
function charPanel(list) {
  return function (e, pop, close) {
    var g = el('div', { 'class': 'gwbm-chars' }, '', pop);
    list(e).forEach(function (ch) {
      var b = el('button', { type: 'button', title: ch }, ch, g);
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function () { close(); e.insertText(ch); });
    });
  };
}
def('specialChar', { icon: I.txt('Ω'), panel: charPanel(function () { return SPECIAL; }) });
def('emoji', { icon: I.txt('☺'), panel: charPanel(function () { return EMOJI; }) });
def('dateTime', {
  icon: I.txt('⏱'),
  menu: function (e) { var n = new Date(); return [{ v: 'd', l: e.t('dateOnly') + ': ' + n.toLocaleDateString() }, { v: 't', l: e.t('timeOnly') + ': ' + n.toLocaleTimeString() }, { v: 'dt', l: e.t('dateTimeBoth') + ': ' + n.toLocaleString() }]; },
  apply: function (e, v) { var n = new Date(); e.insertText(v === 'd' ? n.toLocaleDateString() : v === 't' ? n.toLocaleTimeString() : n.toLocaleString()); }
});
def('insertHtml', {
  icon: I.txt('HTML', 'font-size:10px'), exec: function (e) {
    e.dialog({ title: e.t('insertHtml'), width: 680, fields: [{ name: 'h', label: 'html', type: 'textarea', rows: 14 }], onOk: function (v) { if (v.h.trim()) e.insertHtml(v.h); } });
  }
});
def('insertScript', {
  icon: I.txt('JS', 'font-size:11px'), exec: function (e) {
    e.dialog({
      title: e.t('insertScript'), width: 640,
      fields: [
        { name: 'src', label: 'scriptSrc', placeholder: 'https://...' },
        { name: 'code', label: 'jsCode', type: 'textarea', rows: 10, placeholder: "console.log('GWBMEditor');" },
        { name: 'type', label: 'scriptType', type: 'select', half: true, options: [['', 'text/javascript (padrão)'], ['module', 'module'], ['application/json', 'application/json'], ['application/ld+json', 'application/ld+json']] },
        { name: 'async', label: 'async', type: 'checkbox', half: true }, { name: 'defer', label: 'defer', type: 'checkbox', half: true }
      ],
      onOk: function (v) {
        if (!v.src.trim() && !v.code.trim()) return false;
        var s = '<script' + (v.src.trim() ? ' src="' + esc(v.src.trim()) + '"' : '') + (v.type ? ' type="' + esc(v.type) + '"' : '') + (v.async ? ' async' : '') + (v.defer ? ' defer' : '') + '>' + v.code.replace(/<\/script/gi, '<\\/script') + '</script>';
        e.insertHtml(s);
      }
    });
  }
});
def('insertStyle', {
  icon: I.txt('CSS', 'font-size:10px'), exec: function (e) {
    e.dialog({
      title: e.t('insertStyle'), width: 600, fields: [{ name: 'css', label: 'css', type: 'textarea', rows: 10, placeholder: 'p { color: #c00; }' }, { name: 'media', label: 'media' }],
      onOk: function (v) { if (!v.css.trim()) return false; e.insertHtml('<style' + (v.media ? ' media="' + esc(v.media) + '"' : '') + '>' + v.css.replace(/<\/style/gi, '<\\/style') + '</style>'); }
    });
  }
});
def('insertComment', {
  icon: I.txt('&lt;!--', 'font-size:10px'), exec: function (e) {
    e.dialog({
      title: e.t('insertComment'), fields: [{ name: 'c', label: 'comment', type: 'textarea', rows: 3 }],
      onOk: function (v) { if (!v.c.trim()) return false; e.focus(); var n = e.idoc.createComment(v.c.replace(/--/g, '- -')); e.insertNodeAtCaret(n); }
    });
  }
});
def('insertElement', { icon: I.txt('&lt;/&gt;+', 'font-size:11px'), exec: function (e) { e.insertElementDialog(); } });
def('structure', {
  icon: I.tpl, menu: [['div'], ['section'], ['article'], ['aside'], ['header'], ['footer'], ['nav'], ['main'], ['address'], ['hgroup'], ['figure'], ['details'], ['fieldset'], ['blockquote']]
    .map(function (x) { return { v: x[0], l: '<' + x[0] + '>' }; }),
  apply: function (e, v) {
    var x = null;
    if (v === 'figure') x = { post: '<figcaption>' + e.t('legendTxt') + '</figcaption>' };
    else if (v === 'details') x = { pre: '<summary>' + e.t('summary') + '</summary>' };
    else if (v === 'fieldset') x = { pre: '<legend>' + e.t('legendTxt') + '</legend>' };
    e.structureInsert(v, x);
  }
});
def('formElements', {
  icon: I.txt('☑▭'), menu: FORM_SNIPPETS.map(function (f) { return { v: f[1], l: f[0] }; }),
  apply: function (e, v) { e.insertHtml(v); }
});
def('codeBlock', {
  icon: I.txt('{ }'), exec: function (e) {
    var sel = e.selectedText();
    e.dialog({
      title: e.t('codeBlock'), width: 560, fields: [{ name: 'lang', label: 'language', placeholder: 'javascript, php, html...' }, { name: 'code', label: 'code', type: 'textarea', rows: 10, value: sel }],
      onOk: function (v) { e.insertHtml('<pre><code' + (v.lang ? ' class="language-' + esc(v.lang.trim()) + '"' : '') + '>' + esc(v.code) + '</code></pre>'); }
    });
  }
});
def('templates', {
  icon: I.tpl, menu: function (e) { return (e.opts.templates || defaultTemplates(e)).map(function (t, i) { return { v: i, l: t.title, h: '<b>' + esc(t.title) + '</b>' + (t.description ? '<br><small>' + esc(t.description) + '</small>' : '') }; }); },
  apply: function (e, i) { var t = (e.opts.templates || defaultTemplates(e))[i]; if (t) e.insertHtml(t.html); }
});
function defaultTemplates(e) {
  return [
    { title: e.t('tplBasic'), description: e.t('tplBasicD'), html: '<table style="width:100%;border-collapse:collapse"><tbody><tr><td style="width:50%;vertical-align:top;padding:8px"><p>' + e.t('sampleText') + '</p></td><td style="width:50%;vertical-align:top;padding:8px"><p>' + e.t('sampleText') + '</p></td></tr></tbody></table>' },
    { title: e.t('tplNote'), description: e.t('tplNoteD'), html: '<div style="border-left:4px solid #2563eb;background:#eef4ff;padding:10px 14px;margin:10px 0"><p><b>' + e.t('tplNote') + '</b></p><p>' + e.t('sampleText') + '</p></div>' },
    { title: e.t('tplImg'), description: e.t('tplImgD'), html: '<figure style="text-align:center"><img src="" alt=""><figcaption>' + e.t('legendTxt') + '</figcaption></figure>' }
  ];
}
def('showBlocks', { icon: I.blocks, state: function (e) { return e.ready && e.area.classList.contains('gwbm-blocks'); }, exec: function (e) { e.area.classList.toggle('gwbm-blocks'); e.refresh(); } });
def('elementProps', { icon: I.tools, exec: function (e) { e.elementProps(); } });
def('editHtml', { icon: I.txt('&lt;&gt;', 'font-size:11px'), exec: function (e) { e.editHtml(); } });
/* tabela */
[['tableRowAbove', 'rowAbove', 'R↑'], ['tableRowBelow', 'rowBelow', 'R↓'], ['tableRowDel', 'rowDel', 'R✕'], ['tableColLeft', 'colLeft', 'C←'], ['tableColRight', 'colRight', 'C→'], ['tableColDel', 'colDel', 'C✕'], ['tableMerge', 'merge', '⇄'], ['tableSplit', 'split', '⇅'], ['tableDel', 'del', '✕T']].forEach(function (x) {
  def(x[0], { icon: I.txt(x[2], 'font-size:11px'), exec: function (e) { e.tableOp(x[1]); } });
});
def('tableFormat', { icon: I.table + I.txt('✨', 'font-size:11px'), exec: function (e) { e.tableFormatDialog(); } });
def('tableCell', { icon: I.txt('▤', 'font-size:12px'), exec: function (e) { e.cellDialog(); } });
def('tableProps', { icon: I.table + I.txt('⚙'), exec: function (e) { e.tablePropsDialog(); } });
def('tableTools', {
  icon: I.table + I.txt('⚙', 'font-size:11px'),
  menu: ['tableRowAbove', 'tableRowBelow', 'tableRowDel', 'tableColLeft', 'tableColRight', 'tableColDel', 'tableMerge', 'tableSplit', 'tableCell', 'tableProps', 'tableDel'].map(function (n) { return { v: n, l: n }; }),
  label: 'tableTools',
  apply: function (e, v) { var d = COMMANDS[v]; d.exec(e); }
});
/* labels dos itens de menu de tabela são traduzidos em tempo de abertura */
(function () {
  var base = COMMANDS.tableTools;
  base.menu = function (e) { return ['tableRowAbove', 'tableRowBelow', 'tableRowDel', 'tableColLeft', 'tableColRight', 'tableColDel', 'tableMerge', 'tableSplit', 'tableCell', 'tableProps', 'tableFormat', 'tableDel'].map(function (n) { return { v: n, l: e.t(n) }; }); };
})();

/* ===================================================================== presets de barras */
var TOOLBARS = {
  minimal: [['undo', 'redo'], ['bold', 'italic', 'underline'], ['bulletedList', 'numberedList'], ['link', 'unlink'], ['source']],
  medium: [
    ['source', 'fullscreen'], ['undo', 'redo'], ['format', 'fontFamily', 'fontSize'], ['bold', 'italic', 'underline', 'strike', 'removeFormat'], ['textColor', 'bgColor'],
    ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'], ['bulletedList', 'numberedList', 'outdent', 'indent', 'blockquote'], ['link', 'unlink', 'image', 'table', 'hr', 'specialChar']
  ],
  full: [
    ['source', 'fullscreen', 'preview', 'print', 'templates', 'find'], ['undo', 'redo', 'cut', 'copy', 'pasteText', 'pasteWord', 'selectAll'], ['format', 'fontFamily', 'fontSize', 'lineHeight'],
    '/',
    ['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'code', 'mark', 'kbd', 'small', 'inlineMenu', 'removeFormat'], ['textColor', 'bgColor'],
    ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'], ['bulletedList', 'numberedList', 'checklist', 'definitionList', 'outdent', 'indent', 'blockquote', 'ltr', 'rtl'],
    '/',
    ['link', 'unlink', 'anchor', 'image', 'video', 'audio', 'iframe'], ['table', 'tableTools', 'hr', 'pageBreak', 'specialChar', 'emoji', 'dateTime'],
    ['structure', 'formElements', 'codeBlock', 'insertElement', 'insertHtml', 'insertScript', 'insertStyle', 'insertComment'],
    ['elementProps', 'editHtml', 'showBlocks', 'formatSource', 'clearAll', 'about']
  ]
};

/* ===================================================================== API pública */
var DEFAULTS = {
  toolbar: 'medium', height: 360, width: '100%', minHeight: 0, maxHeight: 0, autoGrow: false, resizable: true, statusbar: true, language: 'auto', theme: 'light',
  pasteMode: 'clean', pasteKeepStyles: /^(text-align|font-weight|font-style|text-decoration|vertical-align)$/i, uploadUrl: null, uploadField: 'upload', uploadHeaders: null, onUpload: null,
  contentCss: [], contentStyle: '', fullPage: false, formatOutput: false, sourcePretty: true, readOnly: false, autofocus: false, tabSpaces: 0, undoLevels: 200,
  fonts: null, fontSizes: null, colors: null, templates: null, buttons: {}, removeButtons: '', extraToolbar: null, strings: null, on: null,
  tableDefaults: { border: 1, cellspacing: 0, cellpadding: 5, width: '100%' }, showGuides: true, startupMode: 'wysiwyg', placeholder: ''
};

function findTextarea(t) {
  if (!t) return null;
  if (isStr(t)) return doc.getElementById(t) || doc.querySelector(t);
  if (t.jquery && t[0]) return t[0];
  return t.nodeType === 1 ? t : null;
}
function replace(target, options) {
  var ta = findTextarea(target);
  if (!ta || ta.tagName !== 'TEXTAREA') { warn('elemento <textarea> não encontrado:', target); return null; }
  if (ta._gwbm) return ta._gwbm;
  var o = extend({}, GWBMEditor.defaults, options || {});
  o.tableDefaults = extend({}, GWBMEditor.defaults.tableDefaults, (options && options.tableDefaults) || {});
  var ed = new Editor(ta, o);
  instances.push(ed);
  return ed;
}
function replaceAll(selector, options) {
  var list = arr(doc.querySelectorAll(selector || 'textarea[data-gwbm]'));
  return list.map(function (t) {
    var o = extend({}, options || {});
    if (t.getAttribute('data-gwbm-toolbar')) o.toolbar = t.getAttribute('data-gwbm-toolbar');
    else if (/^(minimal|medium|full)$/i.test(t.getAttribute('data-gwbm') || '')) o.toolbar = t.getAttribute('data-gwbm');
    if (t.getAttribute('data-gwbm-height')) o.height = t.getAttribute('data-gwbm-height');
    if (t.getAttribute('data-gwbm-options')) { try { extend(o, JSON.parse(t.getAttribute('data-gwbm-options'))); } catch (e) { warn('data-gwbm-options inválido'); } }
    return replace(t, o);
  }).filter(Boolean);
}
var GWBMEditor = {
  version: VERSION, defaults: DEFAULTS, toolbars: TOOLBARS, commands: COMMANDS, strings: STR, icons: I, instances: instances, autoInit: true,
  replace: replace, attach: replace, replaceAll: replaceAll,
  get: function (t) { var ta = findTextarea(t); return ta && ta._gwbm ? ta._gwbm : null; },
  destroyAll: function () { instances.slice().forEach(function (e) { e.destroy(); }); },
  addCommand: function (name, d) { COMMANDS[name] = d; }, addButton: function (name, d) { COMMANDS[name] = d; },
  beautify: pretty
};
TOOLBARS = GWBMEditor.toolbars;
global.GWBMEditor = GWBMEditor;

function boot() { if (GWBMEditor.autoInit && doc.querySelector('textarea[data-gwbm]')) replaceAll('textarea[data-gwbm]'); }
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);

})(window);
