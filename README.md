# GWBMEditor

Editor HTML **WYSIWYG** que transforma qualquer `<textarea>` em um editor completo.
Um único arquivo JavaScript (`GWBMEditor.js`), **sem dependências**, sem pastas auxiliares, sem CSS externo.

> Implementação própria ("clean-room"): o comportamento foi inspirado no que editores HTML clássicos oferecem, mas nenhum código de terceiros foi usado.

- Versão: **1.0.0**
- Navegadores: Chrome/Edge, Firefox e Safari atuais (ES2015+).
- Idiomas da interface: português (pt-BR) e inglês.

---

## Sumário

1. [Recursos](#recursos)
2. [Instalação](#instalação)
3. [Início rápido](#início-rápido)
4. [Barras de ferramentas](#barras-de-ferramentas)
5. [HTML livre, scripts e código-fonte](#html-livre-scripts-e-código-fonte)
6. [Imagens](#imagens)
7. [Tabelas](#tabelas)
8. [Uso com formulários e PHP](#uso-com-formulários-e-php)
9. [Estrutura do repositório](#estrutura-do-repositório)
10. [Documentação detalhada](#documentação-detalhada)
11. [Limitações conhecidas](#limitações-conhecidas)
12. [Autoria](#autoria)
13. [Licença](#licença)

---

## Recursos

| Área | O que existe |
|------|--------------|
| Texto | negrito, itálico, sublinhado, tachado, sub/sobrescrito, `code`, `mark`, `kbd`, `small`, `samp`, `var`, `cite`, `q`, `del`, `ins`, `dfn`, `abbr`, `time`, `bdi`, remover formatação |
| Parágrafo | formatos (p, h1–h6, pre, div, address), fonte, tamanho, espaçamento entre linhas, cor do texto/fundo, alinhamento, listas (marcadores, numerada, tarefas, definição), recuo, citação, direção LTR/RTL |
| Inserções | link (URL, âncora, e-mail, telefone), âncora, imagem (com pré-visualização e upload), vídeo, áudio, iframe (YouTube/Vimeo convertidos), tabela, linha horizontal, quebra de página, caracteres especiais, emoji, data/hora, bloco de código, modelos |
| HTML livre | inserir **qualquer** elemento HTML da especificação (com atributos), HTML bruto, `<script>`, `<style>`, comentários, elementos de formulário (todos os tipos de `input`, `select`, `textarea`, `fieldset`, `datalist`, `progress`, `meter`...), estruturas (`section`, `article`, `details`...) |
| Código-fonte | alternância visual ⇄ código, aceita **qualquer** HTML (inclusive JavaScript), formatação/indentação automática |
| Tabelas | menu flutuante sobre a própria tabela (Tabela / Linha / Coluna / Célula), mesclar/dividir, propriedades e **formatação avançada** (bordas, zebra, cabeçalho, padding…) |
| Imagens | redimensionar arrastando o canto, alinhar, link, pré-visualização no diálogo, arrastar/colar arquivos, upload por `uploadUrl`/`onUpload` |
| Produtividade | desfazer/refazer próprios (cobrem todas as operações), localizar e substituir, colar limpo (Word/Google Docs), colar como texto, contador de palavras/caracteres, caminho de elementos clicável, tela cheia, visualização e impressão |
| Integração | atualiza o `<textarea>` original automaticamente (submit de formulário funciona sem código extra), eventos, API de instância, auto-inicialização por atributo |
| Personalização | barras `minimal` / `medium` / `full`, barras 100 % customizadas, botões próprios (ação, menu ou painel), textos, tema claro/escuro, CSS do conteúdo |

---

## Instalação

Copie `GWBMEditor.js` para o seu projeto e inclua-o:

```html
<script src="/js/GWBMEditor/GWBMEditor.js"></script>
```

Nada mais. O CSS da interface é injetado automaticamente em `<head>` na primeira utilização.

---

## Início rápido

```html
<textarea id="conteudo" name="conteudo"><p>Olá, <b>mundo</b>!</p></textarea>

<script src="/js/GWBMEditor/GWBMEditor.js"></script>
<script>
  var editor = GWBMEditor.replace('conteudo', {
    toolbar: 'full',   // 'minimal' | 'medium' | 'full' | array personalizado
    height: 400
  });

  editor.getData();                 // HTML atual
  editor.setData('<p>Novo</p>');    // substitui o conteúdo
</script>
```

Ao enviar o formulário, o `<textarea>` já contém o HTML final — não é preciso chamar nada.

### Sem JavaScript de inicialização

```html
<textarea name="texto" data-gwbm="medium" data-gwbm-height="250"></textarea>
```

Atributos aceitos: `data-gwbm` (`minimal`, `medium` ou `full`), `data-gwbm-toolbar`, `data-gwbm-height` e `data-gwbm-options` (JSON com qualquer opção).

---

## Barras de ferramentas

Há três presets prontos:

| Preset | Aliases aceitos | Conteúdo |
|--------|-----------------|----------|
| `minimal` | `basic`, `min`, `simple`, `basico`, `mínimo` | desfazer/refazer, negrito/itálico/sublinhado, listas, link, código-fonte |
| `medium` | `standard`, `normal`, `default`, `médio` | o mínimo + código-fonte, tela cheia, **formato, fonte, tamanho**, tachado, remover formatação, cores, alinhamentos, recuo, citação, imagem, tabela, linha horizontal, caracteres especiais |
| `full` | `complete`, `all`, `completo` | **todos** os botões existentes (≈ 85) |

```js
GWBMEditor.replace('x', { toolbar: 'medium' });

// Personalizada: lista de grupos; '/' quebra a linha
GWBMEditor.replace('y', {
  toolbar: [['bold', 'italic'], ['link', 'image', 'table'], '/', ['source']]
});

// Partindo de um preset
GWBMEditor.replace('z', {
  toolbar: 'full',
  removeButtons: 'emoji,about',            // remove
  extraToolbar: [['meuBotao']],            // acrescenta grupo(s)
  buttons: { meuBotao: { title: 'Olá', icon: '👋', exec: function (ed) { ed.insertText('Olá!'); } } }
});

// Alterar um preset para todos os editores da página
GWBMEditor.toolbars.medium.push(['insertScript']);
```

Detalhes completos, inclusive criação de menus e painéis: [docs/toolbars.md](docs/toolbars.md).
Lista de todos os botões: [docs/botoes.md](docs/botoes.md).

---

## HTML livre, scripts e código-fonte

O editor **não filtra** o conteúdo. Você pode digitar ou colar no modo *Código-fonte* (ou usar *Inserir HTML*, *Inserir JavaScript*, *Inserir CSS* e *Inserir elemento*):

```html
<style>.destaque{color:#c00}</style>
<script>console.log('olá');</script>
<form action="/x" method="post"><input name="a"> <button onclick="alert(1)">OK</button></form>
<iframe src="https://example.com"></iframe>
```

Como isso é feito com segurança **durante a edição**:

* `<script>`, `<style>`, `<link>`, `<meta>`, `<iframe>`, `<object>`, `<embed>`, `<noscript>`, `<base>`, `<title>` e `<template>` aparecem como **blocos protegidos** (caixa amarela) no modo visual — não executam e não podem ser quebrados ao editar. *Duplo clique* abre o HTML do bloco para editá-lo.
* Atributos `on*` (`onclick` etc.) são guardados e **não disparam** dentro do editor.
* `getData()` devolve o HTML **exatamente como foi inserido**.
* A área de edição fica dentro de um `<iframe>`; CSS e JS do site não vazam para o conteúdo e vice-versa.
* O botão **Visualizar** abre o resultado em outro `iframe` **sem sandbox**, ou seja, os scripts executam (útil para testar).

> ⚠️ **Segurança no servidor:** o editor é uma ferramenta de edição, não um sanitizador. Se o conteúdo for exibido para *outros* usuários, filtre-o no servidor (ex.: HTMLPurifier) de acordo com o nível de confiança de quem edita. Veja [docs/html-livre-e-seguranca.md](docs/html-livre-e-seguranca.md).

---

## Imagens

* Botão **Imagem** (ou duplo clique numa imagem): URL, arquivo, texto alternativo, título, largura/altura, alinhamento, classe, link e atributos extras.
* **Pré-visualização** da imagem (com dimensões reais) dentro do diálogo, tanto para URL quanto para arquivo escolhido.
* Clique numa imagem para selecioná-la: aparece a moldura e uma alça no canto inferior direito para **redimensionar** (mantém proporção; segure `Shift` para livre).
* Colar imagem da área de transferência e arrastar arquivos para o editor funcionam automaticamente.
* Sem configuração, as imagens são embutidas como `data:` URL. Para enviar ao servidor use `uploadUrl` ou `onUpload` (veja [docs/opcoes.md](docs/opcoes.md#upload-de-imagens) e [examples/upload.php](examples/upload.php)).

---

## Tabelas

Ao clicar dentro de uma tabela aparece, acima dela, um **menu flutuante**:

| Menu | Itens |
|------|-------|
| **Tabela** | propriedades, formatação avançada, parágrafo antes/depois, excluir tabela |
| **Linha** | inserir acima/abaixo, duplicar, excluir |
| **Coluna** | inserir à esquerda/direita, excluir |
| **Célula** | propriedades, mesclar à direita/abaixo, dividir, alternar `td`⇄`th` |
| **⚙ Formatar…** | janela de **formatação avançada** |

A *formatação avançada* permite, em uma única janela: largura/altura, posição na página, bordas (junção, espessura, estilo, cor), espaçamento, cor de fundo, legenda (acima/abaixo), e — para a tabela inteira, linha, coluna ou célula atual — padding, tamanho de fonte, alinhamento horizontal/vertical, cor do texto, fundo e borda; cabeçalho (fundo, cor, negrito) e **linhas alternadas** (zebra). Campos em branco não alteram nada. `Tab` navega entre as células (na última célula cria uma nova linha).

Mais detalhes em [docs/tabelas-e-imagens.md](docs/tabelas-e-imagens.md).

---

## Uso com formulários e PHP

```php
<form method="post">
  <textarea name="texto" id="texto"><?= htmlspecialchars($texto ?? '') ?></textarea>
  <button>Salvar</button>
</form>
<script src="js/GWBMEditor/GWBMEditor.js"></script>
<script>GWBMEditor.replace('texto', { toolbar: 'full' });</script>
```

```php
$html = $_POST['texto'] ?? '';   // HTML do editor (sanitize conforme a sua necessidade)
```

Exemplos prontos: [examples/teste.php](examples/teste.php) (formulário + eco do POST), [examples/teste.html](examples/teste.html) (HTML puro) e [examples/avancados.html](examples/avancados.html) (casos complexos).

---

## Estrutura do repositório

```
GWBMEditor/
├── GWBMEditor.js            ← a biblioteca (único arquivo necessário)
├── README.md
├── CHANGELOG.md
├── docs/
│   ├── opcoes.md            ← todas as opções de configuração
│   ├── api.md               ← métodos estáticos, de instância, eventos
│   ├── toolbars.md          ← barras, presets, botões personalizados
│   ├── botoes.md            ← referência de todos os botões
│   ├── tabelas-e-imagens.md
│   ├── html-livre-e-seguranca.md
│   ├── arquitetura.md       ← funcionamento interno
│   └── exemplos.md          ← receitas para casos complexos
└── examples/
    ├── teste.html           ← teste básico, HTML puro
    ├── teste.php            ← teste com PHP/POST
    ├── avancados.html       ← casos complexos
    └── upload.php           ← endpoint de upload de exemplo
```

## Documentação detalhada

* [Opções](docs/opcoes.md)
* [API (métodos e eventos)](docs/api.md)
* [Barras de ferramentas e botões personalizados](docs/toolbars.md)
* [Referência dos botões](docs/botoes.md)
* [Tabelas e imagens](docs/tabelas-e-imagens.md)
* [HTML livre e segurança](docs/html-livre-e-seguranca.md)
* [Arquitetura interna](docs/arquitetura.md)
* [Receitas e exemplos complexos](docs/exemplos.md)

## Limitações conhecidas

* Baseia-se em `contenteditable` e `document.execCommand`. Este último é marcado como "obsoleto" na especificação, mas continua suportado por todos os navegadores principais; o editor o usa apenas para negrito/itálico/listas/alinhamento etc. As demais operações são feitas diretamente no DOM.
* *Localizar* usa `window.find`, API não padronizada (disponível em Chrome, Edge, Firefox e Safari).
* Operações de coluna em tabelas usam o índice da célula; tabelas com `rowspan`/`colspan` complexos podem exigir ajuste manual no código-fonte.
* No modo `fullPage`, o `<head>` não é editável visualmente (é preservado e seus estilos são aplicados); edite-o pelo código-fonte.
* O editor não sanitiza HTML (de propósito). Faça a sanitização no servidor.

## Autoria

O GWBMEditor foi criado por **Claude** (modelo de IA da Anthropic, Claude Sonnet 5.5), via Claude Code, a pedido de Evandro, que definiu os requisitos, validou os resultados e solicitou as melhorias.

## Licença

Copyright (C) 2026 Evandro.

O GWBMEditor é distribuído sob a **GNU Affero General Public License v3.0 (AGPL-3.0)**. O texto completo está em [LICENSE](LICENSE).

Em resumo (não substitui a leitura da licença):

* Você pode usar, estudar, modificar e redistribuir a biblioteca, inclusive comercialmente.
* Se você distribuir a biblioteca (modificada ou não), deve fornecer o código-fonte sob a mesma licença e manter os avisos de copyright e licença.
* Se você modificar a biblioteca e disponibilizá-la a usuários **por uma rede** (por exemplo, em um site ou sistema web), deve oferecer a esses usuários o código-fonte correspondente da versão modificada — essa é a diferença da AGPL em relação à GPL.
* Trabalhos que incorporem ou sejam derivados da biblioteca ficam sujeitos aos mesmos termos.

Cabeçalho sugerido para arquivos derivados:

```
Copyright (C) 2026 Evandro

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo
sob os termos da GNU Affero General Public License, conforme publicada pela
Free Software Foundation, na versão 3 da Licença.
```
