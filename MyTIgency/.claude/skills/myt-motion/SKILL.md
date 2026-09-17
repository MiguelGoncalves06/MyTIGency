---
name: myt-motion
description: >
  Define o sistema temporal e cinético da MyTigency — quando, por que e como
  algo se move, com que duração, curva e relação entre diferentes camadas de
  motion. Use ao implementar, ajustar ou avaliar qualquer animação, transição,
  scroll, cursor, física ou efeito 3D/WebGL do site — incluindo a transição
  Intro → Hero. Não cobre direção criativa/experiência (myt-art-director) nem
  tokens visuais estáticos (myt-design-system).
---

# Responsibility

Define quando, por que e como algo se move — duração, curva, relação entre camadas de motion, resposta a scroll/cursor/estado, comportamento em diferentes dispositivos e sob `prefers-reduced-motion`. Não define significado/experiência (`myt-art-director`), não define cor/tipografia/espaçamento/componentes estáticos (`myt-design-system`), não verifica se a implementação está correta (`myt-visual-qa`). Conflito com `DESIGN.md` → `DESIGN.md` vence.

# Core Philosophy

Motion no MyT não existe para provar que o site sabe animar. Existe para representar mudança real de estado, relação ou consequência — a mesma régua que `DESIGN.md` aplica ao resto da experiência (Princípio 1: transformação real, não decorativa; Princípio 2: resposta proporcional, não performática).

- Movimento tem causa.
- Movimento comunica estado.
- Movimento cria continuidade.
- Movimento pode surpreender, não confundir.
- Movimento pode ter personalidade, não decoração.
- Movimento reforça a experiência, não compete com ela.

"Parecer Awwwards" não é motivo suficiente para adicionar movimento.

# Motion Hierarchy

Cinco níveis, do maior para o menor. Um motion novo se encaixa em um nível existente antes de inventar um padrão novo.

**Macro motion** — grandes mudanças de estado da experiência. Hoje: a transição Intro → Hero (ver seção própria) é o único exemplo real no código; é o motion mais importante do site.

**Scroll motion** — progressão vinculada ao scroll. Hoje: `--scene-progress` (definido por `SceneContext`) dirige via `clamp()` em CSS as entradas de `nav-right`, `.eyebrow`, cada `.headline-line`, `.hero-copy` e o acento vermelho do headline (`color-mix`); `AsciiStage` usa a mesma progressão para posicionar/escalar o stage 3D.

**Component motion** — local, de um único componente. Hoje: `useReveal` (entrada de section-head/cards via `IntersectionObserver` + classe `.in`), estados de card (`work-card:hover` muda borda), header (`useHeaderScroll` alterna `.scrolled`).

**Interaction motion** — causado diretamente pelo usuário. Hoje: `useContextualCursor` (cursor ring/dot/label), `useRedPhysics` (texto vermelho reage ao mouse), `useAsciiGlitch` (glitch de caracteres no hover do `RedText`), rastro de ponteiro no logo ASCII (`addPointerPoint` em `asciiLogo.js`).

**Physics / ambient motion** — interpolação contínua ou comportamento de física. Hoje: rotação do logo 3D seguindo o mouse com suavização (`rotationSmoothing`), física de gravidade/atração do `RedText`, loops decorativos contínuos (`scrollLeft` do marquee, `ambient-glow-breathe`, `badge-dot-pulse`, `landing-ring-progress`, `landing-chevron-pulse`).

Movimento ambiente é o nível mais fácil de abusar — use com parcimônia. Cada ambient loop hoje tem uma função legível (marquee = ticker de conteúdo real; badge-pulse = indicador de "ao vivo"; ring+chevron = affordance de "role para baixo"); `ambient-glow-breathe` é o mais próximo de existir só para "parecer vivo" — é o primeiro candidato a remover se precisar simplificar, não um padrão a replicar em outras seções.

# Temporal Language

Não existe uma escala formal única — existem **três famílias de suavização coexistindo**, cada uma com um papel. Não invente uma quarta sem necessidade.

**1. Easing declarado (curva explícita, usada uma vez por sistema):**
- `easeInOutCubic` — `t<0.5 ? 4t³ : 1-(-2t+2)³/2` — usado só por `AsciiStage.jsx` para interpolar a posição/escala do stage 3D durante o scroll da intro.
- Smoothstep `t*t*(3-2t)` sobre **450ms fixos (wall-clock, não ligado ao scroll)** — usado só por `asciiLogo.js` para reconectar a rotação ao cursor depois que a Hero estabiliza.
- CSS `cubic-bezier(0.16,1,0.3,1)` — usado pelo `cursor-ring` (300ms, mudanças de tamanho/cor).

**2. Lerp/damping por frame (RAF, coeficiente por tick, não por tempo total):**
- Cursor ring: `+= (alvo - atual) * 0.14` (`useContextualCursor`).
- Rotação do logo 3D: `rotationSmoothing: 0.06` (`SHARED_ASCII_OPTIONS`).
- Reconexão do mouse ao logo: coeficientes `0.12`–`0.2` dependendo da fase (ver Intro → Hero).

**3. CSS transition simples (duração fixa, sem lerp):**
- Reveal genérico: `.reveal` → `opacity .8s ease, transform .8s ease`.
- Hover de botão/link: `.25s ease`.
- Header ao rolar: borda/blur `350ms ease`.
- `RedText`: `transform .12s ease-out` (a física em si não tem RAF — é `mousemove` direto suavizado só por esta transition).

Regra de decisão: **scroll-scrubbed** (posição = função direta do progresso) usa a família 1 (easing declarado); **resposta a estado local** (hover, reveal, header) usa a família 3 (CSS transition simples); **perseguição contínua de um alvo que se move** (cursor, rotação) usa a família 2 (lerp por frame). Não misture: não crie CSS `transition` para algo que precisa perseguir um alvo em movimento contínuo, e não crie um loop RAF para algo que só muda de estado uma vez.

# Causality

Toda animação relevante responde "o que causou isso?". Já mapeado no código:

- Scroll cruza a distância da intro → composição muda (`--scene-progress`, `AsciiStage`).
- Elemento cruza 12% da viewport → `.reveal` recebe `.in` (`useReveal`).
- Cursor entra em elemento com `data-cursor`/tag reconhecida → cursor muda de kind (`useContextualCursor`).
- Cursor se move perto de `RedText` → texto se desloca (`useRedPhysics`).
- Scroll ultrapassa a distância da intro (+10px) → header ganha fundo (`useHeaderScroll`).
- Progresso do scroll chega a ~1 → rotação do logo reconecta ao cursor após 450ms (`asciiLogo.js`).

Evite: movimento sem um desses gatilhos, loops infinitos sem função comunicativa, parallax sem relação com o conteúdo, elementos animando "porque sim" no load, várias entradas disparando ao mesmo tempo sem hierarquia.

# Intro → Hero Transition

A parte mais importante do sistema. É **uma transformação de estado contínua**, não duas animações — e o código atual já trata assim: o mesmo canvas/renderer WebGL é reinterpretado continuamente; não existe corte nem crossfade entre "logo da intro" e "logo da hero".

Estados (mapeados ao código real, via `sceneProgress`/`p`, escrito por `AsciiStage` em `asciiLogo.js:setProgress` e por `SceneContext` em `--scene-progress`/`data-scene`):

| Estado | Condição (`p`) | O que acontece |
|---|---|---|
| `INTRO / FOLLOW` | `p ≤ 0.005` | Stage ocupa a viewport inteira; rotação do logo segue o cursor (lerp 0.2); rastro de ponteiro (glitch) ativo; ruído de fundo em densidade máxima. |
| `TRANSITION / RELEASE` | `p` entra em `>0.005` | `isFrozen=true` é setado; o peso do cursor (`mouseWeight`) decai a 0 (lerp 0.18/frame); a rotação recentraliza (lerp 0.15); o rastro de ponteiro para. |
| `TRAVEL` | `0.005 < p < 0.995` | `AsciiStage` interpola posição/escala do stage (viewport → slot da hero) com `easeInOutCubic` + uma leve contração de ~4.5% no meio (peso físico); em paralelo, a densidade do ruído de fundo dissolve entre `p 0.15→0.70` e a escala do modelo cresce `+35%`. |
| `BLEND` | contínuo dentro de `TRAVEL` | Não é uma etapa separada — é o mesmo canvas mudando de densidade/escala/posição simultaneamente; a app já evita a armadilha de tratar isso como duas animações. |
| `HERO / SETTLE` | `p` cruza `≥0.995` | `isReconnecting=true` dispara; por 450ms fixos, um smoothstep religa `mouseWeight` 0→1 e a rotação alcança o cursor real. |
| `HERO / FOLLOW` | após o settle | Rotação volta a responder ao cursor (lerp 0.12); o rastro de ponteiro **não** reativa (fica travado em `p≤0.005` — ver assimetria abaixo). |

Regras a preservar (já implementadas corretamente, não inventar de novo):
- **Autoridade única por propriedade.** A flag `isFrozen` existe exatamente para impedir que o "seguir cursor" e a transição disputem a mesma rotação ao mesmo tempo. Qualquer novo sistema que precise de duas fontes controlando a mesma propriedade deve usar o mesmo padrão (uma flag de autoridade explícita), nunca deixar dois RAFs escrevendo na mesma propriedade sem coordenação.
- **Cursor-following para antes da trajetória de transição começar a valer**, não depois — `isFrozen` é setado no primeiro frame em que `p` sai de `≤0.005`.
- **A Hero não assume o controle cedo demais** — a reconexão do cursor só começa quando `p` já cruzou `0.995`, nunca antes.
- **O retorno ao comportamento interativo é temporizado (450ms), não instantâneo** — evita um "salto" perceptível assim que o scroll para.
- **Travel é scroll-scrubbed (posição = função direta do progresso); settle/reconexão é wall-clock (450ms fixos)** — esse é o modelo híbrido correto: o deslocamento espacial segue o dedo/scroll do usuário 1:1, mas o "assentar" da interatividade usa uma duração de tempo real, não de scroll. Preserve essa distinção ao estender o sistema.

Inconsistência identificada, não corrigida agora: o **rastro de ponteiro (glitch)** para na transição e nunca reativa na Hero, enquanto a **rotação por cursor** reativa. Pode ser intencional (rastro é um gesto de "descoberta" só da intro), mas não está documentado como decisão — confirmar antes de estender esse comportamento a um novo elemento.

# Scroll / Lenis

Lenis (`SmoothScroll.jsx`, `ReactLenis` com `autoRaf:true`) é a única autoridade de scroll do projeto. Não existe GSAP/ScrollTrigger nem outra lib de scroll — não introduza uma sem necessidade real e sem remover a anterior primeiro.

- `respectReducedMotion: true` já está configurado — o próprio Lenis desliga o smoothing sob `prefers-reduced-motion`.
- Consumidores devem ler o progresso via `useLenis` (como `SceneContext` e `AsciiStage` já fazem), não via listener nativo de `scroll` — `useHeaderScroll.js` é a exceção atual (usa `window.addEventListener('scroll', ...)` + `window.scrollY` direto). É uma inconsistência de arquitetura a observar; não migre isso agora sem necessidade, mas não replique esse padrão em código novo — prefira `useLenis`.
- **Duplicação a observar:** `SceneContext` e `AsciiStage` calculam `progress = scroll / getIntroScrollDistance()` cada um por conta própria, dentro de dois callbacks `useLenis` separados. Funciona porque a fórmula é idêntica nos dois lugares, mas é uma fonte de verdade duplicada — trate `SceneContext`/`--scene-progress` como a fonte canônica de progresso/fase; um sistema novo deve ler dali (ou de `getIntroScrollDistance()` diretamente, como hoje), não recalcular sua própria noção paralela de progresso sem motivo.
- Nenhum outro sistema deve iniciar um segundo RAF de scroll-tracking independente — reutilize `useLenis` ou leia `--scene-progress`.

# Cursor / Pointer

Cursor contextual (`useContextualCursor`) é uma **camada de interação opcional**, nunca um requisito para entender ou operar o site.

- Só ativa com `pointer: fine` **e** sem `prefers-reduced-motion` (`if (!finePointer || reduceMotion) return`) — mantenha essa dupla condição em qualquer extensão.
- Fallback natural já existe: sem essa condição, o cursor do sistema simplesmente permanece visível (nenhum CSS o esconde fora de `.contextual-cursor-active`).
- Kinds definidos hoje: `default`, `link`, `case`, `image`, `hidden` (via `data-cursor` ou tag/classe) — um elemento com necessidade de "cursor" diferente reutiliza um desses kinds ou justifica um novo aqui antes de inventar um por componente. Não permita que cada componente defina sua própria linguagem de cursor.
- Durante a fase `transitioning` do scroll, o cursor é forçado a `default` (`getCursorKind` lê `document.documentElement.dataset.scene`) — outro exemplo do padrão "autoridade única": a transição tem prioridade sobre o sistema de cursor local.
- `RedText`/`useAsciiGlitch` e o rastro de ponteiro do logo ASCII são sistemas de cursor **separados** do cursor contextual — cada um já gated independentemente por `pointer`/`reduced-motion` onde existe (ver Reduced Motion para a exceção do logo ASCII).

# Physics

Física é justificável quando representa continuidade, dá peso ao movimento, ou cria resposta proporcional — não para tornar tudo "orgânico".

- `useRedPhysics` — gravidade (`0.4`) + atração ao cursor (`CURSOR_PULL: 0.18`, `MAX_OFFSET: 14px`) aplicada diretamente no `mousemove`, suavizada só por CSS (`.12s ease-out`), sem RAF. Desliga completamente sob `prefers-reduced-motion`.
- Rotação do logo 3D — lerp por frame (`rotationSmoothing: 0.06`) mais o `mouseWeight`/reconexão de 450ms descritos em Intro → Hero.
- Os valores de física não são arbitrários por elemento: cada um dos dois sistemas acima tem sua própria constante de suavização, mas ambos giram em torno da mesma ideia (o elemento "pesa" algo e reage com atraso proporcional à distância/velocidade do cursor, nunca instantaneamente). Um elemento novo com física deve seguir esse mesmo princípio — atraso proporcional, nunca resposta 1:1 instantânea — e não introduzir uma terceira constante de gravidade/atração desconectada das duas existentes sem justificar o motivo.

# ASCII / 3D / WebGL

Sistema em `utils/asciiLogo.js` (`createAsciiLogoScene`/`AsciiLogoSceneEffect`) + `components/AsciiStage.jsx`. É o motion mais caro do site — WebGL renderiza o modelo `.glb`, um canvas 2D reamostra o resultado a cada frame para desenhar o grid ASCII, e um terceiro canvas offscreen faz a leitura de pixels.

- **Objeto não precisa estar sempre em movimento.** `autoRotateSpeed` está configurado em `0.08` (bem baixo) em `SHARED_ASCII_OPTIONS` — rotação automática mínima; a maior parte do movimento vem de resposta ao cursor/scroll, não de um giro contínuo decorativo. Não aumente a rotação automática "para dar mais vida" sem uma razão ligada à experiência.
- **Resolução/densidade já se adapta ao viewport** (`getAsciiResolution`, baseada em `window.innerWidth * innerHeight`) — reaproveite esse padrão em vez de um valor fixo ao ajustar densidade em outro contexto.
- **Limpeza já é explícita e completa** — `destroy()` cancela o RAF, remove todos os listeners (`pointermove`, `mouseleave`, `resize`), desconecta `ResizeObserver`/`IntersectionObserver`, faz dispose do canvas/renderer/geometria/material. Qualquer sistema novo baseado em Three.js/canvas deve seguir o mesmo padrão de limpeza — nunca deixar um RAF ou listener órfão.
- **Visibilidade já pausa o trabalho** — `IntersectionObserver` (`threshold: 0.05`) marca `isVisible`, e `animate()` retorna cedo (sem renderizar) quando fora da tela. Reaproveite esse padrão para qualquer elemento 3D/canvas caro novo.
- **Gap crítico, não corrigido agora:** este sistema **não tem nenhum tratamento de `prefers-reduced-motion`** — nem `AsciiStage.jsx` (o transform do stage por scroll) nem `asciiLogo.js` (rotação por cursor, rastro de ponteiro, o loop `animate()` inteiro) verificam a preferência do usuário, ao contrário de praticamente todo o resto do projeto (`useRedPhysics`, `useContextualCursor`, `useAsciiGlitch`, CSS de reveals). É o maior débito de acessibilidade/motion do projeto hoje e deve ser tratado como prioridade na próxima implementação que tocar este sistema — não neste momento.
- `useAsciiDonut`/`utils/asciiDonut.js` **não fazem parte do sistema ativo** — não são importados por nenhum componente renderizado (`App.jsx` usa só `AsciiStage`/`useAsciiLogo`). É código órfão de uma iteração anterior. Vale notar, porém, como referência de bom padrão de reduced-motion: ao contrário do sistema ativo, `useAsciiDonut` já tinha um branch reduzido (ângulo fixo em vez de rotação contínua) — esse é o tipo de tratamento que falta no sistema atual.

# Scroll-driven Motion

Scroll funciona como **entrada → causa → transformação**, não "scroll → tudo se move". No código atual isso já é verdade: só a transição Intro→Hero e os reveals de seção respondem a scroll; nada mais na página se move por scroll (sem parallax de fundo, sem camadas paralelas em velocidades diferentes).

- Use `--scene-progress` (ou o padrão de `useLenis` + `getIntroScrollDistance`) para qualquer transformação nova vinculada ao scroll — não crie um segundo sistema de "progress" paralelo sem necessidade (ver duplicação já existente em Scroll/Lenis).
- Prefira `opacity`/`transform` (como os `clamp()` atuais) a propriedades caras de recalcular.
- Evite: parallax sem relação com o conteúdo, múltiplas camadas em velocidades arbitrárias, transformar o scroll em montanha-russa, qualquer movimento que atrapalhe a leitura do texto enquanto ele aparece.
- Hoje não há parallax no projeto — se um for introduzido, precisa de justificativa explícita (ver Decision Framework), não é um padrão a assumir como disponível.

# Reveals

Padrão único hoje: `useReveal` + classe `.reveal`/`.in` — `IntersectionObserver` (threshold 0.12), fade + `translateY(20px→0)` em `.8s ease`, dispara uma vez (`unobserve` após revelar).

- Não há stagger artificial implementado — cada elemento revela conforme cruza o threshold individualmente, o que já produz uma cadência natural sem coordenação forçada. Não adicione delays artificiais de stagger a menos que a hierarquia da seção realmente peça (ex.: uma sequência numerada onde a ordem importa).
- Conteúdo continua compreensível sem motion: os elementos com `.reveal` já existem no DOM antes de revelar (não é conteúdo escondido/injetado só para criar uma entrada) — mantenha esse princípio; não use reveal para esconder informação que deveria estar sempre visível.
- Não crie uma variação de reveal por seção — reveal novo primeiro tenta reaproveitar `.reveal`/`useReveal` antes de propor uma segunda implementação.

# Hover / Microinteractions

- Resposta rápida e proporcional: hovers atuais são `.2s–.3s`, nunca mais que isso.
- Hover não move elementos grandes nem causa layout shift: `.work-card:hover` só muda cor de borda; `.btn:hover` só troca preenchimento/cor — nenhum hover atual altera tamanho ou posição de um bloco de conteúdo.
- Hover comunica mudança de estado (selecionável, ativo, focável), nunca substitui o feedback real de uma ação (ex.: não anime algo como se tivesse "funcionado" sem a ação ter de fato acontecido).
- Focus precisa do equivalente visual e acessível ao hover correspondente — ao adicionar um hover novo, adicione o `:focus-visible` junto, não depois.

# Mobile / Touch

Mobile não é "desktop sem cursor" — cada interação dependente de cursor precisa de uma resposta explícita, não de ausência silenciosa:

- **Desaparece (correto, manter):** cursor contextual, rastro de ponteiro no logo, rotação por cursor do logo — todos gated (`pointer: fine` ou implícito ao evento `pointermove`/`mousemove`) e simplesmente não ativam em touch.
- **Permanece sem alternativa definida (gap a resolver na implementação, não agora):** `useRedPhysics` depende só de `mousemove`/`mouseleave` — em touch, o `RedText` nunca recebe a física de atração/gravidade; ele fica estático no estado de repouso (`translate(0, 0.4px)`), o que é uma degradação aceitável (não quebra, só perde a resposta), mas não foi uma decisão documentada em lugar nenhum até agora — considerar isso resolvido por omissão, não por design.
- **Scroll-driven (Intro→Hero, reveals):** já funcional em touch via Lenis (`touchMultiplier: 1.2`) — não depende de mouse, continua a experiência central do MyT igual à do desktop.
- Toda interação nova que dependa de `mousemove`/`hover`/cursor precisa responder explicitamente: existe equivalente de toque (tap, scroll, gesto) ou a ausência em touch é uma decisão aceitável e documentada? Não deixe essa pergunta em aberto — é uma das hipóteses não resolvidas de `DESIGN.md`.

# Reduced Motion

Política, não um interruptor único. Estado atual verificado no código:

**Já tratado corretamente:**
- Lenis desliga smoothing (`respectReducedMotion: true`).
- `useRedPhysics`, `useContextualCursor`, `useAsciiGlitch` — early return completo, nenhum listener/RAF inicia.
- CSS: bloco `@media (prefers-reduced-motion: reduce)` força `*{animation:none!important;transition:none!important}` e força `opacity:1`/`transform:none` em `.eyebrow`, `.headline-line`, `.hero-copy` — o usuário chega ao **estado final correto**, não a um meio-termo congelado.

**Não tratado — gaps concretos, a resolver em implementação futura, não agora:**
- `AsciiStage.jsx` e `utils/asciiLogo.js` **não verificam `prefers-reduced-motion` em nenhum lugar** — o RAF do WebGL, a rotação por cursor e a interpolação de posição/escala do stage continuam rodando exatamente como no modo normal. É o maior gap do projeto.
- `getIntroScrollDistance()` (`scene/constants.js`) **não tem branch para reduced-motion** — mesmo com todo o resto instantâneo, o usuário ainda precisa rolar uma altura extra de viewport inteira (`INTRO_SCROLL_VH = 1`) de espaço "vazio" antes de chegar à Hero. Reduzir isso (ex.: encurtar ou zerar a distância sob reduced-motion) é a correção estruturalmente correta a aplicar quando este sistema for revisitado.

Modelo a seguir daqui para frente: **motion normal** = experiência completa descrita nas seções acima; **reduced motion** = mesmo conteúdo, mesma hierarquia, mesmos estados finais, sem interpolação nem loop contínuo — nunca conteúdo ausente, nunca um estado "preso no meio".

# Accessibility

- Nenhum significado depende só de motion — estado (ativo, hover, revelado) sempre tem um sinal não-animado equivalente (cor, sublinhado, presença no DOM).
- Teclado: elementos interativos usam `<button>`/`<a>` nativos (`Header`, `Landing`, `Footer`) — motion de hover deve ter o par `:focus-visible`; não crie uma interação só de `mousemove`/hover sem equivalente de foco.
- Toque: alvo mínimo de ~44px já observado nos controles compactos (`scroll-down`, `lang-toggle`) — preserve esse mínimo em qualquer controle animado novo.
- Leitura: nenhuma animação deve atrasar o acesso ao conteúdo além do necessário — reveals não escondem informação essencial, só a entrada dela.
- `prefers-reduced-motion` é obrigatório em qualquer sistema de motion não-trivial novo (RAF contínuo, física, scroll-scrub) desde o primeiro commit — não é um polish a adicionar depois (ver os gaps já existentes acima, que são exatamente o resultado de tratar isso como etapa posterior).

# Performance

Este é um site visualmente ambicioso — performance é parte da qualidade, não uma etapa posterior.

- **RAF único por sistema independente**, nunca dois loops fazendo a mesma leitura de scroll/mouse (ver duplicação de cálculo de progresso em Scroll/Lenis — não adicione um terceiro).
- **Sempre limpar**: todo `addEventListener`/RAF/Observer precisa de contraparte de remoção no cleanup — `asciiLogo.js:destroy()` é o padrão de referência (cancela RAF, remove todos os listeners, desconecta observers, faz dispose de canvas/renderer/geometria/material) a seguir para qualquer sistema novo baseado em canvas/RAF.
- **Pausar fora de tela**: `IntersectionObserver` + early-return no `animate()` (já implementado no logo ASCII) é o padrão para qualquer elemento com custo de render contínuo.
- **Resolução adaptativa ao viewport** (`getAsciiResolution`) em vez de valor fixo, ao lidar com qualquer efeito custoso por pixel.
- Evitar forced synchronous layout: leituras de `getBoundingClientRect()` já concentradas nos callbacks de `useLenis`/resize, não em loops apertados — mantenha esse padrão (ler layout uma vez por frame, não múltiplas vezes).
- `devicePixelRatio` já é limitado (`Math.min(devicePixelRatio, 2)` no canvas ASCII; `renderer.setPixelRatio(1)` no WebGL) — reaproveite esse teto em qualquer canvas/WebGL novo, não assuma DPR nativo em telas de alta densidade.
- Custo de um efeito precisa ser avaliado contra o que ele prova segundo `DESIGN.md` (Performance) — um efeito caro que não expressa transformação real ou resposta proporcional deve ser simplificado, não apenas otimizado.

# Technology Selection

O projeto já resolveu esta pergunta na prática: **quase todo o motion real é feito sem biblioteca de animação** — CSS puro, RAF manual e Three.js para o WebGL. `framer-motion` está no `package.json`, mas seu único uso em todo o código é dentro de `BackgroundBoxes.jsx`, componente órfão não renderizado por nenhuma página — ou seja, na prática, **não faz parte do sistema de motion ativo hoje**. Não é motivo para removê-lo agora, mas também não é motivo para introduzir mais usos dele "porque já está instalado" sem que o caso de uso realmente peça.

Critério: **use a menor ferramenta capaz de expressar o comportamento corretamente**, não a mais popular.

- **CSS** — padrão para: transitions simples, hover, focus, estados locais, reveals. É o que o projeto já usa para quase tudo fora do WebGL.
- **RAF manual (sem lib)** — para: perseguição contínua de um alvo (cursor, rotação), qualquer sistema que precise ler/escrever a cada frame com controle fino (como `asciiLogo.js` já faz). Preferir esse padrão a adicionar uma lib nova para o mesmo fim.
- **Framer Motion** — só quando a necessidade for presença declarativa de componente (entrar/sair do DOM) que RAF manual tornaria verboso; hoje nenhum caso real do projeto pede isso além do componente órfão. Não introduzir só por conveniência.
- **GSAP/ScrollTrigger** — não são dependências do projeto hoje. Só considerar se uma necessidade real de timeline complexa/sequenciada aparecer que CSS + `useLenis` não resolvam razoavelmente; introduzir a lib é uma decisão a justificar explicitamente aqui, não a fazer silenciosamente numa implementação pontual.
- **Three.js/WebGL** — já em uso, justificado (é o próprio logo/identidade); não expandir para elementos 3D novos sem que a experiência realmente dependa disso (`DESIGN.md`: nenhuma técnica específica é identidade obrigatória).
- **Lenis** — autoridade única de scroll; não introduzir uma segunda fonte de scroll-smoothing.

# Anti-Patterns

- Animação só para parecer sofisticado; "estética Awwwards" não é motivo suficiente para adicionar movimento.
- Movimento sem causa identificável.
- Parallax em excesso ou sem relação com o conteúdo.
- Tudo se movendo ao mesmo tempo, sem hierarquia de entrada.
- Loops infinitos decorativos sem função comunicativa (ver `ambient-glow-breathe` como o caso mais próximo do limite hoje).
- Hover exagerado (tamanho, posição, layout shift).
- Spring/física aplicada a tudo, sem relação com continuidade ou peso real.
- Um easing/duração diferente por componente sem motivo — reutilize as três famílias já descritas em Temporal Language.
- Scroll-jacking sem necessidade (a intro atual "trava" 1 viewport de scroll com propósito estrutural claro; não replique esse padrão em outra seção sem a mesma justificativa).
- Cursor como requisito — nenhuma informação ou ação pode depender só de hover/cursor.
- Motion que só existe em mouse, sem equivalente ou decisão documentada para touch.
- Esconder conteúdo só para criar um reveal — reveals animam entrada, não ocultam informação necessária.
- Excesso de stagger artificial onde a ordem não importa.
- Animação competindo com a leitura do copy (texto se movendo enquanto deveria ser lido).
- WebGL/3D adicionado só porque "parece impressionante" — sem função ligada à identidade (`DESIGN.md`).
- Física sem significado (peso/atraso arbitrário, desconectado da lógica de continuidade já estabelecida).
- Transições que causam layout shift em vez de usar `opacity`/`transform`.
- Motion novo sem tratamento de `prefers-reduced-motion` desde o início — os gaps já existentes no logo ASCII são o exemplo do que não repetir.

# Relationship With Other Skills

- **myt-art-director** → define o significado da experiência; `myt-motion` traduz isso em comportamento no tempo, não redefine o significado.
- **myt-design-system** → define a linguagem visual estática (cor, tipografia, espaçamento, componentes); `myt-motion` define como esses elementos se comportam no tempo, não seus valores estáticos.
- **myt-visual-qa** (futuro) → verifica se o motion implementado funciona corretamente em diferentes estados, viewport e condições (incluindo reduced-motion); `myt-motion` é a régua que a QA usa, não a verificação em si.
- **Impeccable** → pode criticar/refinar problemas de UX/UI, mas não substitui a direção já definida por `DESIGN.md`/`myt-art-director`/`myt-motion`.
- **web-design-guidelines** → fornece princípios objetivos de UI/acessibilidade/usabilidade, complementares às regras específicas de motion definidas aqui.
- Nenhuma dessas skills cria uma segunda direção criativa conflitante — `DESIGN.md` é a autoridade final quando houver divergência.

# Decision Framework

Antes de adicionar qualquer motion, responder em ordem:

1. Qual estado está mudando?
2. Qual foi a causa dessa mudança?
3. O usuário consegue entender a relação entre causa e movimento?
4. O movimento reforça a experiência definida em `DESIGN.md`?
5. Ele melhora compreensão, continuidade, interação ou emoção — ou só decora?
6. Ainda faria sentido sem o efeito?
7. Existe uma solução mais simples (CSS transition em vez de RAF, por exemplo)?
8. Funciona sem mouse?
9. Funciona em mobile/touch?
10. Funciona com `prefers-reduced-motion` desde o primeiro commit?
11. Qual é o custo de performance (RAF novo? WebGL novo? listener novo)?
12. Conflita com outro sistema de motion já existente?
13. Existe mais de um sistema tentando controlar a mesma propriedade ao mesmo tempo? Se sim, qual tem autoridade (ver padrão `isFrozen` de Intro → Hero)?
14. O movimento tem início, meio e fim claros?
15. Depois do movimento, o estado final é inequívoco?

Se as respostas não justificarem o movimento, a recomendação é não adicioná-lo.

# Implementation Guidance

- Progresso de scroll: leia de `useLenis`/`getIntroScrollDistance()` (como `SceneContext`/`AsciiStage` já fazem); não inicie um terceiro cálculo paralelo.
- Suavização contínua (perseguir um alvo): RAF manual com lerp, seguindo o padrão de `useContextualCursor`/`asciiLogo.js`, não uma lib nova.
- Estado local (hover, reveal, toggle): CSS transition, seguindo os valores já em uso (`.2s–.3s` para hover, `.8s ease` para reveal).
- Todo sistema com RAF/WebGL/listener novo precisa, desde o primeiro commit: checar `prefers-reduced-motion`, limpar tudo no unmount/destroy, e pausar quando fora da viewport — os três padrões já existem em `asciiLogo.js`/`useAsciiDonut`, copie-os em vez de reinventar.
- Ao estender a transição Intro → Hero especificamente: preserve o modelo de autoridade única (`isFrozen`) e o modelo híbrido scroll-scrub (travel) + wall-clock (settle) descritos acima; não implemente isso agora — apenas ao ser pedido explicitamente.
- Nunca decida sozinho algo que `DESIGN.md` marcou como hipótese não validada (ex.: quantidade adequada de interação, mobile sem camada de cursor) — implemente de forma que a hipótese continue testável.
