---
name: myt-design-system
description: >
  Traduz a direção criativa da MyTigency (DESIGN.md, myt-art-director) em
  regras visuais concretas e reutilizáveis — tokens, tipografia, cor,
  espaçamento, grid, bordas, componentes e estados de interação. Use ao
  implementar ou ajustar qualquer elemento visual do site: escolher um valor
  de espaçamento/cor/tipografia, reutilizar ou definir um padrão de
  componente (botão, card, header de seção, navegação), ou avaliar se uma
  decisão visual é consistente com o sistema existente. Não cobre direção
  criativa/experiência (myt-art-director) nem motion/animação (myt-motion).
---

# Responsibility

O Art Director (`myt-art-director`) decide o que a experiência deve significar e sentir. Esta skill decide como isso vira regra visual concreta e reutilizável — tokens, tipografia, cor, espaçamento, grid, bordas, padrões de componente. Ela não redefine a tese criativa, não define timing/easing/transformação (isso é `myt-motion`) e não define critérios de verificação (isso é `myt-visual-qa`). Quando uma regra daqui conflitar com `DESIGN.md`, `DESIGN.md` vence.

# Relationship with other skills

- **myt-art-director** → direção e experiência (o porquê). A skill aplica a direção definida pelo Art Director. Se identificar uma inconsistência entre a implementação e a direção, deve sinalizá-la em vez de inventar uma nova direção.
- **myt-motion** (futuro) → timing, easing, transformação, scroll. Esta skill só declara que um estado existe (ex.: hover), nunca a curva de animação.
- **myt-visual-qa** (futuro) → verifica se a implementação expressa a direção. Esta skill é a régua que a QA usa, não a verificação em si.
- Conflito com `DESIGN.md` → `DESIGN.md` vence; reporte o conflito em vez de decidir sozinho.

# Design tokens / visual foundations

O projeto hoje tem **dois conjuntos de tokens que deveriam ser um só**: `:root` em `src/App.css` (sistema geral) e `#landing` em `src/components/Landing.css` (escopo da intro), com os mesmos valores de cor sob nomes diferentes (`--bg`/`--landing-white`, `--ink`/`--landing-black`, `--accent`/`--landing-accent`). `src/index.css` existe mas está vazio. Até isso ser unificado, trate `App.css:root` como fonte de verdade e `Landing.css` como duplicata a resolver, não como uma segunda decisão legítima.

Tokens já em uso (extraídos do código):

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#FAFAF8` | fundo de página |
| `--bg-2` | `#F1F0EA` | fundo secundário (marquee, work) |
| `--panel` | `#FFFFFF` | superfície de card |
| `--ink` | `#0B0B0C` | texto primário |
| `--ink-dim` | `#6B6B64` | texto secundário/legenda |
| `--accent` | `#FF4438` | vermelho reservado (ver Color system) |
| `--line` | `rgba(11,11,12,.12)` | hairline padrão |
| `--line-strong` | `rgba(11,11,12,.28)` | hairline de maior peso (ex.: header ao rolar) |

Não crie um token de cor novo sem antes verificar se um destes já cobre a necessidade.

# Typography

Fontes carregadas (`index.html`): Archivo Black, Inter, JetBrains Mono, Space Grotesk, Syne, Source Code Pro.

Fontes realmente em uso:
- **Archivo Black** (`.display`) — headline da hero, `h2` de section-head, `h3` de service-card/work-info, `cta-band h2`. É a família de afirmação central.
- **JetBrains Mono** (`body`) — fonte de sistema: rótulos, eyebrow, navegação, números, corpo de texto pequeno.
- **Space Grotesk** — usada só em `Landing.css` (`--font-display`) para o nome da marca na intro. Cumpre o mesmo papel de "afirmação central" que Archivo Black cumpre no resto do site, com família diferente — é uma inconsistência a resolver, não a espalhar para novos lugares.
- **Source Code Pro** — usada só dentro do canvas do logo ASCII (`utils/asciiLogo.js`), nunca como fonte CSS selecionável.

Carregadas mas **não usadas em nenhum lugar do código**: Inter (só existe como fallback dentro de `--font-display`) e Syne (carregada no `index.html`, nenhuma referência em `src/`). Não introduza novos usos dessas duas sem necessidade real; se Syne continuar não usada, é candidata a remoção do link de fontes (custo de performance sem função — ver `DESIGN.md` → Performance).

Regra: dois papéis tipográficos, não mais — **afirmação** (display, poucas palavras, grande) e **sistema** (mono, todo o resto). Um novo texto escolhe um dos dois papéis; não introduza uma terceira família porque "combina" com uma seção nova.

# Color system

Cinco cores, cada uma com um papel — não é uma paleta decorativa:
- `--bg` / `--bg-2` / `--panel` — três tons de "papel", não intercambiáveis: `--bg` é o fundo geral, `--bg-2` marca uma subseção (work, marquee), `--panel` é superfície de conteúdo.
- `--ink` / `--ink-dim` — texto primário e secundário. Não introduza um terceiro cinza de texto sem justificar.
- `--accent` (`#FF4438`) — reservado. Segundo `DESIGN.md`, vermelho marca **consequência**, não decoração. O uso atual já segue isso: ponto pulsante do badge, linha de 16px antes do eyebrow, palavra final do headline (acesa só no fim do scroll via `color-mix`), números `.num`, `.tag` de work, hover de link/botão, `::selection`. Continue esse padrão: marcas pequenas, pontuais, ou resposta a interação/estado — nunca fundo, nunca bloco grande, nunca "porque a seção precisa de mais cor".

Regras explícitas:
- **Onde pode aparecer:** eventos de scroll/estado (acento final do headline), marcas semânticas pequenas (número, tag, item ativo), hover/foco de link e botão, seleção de texto.
- **Onde não deve aparecer:** fundo de seção, cards inteiros, texto de corpo padrão, qualquer lugar com mais de um uso simultâneo na mesma viewport sem motivo.
- **Estados de interação:** hover/active podem usar `--accent` como confirmação de ação (`btn.solid:hover`); estado de repouso nunca é vermelho.
- **Informação semântica:** se um estado real de erro/atenção for necessário no futuro, isso é uma decisão nova a documentar aqui antes de reaproveitar `--accent` — não presuma que a cor de marca serve automaticamente como cor de erro de formulário.
- **Acessibilidade:** `--accent` não pode ser o único indicador de significado (ver Accessibility); para texto corrido pequeno (abaixo de ~18px), prefira `--ink` com o vermelho como elemento adjacente (linha, ponto, número), não como cor do próprio texto.

Nunca introduza uma segunda cor de acento, gradiente, glassmorphism ou glow — `DESIGN.md` já rejeita essas linguagens.

# Spacing and layout

Não existe uma escala numérica formal — existe um padrão já consolidado, que deve ser tratado como o token de fato:

- **Gutter lateral padrão:** `clamp(20px, 4vw, 48px)` — usado em header, hero, section, footer e `--container-padding` da intro. Reutilize este valor para qualquer gutter novo; não invente um valor fixo alternativo.
- **Padding vertical de seção:** `110px` (regra `section`).
- **Gaps observados:** `1px` (divisores de `service-grid`, hairline via cor de fundo), `24px` (`work-grid`), `40px` (`footer-grid`), `clamp(28px, 4vw, 52px)` (`hero`).

Ao precisar de um valor novo: primeiro verifique se um dos acima já serve. Se nenhum servir, escolha algo que se relacione com os existentes (múltiplo/fração simples) em vez de um número arbitrário, e registre aqui quando se tornar recorrente — não crie uma escala inteira de uma vez sem uso real que a justifique.

# Grid and composition

- **Hero** — duas colunas (`1.3fr 1fr`), colapsa em `980px`.
- **Services** — três colunas, `gap: 1px` sobre `--line` (hairlines via cor de fundo), colapsa em `860px`.
- **Work** — três colunas, gap `24px`, colapsa em `900px`.
- **Footer** — `1.4fr 1fr 1fr 1fr`, colapsa para duas colunas em `760px`.

Breakpoints em uso: `760px`, `820px`, `860px`, `900px`, `980px` — cinco valores próximos, não uma escala limpa. Não introduza um sexto breakpoint arbitrário; verifique primeiro se um dos cinco já resolve o layout. Consolidar essa lista é uma limpeza válida, mas não decida isso sozinho — registre como pendência se aparecer de novo.

Composição segue a hierarquia de `DESIGN.md` → Visual Language: mensagem central → prova → autoria → ação. Grids sustentam essa leitura; não existem para preencher a página com mais blocos.

# Borders / hairlines / surfaces

- Hairline padrão: `1px solid var(--line)`; versão mais forte `var(--line-strong)` só onde já é usada (header ao rolar).
- **Border-radius:** regra implícita já consistente no código — `50%`/`999px` (pill) só em elementos circulares/compactos (marca do logo, cursor, badge, toggle de idioma, botão de scroll); nenhum card ou botão retangular usa border-radius. Preserve isso: cantos retos em cards/botões retangulares; arredondamento total reservado a controles pequenos e indicadores.
- Superfícies (`--panel`) se diferenciam do fundo só por hairline + eventual sombra sutil já existente (`lang-toggle`, `masthead-badge`) — nunca glassmorphism, blur decorativo ou gradiente.

# Component rules

Só os padrões que já existem ou claramente vão se repetir — não é para virar uma biblioteca nova.

- **Buttons (`.btn`)** — contorno (`1.5px solid var(--ink)`) por padrão; `.btn.solid` é a variante preenchida/primária. Hover troca para preenchido, e `.btn.solid:hover` usa `--accent` — único lugar onde o vermelho preenche uma área, e é estado transitório de hover, não repouso. Use para uma ação clara e única (contato, navegação primária); não use para link de texto corrido nem para múltiplos CTAs concorrendo na mesma tela.
- **Section headers (`.section-head` + `.eyebrow`)** — eyebrow mono/versalete com linha de 16px em `--accent`, seguida de `h2` em Archivo Black. Use no topo de cada seção principal; não duplique dentro de sub-blocos da mesma seção.
- **Labels/tags (`.tag`, `.num`)** — mono, pequeno, `--accent`. Marcam posição/categoria (número do serviço, tag do case); não decoram texto genérico.
- **Cards (`.service-card`, `.work-card`)** — `--panel` + hairline, sem sombra pesada, sem border-radius. `work-card` ganha `border-color: var(--ink)` no hover — não vermelho; hover de card confirma foco, não é o mesmo tipo de evento que hover de botão. Use para itens de uma coleção (serviços, cases); não use um card para conteúdo único (isso é seção, não card).
- **Navigation (`header nav`)** — mono, versalete, item ativo com `underline-offset`, sem cor de destaque além do sublinhado. Não introduza um indicador colorido de item ativo.
- **Proof/authorship** — ainda não existe um padrão de componente real implementado; marquee e work hoje usam placeholders fictícios, já marcados em `DESIGN.md` como pendência a resolver. Quando um padrão real existir (ex.: rótulo "case #0" para o próprio site, assinatura dos dois fundadores), documente aqui — não reaproveite um card de "cliente" genérico sem checar `DESIGN.md` → Proof & Credibility primeiro.

`PrismSection.jsx`/`BackgroundBoxes.jsx` não fazem parte do sistema — componentes órfãos (não importados em `App.jsx`), paleta de cinzas e grid 3D interativo sem relação com nenhuma regra aqui. Não os reative nem os use como referência sem decisão explícita antes.

# Interaction states

- Repouso nunca usa `--accent`.
- Hover/focus podem usar `--accent` (preenchimento de botão) ou `--ink` (borda de card) — a distinção já em uso separa "ação" (vermelho) de "foco simples" (preto/borda); preserve-a em vez de usar vermelho para toda reação.
- Cursor contextual e física de texto (`useContextualCursor`, `useRedPhysics`) são expressões possíveis de "resposta proporcional" (`DESIGN.md`), condicionadas a `pointer: fine`. Nunca aplique um comportamento equivalente incondicionalmente em touch — ver Responsive.
- Nenhum estado interativo pode prometer uma função que não existe (ex.: o toggle PT/EN atual, já sinalizado em `DESIGN.md` como pendência) — um estado "ativo/selecionado" só deve existir se a seleção realmente fizer algo.

# Responsive rules

Mobile não é o desktop encolhido — cada elemento dependente de cursor precisa de um equivalente real, não de ausência silenciosa:
- Cursor contextual, física do `RedText`, glitch de hover: já condicionados a `pointer: fine`/`prefers-reduced-motion` — mantenha essa condição em qualquer uso novo.
- Breakpoints existentes (`760/820/860/900/980px`) já cobrem os pontos de colapso atuais; encaixe um componente novo num deles antes de criar um valor novo.
- Tipografia fluida via `clamp()` já é o padrão (headline, section-head h2, cta-band h2, landing-brand-name) — siga o mesmo padrão para qualquer título de destaque novo, em vez de breakpoints fixos de font-size.
- Todo padrão de componente novo precisa responder: "o que substitui a interação de cursor aqui, em touch?" antes de ser considerado pronto — essa pergunta segue em aberto como hipótese não resolvida em `DESIGN.md`; não presuma uma resposta.

# Accessibility requirements

- Contraste: `--ink` sobre `--bg`/`--panel` já é alto; ao usar `--ink-dim` ou `--accent` sobre fundo claro, confirme contraste suficiente para o tamanho do texto — `--accent` não deve carregar texto corrido pequeno sozinho.
- Nunca comunique estado (ativo, selecionado, erro) só por cor — combine com forma, posição, sublinhado, ícone ou texto, como o nav (`underline-offset`) e o toggle de idioma (fundo preenchido) já fazem.
- Foco: `:focus-visible` perceptível em todo elemento interativo novo; não remova outline sem substituir por indicador equivalente.
- Alvo de toque: componentes compactos (toggle, botão de scroll) mantêm área de toque adequada (atuais em ~44px); não reduza abaixo disso em variações novas.
- `prefers-reduced-motion`: já tratado em vários hooks/CSS (RedText, cursor, reveal, headline). Componente novo com dependência visual de movimento precisa do mesmo tratamento, sem quebrar o layout quando a animação é removida.
- Teclado: navegação, toggle e botões continuam operáveis via teclado porque usam elementos nativos (`<button>`/`<a>`) — não substitua por `<div onClick>`.

# Anti-patterns

- SaaS genérico: gradientes previsíveis, glassmorphism decorativo, glow em cards, blobs.
- Excesso de `border-radius` em superfícies de conteúdo (cards, botões retangulares) — quebra a regra já estabelecida (círculo/pill só em controles compactos).
- Excesso de cards — nem todo conteúdo precisa virar card; uma seção pode ser só texto + hairline.
- Efeito ou interação sem propósito legível — se não passa no Decision Framework do `DESIGN.md`, não passa aqui também.
- Componente criado só para preencher espaço em branco (o vazio, quando genuíno, pode ser a resposta certa — ver `DESIGN.md` → Proof & Credibility).
- Inconsistência tipográfica — uma terceira família de display (como já aconteceu com Space Grotesk na intro) em vez de reutilizar Archivo Black.
- Excesso de cores — qualquer cor fora dos cinco tokens sem justificativa documentada aqui.
- Vermelho como decoração constante (fundo, bloco grande, texto corrido) — deve seguir reservado a evento/consequência.
- Um "design system" tão rígido que impeça a direção artística de romper a régua quando o próprio `DESIGN.md` exigir uma transformação estrutural (ex.: o limiar da intro) — esta skill documenta o padrão comum, não amarra a exceção que a experiência exige.

# Decision framework

Antes de implementar uma decisão visual, pergunte nesta ordem:

1. Isso pertence à linguagem já em uso do MyT, ou introduz algo novo sem necessidade?
2. Existe uma razão funcional ou experiencial (`DESIGN.md`) para essa escolha, ou é só estética?
3. É consistente com `DESIGN.md` — em especial, não usa vermelho como decoração e não introduz gradiente/glassmorphism/blob?
4. Um token, componente ou padrão já existente resolveria isso, em vez de um novo?
5. Isso cria complexidade (nova variável, novo breakpoint, novo componente) sem necessidade real?
6. Funciona em mobile, incluindo o que depende de cursor?
7. É acessível (contraste, foco, teclado, não depende só de cor)?
8. Depende de um efeito para parecer interessante — e continuaria sendo uma boa decisão se o efeito fosse removido?

Se as respostas a 1, 2 ou 8 apontarem para "não" ou "só por estética", reconsidere antes de implementar.

# Implementation guidance

- Ao adicionar cor, tipografia ou espaçamento novo: procure primeiro em `App.css:root` e nesta skill; crie um valor novo só se nenhum existente servir, e registre-o aqui quando se tornar recorrente.
- Ao criar um componente: verifique primeiro se ele se encaixa em um padrão já listado em **Component rules**; se não, documente o padrão novo aqui antes de espalhá-lo por múltiplas seções.
- Ao tocar em `Landing.css`: lembre que ele hoje duplica tokens de `App.css` sob outro nome — prefira migrar para os tokens de `App.css` a criar uma terceira variação.
- Nunca decida sozinho algo que `DESIGN.md` marcou como hipótese não validada (ver `DESIGN.md` → Design Hypotheses); implemente de forma que a hipótese continue testável, não como se já estivesse resolvida.
- Esta skill não define curvas de animação, easing ou timing — isso é do `myt-motion`, quando existir. Aqui só se declara que um estado existe (ex.: hover, active), nunca como ele se move.
