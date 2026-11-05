# Tabelas e imagens

## Tabelas

### Inserir

* Botão **Tabela**: passe o mouse na grade (até 10 × 8) e clique. A primeira linha vira cabeçalho (`<th>`) quando a tabela tem 2+ linhas.
* *Mais opções…* abre o diálogo com linhas, colunas, largura, borda, espaçamentos, legenda, classe e linha de cabeçalho.
* Por código: `editor.insertHtml(editor.tableHtml(4, 3, { header: true, width: '100%', border: 1, cellpadding: 6, caption: 'Título' }))`.
* Padrões configuráveis em `tableDefaults`.

### Menu flutuante

Com o cursor dentro de uma tabela, uma pequena barra aparece acima dela (ou abaixo, se não houver espaço):

| Menu | Itens |
|------|-------|
| **Tabela** | Propriedades da tabela · Formatação avançada da tabela · Inserir parágrafo antes · Inserir parágrafo depois · Excluir tabela |
| **Linha** | Inserir acima · Inserir abaixo · Duplicar linha · Excluir linha |
| **Coluna** | Inserir à esquerda · Inserir à direita · Excluir coluna |
| **Célula** | Propriedades da célula · Mesclar com a célula à direita · Mesclar com a célula abaixo · Dividir célula · Alternar `td`/`th` |
| **⚙ Formatar…** | Abre a formatação avançada |

*Inserir parágrafo antes/depois* resolve o caso comum de uma tabela no início/fim do documento sem espaço para digitar.

### Formatação avançada

Janela dividida em três partes. **Campos em branco não alteram nada** (você pode aplicar só o que precisa, várias vezes).

**Tabela**

| Campo | Efeito (CSS inline na `<table>`) |
|-------|----------------------------------|
| Largura / Altura | `width`, `height` (`100%`, `600px`…) |
| Posição na página | `margin-left/right` (esquerda, centro, direita; *Nenhum* remove) |
| Bordas | `border-collapse: collapse` (unidas) ou `separate` |
| Espaçamento entre células | `border-spacing` (e remove o atributo `cellspacing`) |
| Cor de fundo | `background-color` |
| Espessura / Estilo / Cor da borda | `border: <esp>px <estilo> <cor>` da tabela (estilo padrão `solid`, cor `#999999`) |
| Legenda e posição | `<caption>` + `caption-side` (acima/abaixo). Texto vazio remove a legenda |

**Células** — o campo *Aplicar a formatação de célula em* define o alvo: **tabela inteira**, **linha atual**, **coluna atual** ou **somente a célula atual**.

| Campo | CSS aplicado a cada célula-alvo |
|-------|--------------------------------|
| Espaçamento interno | `padding` |
| Tamanho da fonte | `font-size` |
| Alinhamento horizontal/vertical | `text-align`, `vertical-align` |
| Cor de fundo / do texto | `background-color`, `color` |
| Espessura / Estilo / Cor da borda | `border` |
| Limpar estilos anteriores | remove o atributo `style` das células-alvo antes de aplicar |

**Cabeçalho e linhas alternadas**

| Campo | Efeito |
|-------|--------|
| Fundo / cor do texto do cabeçalho | `background-color` / `color` em todos os `<th>` |
| Cabeçalho em negrito | `font-weight: bold` nos `<th>` |
| Cor das linhas ímpares / pares | `background-color` nos `<tr>` do `<tbody>` (efeito "zebra") |

Receita — tabela com visual profissional:
1. Clique numa célula → **⚙ Formatar…**
2. Bordas: *Unidas*; borda `1px` `solid` `#cccccc`; largura `100%`.
3. Células (tabela inteira): padding `8px`, borda `1px solid #dddddd`.
4. Cabeçalho: fundo `#2563eb`, texto `#ffffff`, negrito.
5. Zebra: ímpares `#ffffff`, pares `#f3f6fb`. **OK**.

### Navegação

`Tab` / `Shift+Tab` movem entre células; `Tab` na última célula cria uma linha.

### Limitações

As operações de coluna usam o índice da célula na linha. Em tabelas com `rowspan`/`colspan` complexos as colunas podem desalinhar; ajuste pelo *código-fonte*.

---

## Imagens

### Diálogo

Abra pelo botão **Imagem** ou com **duplo clique** numa imagem (edição).

| Campo | Observação |
|-------|-----------|
| URL | Endereço absoluto ou relativo |
| Enviar arquivo | Escolhe um arquivo local; é enviado via `uploadUrl`/`onUpload` ou embutido (`data:`) |
| **Pré-visualização** | Mostra a imagem e suas dimensões reais (`largura × altura px`) assim que você digita a URL ou escolhe o arquivo; mostra aviso se não for possível carregar |
| Texto alternativo / Título | Atributos `alt` e `title` |
| Largura / Altura | Atributos `width`/`height` (px ou `%`) |
| Alinhamento | Nenhum, esquerda (`float:left`), direita (`float:right`) ou centro (`display:block; margin:auto`) |
| Classe CSS | Atributo `class` |
| Link / Destino | Envolve a imagem em `<a href>` |
| Outros atributos | Um por linha, `nome=valor` (ex.: `loading=lazy`, `data-id=15`). **Não é CSS** |

### Selecionar e redimensionar

* Clique na imagem: aparece uma moldura e uma alça no canto inferior direito.
* Arraste a alça para redimensionar mantendo a proporção; segure `Shift` para redimensionar livremente.
* `Delete`/`Backspace` removem a imagem selecionada.

### Colar e arrastar

* Imagem copiada (print screen, navegador) → `Ctrl+V` no editor.
* Arquivos de imagem arrastados para a área de edição.
* Ambos usam o mesmo fluxo de upload (veja [opcoes.md](opcoes.md#upload-de-imagens)).

---

## O campo "Outros atributos"

Presente nos diálogos de link, imagem, propriedades do elemento e inserir elemento.

* Um atributo por linha, no formato `nome=valor`.
* Aspas em volta do valor são opcionais (`title="Olá"` equivale a `title=Olá`).
* Não é o lugar de escrever CSS: propriedades CSS vão no campo **Estilo** (ex.: `color: red; font-size: 14px`). Para aplicar via atributo, use `style=color:red`.
* Exemplos válidos:

```
data-id=15
aria-label=Descrição do elemento
loading=lazy
onclick=alert('olá')
```

* Atributos que já têm campo próprio (por exemplo `href`, `title`, `class`) não precisam ser repetidos aqui.
* Linhas em branco e nomes inválidos são ignorados.
