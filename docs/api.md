# API

## Objeto global `GWBMEditor`

| Membro | Descrição |
|--------|-----------|
| `GWBMEditor.version` | Versão da biblioteca (`'1.0.0'`). |
| `GWBMEditor.replace(alvo, opcoes)` | Cria o editor sobre um `<textarea>` e devolve a instância (ou `null` se o alvo não existir). Se já existir um editor no textarea, devolve o existente. Alias: `GWBMEditor.attach`. |
| `GWBMEditor.replaceAll(seletor, opcoes)` | Cria editores para todos os textareas do seletor (padrão `textarea[data-gwbm]`). Devolve um array. |
| `GWBMEditor.get(alvo)` | Devolve a instância associada ao textarea (ou `null`). |
| `GWBMEditor.instances` | Array com as instâncias ativas. |
| `GWBMEditor.destroyAll()` | Destrói todas as instâncias. |
| `GWBMEditor.defaults` | Opções padrão (modificáveis). |
| `GWBMEditor.toolbars` | Presets de barra: `minimal`, `medium`, `full` (modificáveis). |
| `GWBMEditor.commands` | Registro de comandos/botões. |
| `GWBMEditor.addCommand(nome, def)` / `addButton` | Registra um botão global, disponível a todos os editores. |
| `GWBMEditor.strings` | Dicionário de textos `[pt, en]`. |
| `GWBMEditor.icons` | Ícones SVG usados pelos botões nativos (reutilizáveis). |
| `GWBMEditor.beautify(html)` | Devolve o HTML indentado. |
| `GWBMEditor.autoInit` | `true` (padrão): inicia os `textarea[data-gwbm]` ao carregar a página. Defina `false` antes do `DOMContentLoaded` para desligar. |

## Instância

```js
var ed = GWBMEditor.replace('campo');
```

O editor é criado de forma **assíncrona** (o `<iframe>` precisa carregar). `ed.ready` indica quando terminou; o evento `ready` e `ed.whenReady(fn)` ajudam. Chamar `setData`/`setMode` antes disso é seguro (ficam na fila); `getData()` antes disso devolve o valor do textarea.

### Conteúdo

| Método | Descrição |
|--------|-----------|
| `getData()` | HTML atual (fiel ao inserido; scripts e `on*` restaurados). Em `fullPage` devolve o documento completo. Devolve `''` se o editor só tem parágrafos vazios. |
| `setData(html)` | Substitui o conteúdo. Zera o histórico de desfazer. |
| `getText()` | Texto puro (sem tags). |
| `insertHtml(html)` | Insere HTML na posição do cursor/seleção. Aceita scripts, estilos e qualquer elemento. No modo código-fonte insere no textarea. |
| `insertText(texto)` | Insere texto simples (vira texto, não HTML). |
| `insertNodeAtCaret(no)` | Insere um nó DOM (criado com `ed.getDocument().createElement(...)`). |
| `updateElement()` | Copia o HTML para o `<textarea>` original. É automático em eventos e no `submit`; útil se você ler `textarea.value` por conta própria. |
| `selectedHtml()` / `selectedText()` | HTML/texto da seleção. |
| `tableHtml(linhas, colunas, opcoes)` | Gera o HTML de uma tabela (`opcoes`: `header`, `border`, `width`, `cellspacing`, `cellpadding`, `caption`, `cls`). |

### Edição

| Método | Descrição |
|--------|-----------|
| `exec(comando, valor)` | Executa um `document.execCommand` com histórico (`ed.exec('bold')`). Alias: `execCommand`. |
| `inlineStyle(propriedade, valor)` | Aplica CSS inline à seleção: `ed.inlineStyle('color', '#c00')`. Valor `''` remove. |
| `toggleTag(tag, atributos)` | Liga/desliga uma tag inline na seleção: `ed.toggleTag('mark')`. |
| `blockStyle(propriedade, valor)` | Aplica CSS aos blocos selecionados. |
| `undo()` / `redo()` | Desfazer/refazer. |
| `focus()` / `blur()` | Foco. |
| `dialog(config)` | Abre um diálogo (ver abaixo). |

### Estado e interface

| Método | Descrição |
|--------|-----------|
| `getMode()` / `setMode('wysiwyg'\|'source')` / `toggleSource()` | Modo de edição. |
| `fullscreen(bool)` | Tela cheia (sem argumento alterna). |
| `setReadOnly(bool)` | Somente leitura. |
| `setToolbar(spec)` | Troca a barra em tempo real (preset ou array). |
| `resize(largura, altura)` | Redimensiona. |
| `isDirty()` / `resetDirty()` | Indica se houve alteração desde a criação/último reset. |
| `getContainer()` | Elemento raiz do editor. |
| `getDocument()` / `getBody()` | `document` e `<body>` do iframe de edição. |
| `t(chave)` | Texto da interface traduzido. |
| `destroy()` | Remove o editor, devolve o textarea (com o HTML atual) e libera os ouvintes. |

### Eventos

```js
ed.on('change', function (dados, editor) { ... });
ed.off('change', funcao);        // sem função remove todos do evento
```

| Evento | Quando |
|--------|--------|
| `ready` | O editor terminou de carregar. |
| `change` | O conteúdo mudou (digitação, comandos, modo código-fonte…). |
| `selectionChange` | A seleção/cursor mudou. |
| `modeChange` | Alternou visual ⇄ código-fonte (recebe o novo modo). |
| `focus` / `blur` | Foco entrou/saiu da área de edição. |
| `keydown` | Tecla pressionada na área de edição (recebe o `KeyboardEvent`). |
| `error` | Falha tratada (ex.: upload). |
| `destroy` | Antes de destruir. |

Também podem ser registrados na criação: `{ on: { ready: fn, change: fn } }`.

## Diálogos próprios: `ed.dialog(config)`

O mesmo motor usado pelos diálogos internos está disponível:

```js
ed.dialog({
  title: 'Inserir botão',
  width: 420,
  fields: [
    { name: 'texto', label: 'Texto do botão', value: 'Clique' },
    { name: 'cor', label: 'Cor', type: 'color', value: '#2563eb', half: true },
    { name: 'tipo', label: 'Tipo', type: 'select', options: [['button', 'Botão'], ['submit', 'Enviar']], half: true },
    { name: 'dest', label: 'Abrir em nova aba', type: 'checkbox' },
    { type: 'html', html: '<i>Texto explicativo</i>' }
  ],
  onOk: function (v, dlg) {
    if (!v.texto) return false;               // false = mantém aberto
    ed.insertHtml('<button type="' + v.tipo + '" style="background:' + v.cor + '">' + v.texto + '</button>');
  }
});
```

Tipos de campo: `text` (padrão), `number`, `textarea` (`rows`), `select` (`options` como `[valor, rótulo]` ou `{group, options}`), `checkbox`, `color`, `file` (devolve o `File`), `preview` (miniatura de imagem; use `ctl.nome.update(url)`), `paste` e `html` (texto estático). Opções de campo: `label`, `value`, `placeholder`, `half` (metade da largura), `onChange(controle, controles)`.
Opções do diálogo: `title`, `width`, `fields`, `onOk(valores, api)`, `okText`, `buttons` (`[{label, onClick(valores, api)}]`), `modal` (`false` = não bloqueante), `node` (elemento extra), `noRestore`.

## Definição de botão

Usada em `buttons`, `GWBMEditor.addCommand` e `GWBMEditor.commands`.

| Propriedade | Descrição |
|-------------|-----------|
| `title` | Tooltip (texto ou chave de `GWBMEditor.strings`). Padrão: o nome do botão. |
| `icon` | HTML do ícone (texto, emoji ou SVG). |
| `label` | Texto exibido (para menus é o título da caixa). |
| `key` | Atalho informativo exibido no tooltip. |
| `exec(editor, elementoBotao)` | Ação ao clicar. |
| `state(editor)` | Devolve `true` para destacar o botão como ativo. Chamada a cada mudança de seleção. |
| `menu` | Array de itens `{ v, l, s?, h? }` (ou função `(editor) => array`). `v` valor, `l` rótulo, `s` CSS do item, `h` HTML do item. |
| `apply(editor, valor, item)` | Chamada ao escolher um item do menu. |
| `current(editor)` | Valor do item atual do menu (destaque). |
| `caption(editor)` | Texto dinâmico da caixa do menu. |
| `panel(editor, painel, fechar)` | Monta um painel livre (elemento `painel`); chame `fechar()` ao terminar. |
| `always` | `true`: botão permanece ativo no modo código-fonte e em somente leitura. |
| `srcOk` | `true`: ativo no modo código-fonte. |

Veja exemplos em [exemplos.md](exemplos.md) e em [`examples/avancados.html`](../examples/avancados.html).
