# Barras de ferramentas

## Presets

| Preset | Aliases | Grupos |
|--------|---------|--------|
| `minimal` | `basic`, `min`, `simple`, `basico`, `mínimo` | `undo redo` · `bold italic underline` · `bulletedList numberedList` · `link unlink` · `source` |
| `medium` | `standard`, `normal`, `default`, `médio`, `medio` | `source fullscreen` · `undo redo` · `format fontFamily fontSize` · `bold italic underline strike removeFormat` · `textColor bgColor` · `alignLeft alignCenter alignRight alignJustify` · `bulletedList numberedList outdent indent blockquote` · `link unlink image table hr specialChar` |
| `full` | `complete`, `all`, `completo` | todos os botões, em 3 linhas |

O conteúdo exato está em `GWBMEditor.toolbars` (`console.log(GWBMEditor.toolbars.full)`).

## Formatos aceitos em `toolbar`

```js
// 1. nome de preset
toolbar: 'full'

// 2. lista de grupos (cada grupo é um array); '/' quebra a linha
toolbar: [
  ['source', 'undo', 'redo'],
  ['bold', 'italic'],
  '/',
  ['link', 'image', 'table']
]

// 3. lista simples; '|' separa grupos, '/' quebra a linha
toolbar: ['bold', 'italic', '|', 'link', 'source']
```

Nomes desconhecidos são ignorados com um aviso no console (`[GWBMEditor] botão desconhecido: xyz`).

## Ajustando um preset

```js
{
  toolbar: 'full',
  removeButtons: 'emoji,about,clearAll',       // string "a,b,c" ou array
  extraToolbar: [['insertScript', 'meuBotao']] // grupos extras no final
}
```

## Alterar presets para todos os editores

```js
GWBMEditor.toolbars.medium = [['bold', 'italic'], ['link'], ['source']];
```

Somente `minimal`, `medium` e `full` (e seus aliases) são reconhecidos por nome em `toolbar: '...'`. Para reaproveitar uma barra sua, guarde o array e passe-o:

```js
var corporativa = [['bold'], ['image']];
GWBMEditor.replace('x', { toolbar: corporativa });
```

## Trocar a barra em tempo real

```js
editor.setToolbar('minimal');
editor.setToolbar([['bold'], ['source']]);
```

## Botões personalizados

Cada botão é um objeto; veja a lista completa de propriedades em [api.md](api.md#definição-de-botão).

### Botão simples

```js
buttons: {
  hoje: {
    title: 'Inserir data de hoje',
    icon: '📅',
    exec: function (ed) { ed.insertText(new Date().toLocaleDateString()); }
  }
}
// toolbar: [['hoje']]
```

### Botão com estado (liga/desliga)

```js
buttons: {
  destaque: {
    title: 'Destaque', icon: '<b style="background:#ff0">A</b>',
    exec:  function (ed) { ed.toggleTag('mark'); },
    state: function (ed) { return !!ed.ancestor('mark'); }   // ancestor(seletor) → elemento ou null
  }
}
```

### Menu suspenso

```js
buttons: {
  tamanhos: {
    label: 'Tamanho', title: 'Tamanho do texto',
    menu: [{ v: '12px', l: 'Pequeno' }, { v: '18px', l: 'Médio', s: 'font-size:18px' }, { v: '28px', l: 'Grande', s: 'font-size:28px' }],
    apply: function (ed, v) { ed.inlineStyle('font-size', v); }
  }
}
```

### Painel livre

```js
buttons: {
  paleta: {
    icon: '🎨', title: 'Paleta',
    panel: function (ed, painel, fechar) {
      ['#c0392b', '#27ae60', '#2980b9'].forEach(function (cor) {
        var b = document.createElement('button');
        b.type = 'button';
        b.style.cssText = 'width:26px;height:26px;margin:2px;background:' + cor;
        b.onmousedown = function (e) { e.preventDefault(); };   // não rouba a seleção do editor
        b.onclick = function () { fechar(); ed.inlineStyle('color', cor); };
        painel.appendChild(b);
      });
    }
  }
}
```

### Botão global (todas as instâncias)

```js
GWBMEditor.addCommand('assinatura', {
  title: 'Assinatura', icon: '✍',
  exec: function (ed) { ed.insertHtml('<p>Atenciosamente,<br><b>Equipe</b></p>'); }
});
GWBMEditor.toolbars.medium.push(['assinatura']);
```

## Comportamento dos botões

* Botões ficam desabilitados no modo *Código-fonte* e em *somente leitura*, exceto os marcados com `always`/`srcOk`.
* Clicar num botão **não** tira o foco do editor (o `mousedown` é cancelado).
* A barra quebra em várias linhas automaticamente quando falta largura.
