# Cores do design (paleta original)

Paleta enviada pela equipe de design (arquivo do Figma, outubro de 2026).
As cores são usadas **sem alteração**. O contraste mínimo (WCAG AA) é
garantido pelo **papel** de cada cor, e não por mudar a cor.

## Paleta da designer

| Grupo | Cores |
|---|---|
| Principal | `#FF5C00` · `#FF7518` · `#FFC067` |
| Secundária | `#FFDB00` · `#FCFF40` |
| Terciária | `#00FF5C` · `#20BE36` |
| Fundo | `#FFFFFF` · `#EAD0FC` · `#BEACCB` |
| Contraste | `#000000` · `#242424` · `#5A5A5A` |

Cores que aparecem nas telas, mas não estão na paleta acima (medidas nas imagens):

| Uso no design | Cor |
|---|---|
| Fundo das telas | `#FAF8FF` |
| Links ("Cadastre-se aqui!", "Já possuo uma conta") | `#0155A0` |
| Ações secundárias ("Ouvir relatório", "Marcar como lido") | `#006A63` |
| Texto cinza (datas) | `#737686` |

## Contraste medido (WCAG)

O mínimo é 4,5:1 para texto normal e 3:1 para texto grande (19px em negrito ou 24px) e para ícones/bordas.

| Combinação | Contraste | Resultado |
|---|---|---|
| Branco sobre `#FF5C00` | 3,10 | só texto grande |
| `#FF5C00` sobre branco | 3,10 | só texto grande |
| `#FF5C00` sobre `#FAF8FF` | 2,94 | reprova (até em texto grande) |
| `#242424` sobre `#FF5C00` | 5,01 | passa |
| Branco sobre `#FF7518` | 2,69 | reprova |
| Branco sobre `#20BE36` | 2,48 | reprova |
| `#242424` sobre `#20BE36` | 6,27 | passa |
| `#242424` sobre `#FFC067` | 9,60 | passa |
| Borda `#BEACCB` sobre branco | 2,11 | reprova (UI precisa de 3:1) |
| `#5A5A5A` sobre `#FAF8FF` | 6,51 | passa |
| `#0155A0` sobre `#FAF8FF` | 7,10 | passa |
| Branco sobre `#006A63` | 6,48 | passa |
| `#737686` sobre branco | 4,50 | passa (no limite) |

## Como o sistema usa cada cor (`src/app/globals.css`)

| Variável | Cor | Papel |
|---|---|---|
| `--cor-destaque` | `#FF5C00` | só **fundo** (botão principal, menu ativo), com texto branco **19px negrito**; nunca como cor de texto |
| `--cor-link` | `#0155A0` | links, botões de contorno, item selecionado, anel de foco |
| `--cor-secundaria` | `#006A63` | botão "Ouvir" |
| `--cor-borda` | `#737686` | borda e placeholder dos campos, sempre sobre fundo branco (4,5:1) |
| `--cor-texto` / `--cor-texto-suave` | `#242424` / `#5A5A5A` | texto |
| `--background-secondary` / `--background-primary` | `#FAF8FF` / `#FFFFFF` | fundo das telas / dos cartões |

Erro (`#B91C1C`) e sucesso (`#166534`) continuam os anteriores: a paleta não define essas cores.

## Se for preciso mudar

Se a banca ou o orientador pedirem texto laranja em tamanho normal, o laranja
mais próximo que passa no AA é `#C2410C` (5,18:1 com branco). A decisão
(06/10/2026) foi manter o `#FF5C00` da designer, e por isso a solução foi pelo uso.
