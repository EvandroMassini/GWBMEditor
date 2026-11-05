# Referência de botões

Nomes usados em `toolbar`, `removeButtons` e `extraToolbar`.

## Ferramentas

| Nome | Função |
|------|--------|
| `source` | Alterna visual ⇄ código-fonte |
| `fullscreen` | Tela cheia (`Esc` sai) |
| `preview` | Visualiza o resultado **executando os scripts** |
| `print` | Imprime o conteúdo |
| `templates` | Menu de modelos (`templates` nas opções) |
| `find` | Localizar e substituir (janela não bloqueante) |
| `about` | Informações da biblioteca |
| `showBlocks` | Contorna os blocos (p, div, section…) |
| `formatSource` | Indenta o código no modo código-fonte |

## Edição

| Nome | Função |
|------|--------|
| `undo`, `redo` | Desfazer / refazer (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`) |
| `cut`, `copy` | Recortar / copiar |
| `pasteText` | Colar como texto simples (usa a área de transferência; se o navegador bloquear, abre uma caixa para colar) |
| `pasteWord` | Caixa para colar conteúdo do Word/Google Docs/web e limpá-lo |
| `selectAll` | Selecionar tudo |
| `clearAll` | Apagar todo o conteúdo (pede confirmação) |

## Texto

| Nome | Função |
|------|--------|
| `bold`, `italic`, `underline`, `strike` | Estilos básicos (`Ctrl+B/I/U`) |
| `subscript`, `superscript` | Subscrito / sobrescrito |
| `code`, `mark`, `kbd`, `small` | `<code>`, `<mark>`, `<kbd>`, `<small>` (liga/desliga) |
| `inlineMenu` | Menu: `samp var cite q del ins dfn abbr time bdi span b i u s` |
| `removeFormat` | Remove formatação da seleção |
| `format` | Parágrafo, títulos 1–6, pré-formatado, div, endereço |
| `fontFamily` | Fonte (`fonts`) |
| `fontSize` | Tamanho em px (`fontSizes`) |
| `lineHeight` | Espaçamento entre linhas (aplicado ao bloco) |
| `textColor`, `bgColor` | Cor do texto / fundo (paleta, automática, personalizada) |

## Parágrafo

| Nome | Função |
|------|--------|
| `alignLeft`, `alignCenter`, `alignRight`, `alignJustify` | Alinhamento |
| `bulletedList`, `numberedList` | Listas |
| `checklist` | Lista de tarefas com caixas de seleção |
| `definitionList` | `<dl><dt><dd>` |
| `outdent`, `indent` | Recuo (em listas, também com `Tab`/`Shift+Tab`) |
| `blockquote` | Citação (liga/desliga) |
| `ltr`, `rtl` | Atributo `dir` dos blocos |

## Inserções

| Nome | Função |
|------|--------|
| `link`, `unlink` | Links (`Ctrl+K`): URL, âncora, e-mail, telefone, destino, `rel`, classe, id e atributos extras |
| `anchor` | Âncora nomeada (`<a id name>`) |
| `image` | Imagem com pré-visualização, upload, alinhamento, link… |
| `video`, `audio` | `<video>` / `<audio>` por URL |
| `iframe` | `<iframe>`; links do YouTube/Vimeo viram URLs de incorporação |
| `table` | Grade para escolher o tamanho (+ *Mais opções…*) |
| `hr` | Linha horizontal |
| `pageBreak` | Quebra de página para impressão |
| `specialChar`, `emoji` | Painéis de símbolos |
| `dateTime` | Data / hora / ambos |
| `codeBlock` | `<pre><code class="language-…">` |
| `structure` | Envolve a seleção em `div`, `section`, `article`, `aside`, `header`, `footer`, `nav`, `main`, `address`, `hgroup`, `figure`, `details`, `fieldset`, `blockquote` |
| `formElements` | Menu com `form`, todos os tipos de `input`, `textarea`, `select`, `datalist`, botões, `fieldset`, `label`, `output`, `progress`, `meter` |

## HTML livre

| Nome | Função |
|------|--------|
| `insertElement` | Insere **qualquer elemento HTML** (lista completa por categoria + tag personalizada/Web Component), com atributos e conteúdo; pode envolver a seleção |
| `insertHtml` | Insere HTML bruto |
| `insertScript` | Insere `<script>` (inline ou `src`, `type`, `async`, `defer`) |
| `insertStyle` | Insere `<style>` (com `media`) |
| `insertComment` | Insere `<!-- comentário -->` |
| `elementProps` | Propriedades do elemento atual: `id`, classe, estilo, `title`, `lang`, `dir` e outros atributos |
| `editHtml` | Edita o HTML do elemento atual (ou do bloco protegido) |

## Tabela

| Nome | Função |
|------|--------|
| `tableTools` | Menu com todas as operações abaixo |
| `tableProps` | Propriedades da tabela (largura, borda, espaçamento, alinhamento, fundo, classe, legenda, linha de cabeçalho) |
| `tableFormat` | **Formatação avançada** (ver [tabelas-e-imagens.md](tabelas-e-imagens.md)) |
| `tableCell` | Propriedades da célula (tipo, alinhamento, fundo, largura, colspan/rowspan, nowrap) |
| `tableRowAbove`, `tableRowBelow`, `tableRowDel` | Linhas |
| `tableColLeft`, `tableColRight`, `tableColDel` | Colunas |
| `tableMerge`, `tableSplit` | Mesclar com a célula à direita / dividir |
| `tableDel` | Excluir a tabela |

> O menu **flutuante** sobre a tabela (Tabela/Linha/Coluna/Célula/Formatar) é automático e independe da barra de ferramentas.

## Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` | Desfazer / refazer |
| `Ctrl+B`, `Ctrl+I`, `Ctrl+U` | Negrito, itálico, sublinhado |
| `Ctrl+K` | Link |
| `Tab` / `Shift+Tab` | Em tabela: próxima/anterior célula (cria linha ao final). Em lista: aumenta/diminui recuo |
| `Ctrl+Shift+V` | Colar como texto (nativo do navegador) |
| `Esc` | Fecha painéis, diálogos e a tela cheia |
| Duplo clique | Imagem → diálogo; link → diálogo; bloco protegido (script/style/iframe…) → editar HTML; `video`/`audio`/`canvas`/`svg` → editar HTML; campos de formulário/`hr` → propriedades do elemento |
