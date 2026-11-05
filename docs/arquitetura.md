# Arquitetura interna

Documento para quem vai manter ou estender a biblioteca. Tudo está em `GWBMEditor.js`, dentro de uma IIFE; apenas `window.GWBMEditor` é exposto.

## Organização do arquivo

| Seção | Conteúdo |
|-------|----------|
| Utilitários | `el`, `esc`, `closest`, `unwrap`, `parseAttrLines`, … |
| `STR` | Dicionário de textos `[português, inglês]` |
| `I` | Ícones SVG inline (stroke `currentColor`) |
| `HOST_CSS` / `FRAME_CSS` | CSS da interface (injetado em `<head>`, uma vez) e CSS interno da área de edição (dentro do iframe) |
| Proteção | `protectTree`, `encodeHtml`, `decodeTree`, `serialize`, `pretty` |
| Dados estáticos | Caracteres especiais, emoji, cores, fontes, categorias de tags, snippets de formulário |
| Classe `Editor` | Construção, iframe, seleção, histórico, inserção, eventos, barra, painéis, diálogos, tabelas, imagens, API |
| `COMMANDS` | Definições de todos os botões (`def(nome, {...})`) |
| `TOOLBARS` | Presets `minimal`, `medium`, `full` |
| API pública | `GWBMEditor.replace`, `replaceAll`, `defaults`, auto-inicialização |

## Estrutura de DOM gerada

```
div.gwbm-editor
├── div.gwbm-toolbar           (grupos de botões)
├── div.gwbm-body
│   ├── iframe.gwbm-frame      (área WYSIWYG: <body contenteditable>)
│   ├── textarea.gwbm-source   (modo código-fonte)
│   ├── div.gwbm-tmenu         (menu flutuante de tabela)
│   ├── div.gwbm-selbox        (moldura do elemento selecionado)
│   └── div.gwbm-handle        (alça de redimensionamento)
└── div.gwbm-status            (caminho, contagem, alça de altura)
```

O `<textarea>` original permanece no DOM, oculto (`display:none`), e recebe o HTML sempre que o conteúdo muda, no `blur` e no `submit` do formulário.

## Ciclo de vida

1. `replace()` cria `Editor`, monta a interface e define `iframe.srcdoc`.
2. No `load` do iframe, `initFrame()` liga os eventos, carrega o valor do textarea (`loadData`) e dispara `ready`.
3. Em edição, cada alteração chama `changed()` → grava histórico (imediato ou com *debounce*), sincroniza o textarea, atualiza contadores e emite `change`.
4. `destroy()` sincroniza uma última vez, remove ouvintes/DOM e restaura o textarea.

## Conteúdo: codificação e decodificação

* **Entrada** (`encodeHtml`): o HTML é analisado num `<template>` (inerte). Elementos de `PROTECT` são trocados por `span.gwbm-protected` com o `outerHTML` original em `data-gwbm-raw` (URI-encoded); atributos `on*` viram `data-gwbm-on*`. O resultado é atribuído a `body.innerHTML`.
* **Saída** (`getData` → `decodeTree`): clona o `<body>`, restaura os atributos `on*`, substitui os blocos protegidos pelo HTML original e devolve `innerHTML`. Remove `U+200B`; devolve `''` se só houver parágrafos vazios.
* `fullPage`: o documento é analisado com `DOMParser`; `doctype`, atributos de `<html>`/`<body>` e `<head>` são guardados em `docInfo` e remontados em `getData()`.

## Seleção

* A seleção real vive no iframe. `saveSel()` guarda um `Range` clonado (em `keyup`, `mouseup`, `blur`); `focus()` o restaura. Assim os diálogos (que ficam no documento hospedeiro) não perdem a posição.
* `selectedBlocks()` devolve os blocos-folha tocados pela seleção (usado em alinhamento, `line-height`, `dir`).

## Histórico (desfazer/refazer)

O desfazer nativo é desativado (`beforeinput` + `Ctrl+Z/Y`) porque as operações manuais no DOM o invalidam. Em seu lugar:

* `record()` guarda `{ html: body.innerHTML, sel }` quando o HTML mudou. A seleção é serializada como caminho de índices a partir do `<body>`.
* Digitação é agrupada por *debounce* de 350 ms; comandos gravam antes e depois.
* Elementos de interface (moldura/alça de seleção, menu de tabela) vivem **fora** do iframe justamente para não "sujar" o histórico.

## Estilos inline: o truque do `<font size=7>`

Para aplicar `font-size`, `font-family`, cores e tags inline (`code`, `mark`…) numa seleção que pode cruzar vários blocos, o editor:

1. executa `execCommand('fontSize', false, '7')` com `styleWithCSS` desligado, o que marca exatamente o trecho com `<font size="7">`;
2. troca cada `<font>` por um `<span style="…">` (ou pela tag pedida);
3. remove a mesma propriedade de descendentes e desembrulha `span` sem atributos.

Com seleção recolhida, insere um `span` com `U+200B` para que o texto digitado em seguida herde o estilo.

## Inserção de blocos

`insertFragment` faz a inserção manualmente: se o fragmento contém blocos e o cursor está dentro de `p/h1–h6/pre/address`, divide o bloco no cursor, insere o fragmento no meio e remove blocos vazios resultantes; caso contrário usa `Range.insertNode`. Não usa `execCommand('insertHTML')` (que filtra tags como `form`/`input` em alguns navegadores).

## Barra, menus e painéis

* `COMMANDS[nome]` descreve o botão; `mkBtn` escolhe entre botão simples, menu (`menu`/`apply`) ou painel (`panel`).
* `openPanel` posiciona um `div.gwbm-pop` relativo ao contêiner e fecha-se ao clicar fora (ouvintes no documento e no iframe) ou com `Esc`.
* `refresh()` (via `requestAnimationFrame` em `selectionchange`) atualiza estado ativo, desabilitação, legendas dinâmicas, caminho de elementos e menu de tabela.

## Diálogos

`dialog(cfg)` constrói o overlay a partir de uma lista de campos. Foram escolhidos campos declarativos para que todos os diálogos internos e os criados por usuários compartilhem aparência, teclado (`Enter` confirma, `Esc` cancela) e restauração de foco/seleção.

## Menu flutuante de tabela

`updateTableMenu()` (chamado em `refresh` e `positionHandle`) mostra `div.gwbm-tmenu` sobre a tabela que contém o cursor, calculando a posição com `getBoundingClientRect()` da tabela dentro do iframe. As ações reaproveitam `tableOp(op)` e os diálogos de propriedades/formatação.

## Estendendo

* Novo botão: `GWBMEditor.addCommand(nome, def)`.
* Novo diálogo: `editor.dialog({...})`.
* Novo idioma: `GWBMEditor.strings.chave` é `[pt, en]`; para outros idiomas use `strings` nas opções (por instância).
* Presets: `GWBMEditor.toolbars`.
