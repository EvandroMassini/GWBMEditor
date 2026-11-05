# HTML livre, JavaScript e segurança

## Filosofia

O GWBMEditor **não remove nem reescreve** o que você escreve. O que entra no modo *Código-fonte* (ou por *Inserir HTML/Script/CSS/Elemento*) sai em `getData()` exatamente igual. Isso permite, por exemplo, páginas com `<script>`, `<style>`, formulários, `<iframe>`, atributos `on*`, Web Components e SVG inline.

## Como o conteúdo é protegido durante a edição

A área de edição é um `<iframe>` (documento isolado). Para que o conteúdo não *execute* nem seja corrompido enquanto é editado:

| Elemento / atributo | Tratamento no modo visual |
|---------------------|---------------------------|
| `script`, `style`, `link`, `meta`, `base`, `title`, `noscript`, `template` | Substituídos por um **bloco protegido** (caixa amarela). O HTML original fica guardado em `data-gwbm-raw` (codificado) |
| `iframe`, `object`, `embed` | Bloco protegido com as dimensões do elemento (tracejado azul) |
| Atributos `on*` (`onclick`, `onerror`, `onload`…) | Renomeados para `data-gwbm-on*` durante a edição e restaurados em `getData()` |
| Campos de formulário (`input`, `select`…) | Exibidos normalmente. Como estão dentro do iframe, **não** são enviados junto com o formulário da página hospedeira |
| `form` | Exibido normalmente; o envio é bloqueado no editor |
| Links | Clique não navega |

`<style>` e `<link rel="stylesheet">` protegidos **são aplicados** na área de edição (copiados para o `<head>` do iframe), de modo que você veja o efeito do CSS inserido.

**Duplo clique** em um bloco protegido abre o HTML dele para edição.

### Preservação garantida

* O ciclo `setData(html)` → `getData()` devolve o HTML equivalente ao original (o navegador pode normalizar aspas, fechar tags e reordenar atributos como em qualquer parser HTML).
* Alternar visual ⇄ código-fonte não perde scripts nem atributos.
* Caracteres de largura zero (`U+200B`) usados internamente são removidos na saída.

### Visualização

O botão **Visualizar** abre o HTML em um `<iframe>` **sem `sandbox`** dentro de um diálogo. Scripts do conteúdo **executam** (mesma origem da página). Use-o para testar o JavaScript inserido.

## Segurança — responsabilidade do servidor

⚠️ Um editor no navegador **não é uma barreira de segurança**: qualquer pessoa pode enviar HTML manualmente ao seu servidor. Se o conteúdo for exibido a outros usuários:

1. **Restrinja quem pode usar a barra `full`**, especialmente `insertScript`, `insertHtml`, `insertElement`, `source` e `editHtml`. Para usuários de baixa confiança use `minimal`/`medium` e `removeButtons`.
2. **Sanitize no servidor** (lista de tags/atributos permitidos), por exemplo com HTMLPurifier (PHP), `sanitize-html`/DOMPurify no servidor (Node) ou bibliotecas equivalentes.
3. Sirva conteúdo de usuário em um domínio separado ou com `Content-Security-Policy` adequada.
4. Valide e limite uploads no servidor (tipo real, tamanho, nome aleatório) — veja [`examples/upload.php`](../examples/upload.php).
5. Proteja o endpoint de upload com autenticação e CSRF (`uploadHeaders`).

Exemplo de barra restrita:

```js
GWBMEditor.replace('comentario', {
  toolbar: 'medium',
  removeButtons: 'source,image',
  pasteMode: 'clean'      // remove scripts/atributos de HTML colado
});
```

Observação: `pasteMode: 'clean'` (padrão) já descarta `script`, `style`, `iframe`, `object`, `embed`, atributos `on*`, `class` e `id` do conteúdo **colado**. Isso não impede a inserção via código-fonte.

## Somente leitura / exibição

Para exibir o resultado final a outros usuários, **não** use o editor: imprima o HTML (já sanitizado) na página. Para exibir dentro de um editor travado, use `readOnly: true`.
