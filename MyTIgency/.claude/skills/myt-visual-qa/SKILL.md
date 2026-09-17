---
name: myt-visual-qa
description: >
  Verifica se o que foi implementado realmente funciona e aparece
  corretamente no navegador — visual, responsivo, interativo, acessível e
  livre de erros de runtime. Use depois de qualquer implementação de UI/motion
  no MyTigency, antes de considerar a tarefa concluída: abre o site num
  navegador real (Playwright quando disponível), testa estados, viewports,
  a transição Intro → Hero, reduced-motion, touch e console/network, e
  produz um relatório classificado por severidade. Não define direção
  criativa (myt-art-director), regras visuais (myt-design-system) ou
  comportamento de motion (myt-motion) — verifica se a implementação as
  respeita.
---

# Responsibility

Validar o produto **renderizado**, não o código-fonte. A pergunta que este skill responde não é "o código parece certo?", é "o que o usuário realmente vê e experiencia bate com o que `DESIGN.md`, `myt-design-system` e `myt-motion` definiram?". Não cria direção criativa nova, não corrige o projeto, não decide trade-offs de design — reporta.

# Relationship with other skills

```
PRODUCT.md → DESIGN.md → myt-art-director → myt-design-system → myt-motion → IMPLEMENTAÇÃO → myt-visual-qa
```

- `PRODUCT.md` define intenção de produto.
- `DESIGN.md` define direção da experiência.
- `myt-art-director` define direção criativa.
- `myt-design-system` define regras visuais reutilizáveis (tokens, cor, tipografia, spacing, componentes, breakpoints).
- `myt-motion` define comportamento temporal (hierarquia de motion, causalidade, a máquina de estados Intro → Hero, reduced-motion, performance).
- `myt-visual-qa` verifica se a implementação respeita tudo isso — não inventa uma quarta direção.

Se a documentação e a implementação divergirem, reporte a divergência (dizendo qual das duas parece estar desatualizada) em vez de silenciosamente decidir qual está certa.

# Principle

> Não validar apenas o que o código pretende fazer. Validar o que o usuário realmente vê e experiencia.

> Visual QA não existe para deixar o site "bonito segundo o gosto do QA". Existe para garantir que a experiência que a MyT decidiu construir é realmente entregue ao usuário.

Qualidade se mede por fidelidade à intenção documentada, funcionamento real, consistência, acessibilidade, responsividade, performance e ausência de regressões — não pela quantidade de efeitos ou complexidade técnica.

# Playwright — availability and setup

O projeto **não tem Playwright instalado hoje** — `package.json` não lista `@playwright/test` nem qualquer runner de teste (só `react`, `react-dom`, `three`, `lenis`, `framer-motion` como dependências; `vite`, `@vitejs/plugin-react`, `oxlint` como dev). Não existe `playwright.config.*`, nem pasta `tests/`/`e2e/`, nem `CLAUDE.md`.

- **Detectar antes de assumir:** checar `package.json` (`@playwright/test`), `playwright.config.{js,ts}` na raiz, e `node_modules/.bin/playwright`. Se qualquer um existir, use a configuração existente em vez de assumir a ausência.
- **Se ausente:** não instalar automaticamente. Explicar ao usuário que a verificação em navegador real depende de Playwright (ou de uma ferramenta de automação de browser equivalente já disponível na sessão) e perguntar antes de adicionar a dependência — instalar é uma decisão do usuário, não deste skill.
- **Quando disponível:** abrir o site com `npm run dev` (script já existe em `package.json`, serve via Vite) e navegar para a URL local; usar um contexto de navegador real (não `curl`/fetch) para capturar o DOM renderizado, executar interações (`hover`, `click`, `scroll`, resize de viewport, emulação de `prefers-reduced-motion` e de `pointer: coarse`/touch) e tirar screenshots.
- Sem Playwright (ou equivalente) disponível na sessão, o QA se limita a análise estática do código contra as regras documentadas e deve dizer explicitamente que não validou o navegador real — nunca afirmar "verificado visualmente" sem ter aberto um navegador de fato.

# Workflow

```
Claude implementa
      ↓
myt-visual-qa inicia a aplicação (npm run dev)
      ↓
abre navegador real
      ↓
desktop → tablet/laptop → mobile
      ↓
estados/interações
      ↓
Intro → Hero
      ↓
reduced motion
      ↓
keyboard/accessibility
      ↓
console/network
      ↓
screenshots
      ↓
relatório classificado
      ↓
Claude corrige
      ↓
QA novamente (escopo do que mudou, não tudo de novo)
```

Prefira ciclos curtos — **Implement → Verify → Report → Fix → Verify** logo após cada mudança relevante — a uma auditoria gigante acumulada depois de muitas alterações. Ao reverificar após uma correção, rode de novo pelo menos a área afetada e a transição Intro → Hero (é fácil quebrar por acoplamento com scroll/cursor mesmo mexendo em algo aparentemente não relacionado).

# Visual QA

Verificar contra `DESIGN.md` e `myt-design-system`, não contra gosto pessoal:

- Composição, hierarquia visual, espaçamento, alinhamento, escala, contraste.
- Tipografia: só duas famílias devem carregar peso visual — Archivo Black (afirmação) e JetBrains Mono (sistema); Space Grotesk aparecendo fora da intro, ou uma terceira família de display nova, é uma violação de `myt-design-system`, não uma variação aceitável.
- Bordas/superfícies: cantos retos em cards/botões retangulares; `border-radius` só em círculo/pill de controles compactos — qualquer card ou botão arredondado é violação objetiva.
- Uso do vermelho (`--accent`): deve aparecer só como marca pontual/evento/hover — vermelho como fundo, bloco grande, ou presente em mais de um elemento simultâneo na mesma viewport sem motivo é violação de `myt-design-system` → Color system, não preferência.
- Overflow, clipping, elementos cortados, sobreposição incorreta, conteúdo saindo da viewport, layout quebrado, inconsistência entre seções, mudança inesperada de tamanho.

Sempre que algo parecer "diferente", classifique antes de reportar:
- **Violação objetiva de regra existente** (ex.: card com border-radius, vermelho como fundo).
- **Bug visual** (overflow, clipping, sobreposição não intencional).
- **Inconsistência** (mesma coisa feita de dois jeitos em duas seções).
- **Possível melhoria artística** (não é erro — é uma sugestão; nunca reportar como bug).

Não transforme este skill em ferramenta de direção artística — uma melhoria possível vai para `OBSERVATION`, nunca para uma severidade de defeito.

# Responsive QA

Não inventar uma escala nova de breakpoints — usar os já documentados em `myt-design-system` (`760px`, `820px`, `860px`, `900px`, `980px`, mais o gutter `clamp(20px,4vw,48px)` fluido).

**Três viewports de referência, no mínimo:**
- **Desktop** — `1440×900` (acima de todos os breakpoints; layout multi-coluna completo).
- **Tablet/laptop** — `900×1200` (entre `860` e `980`; hero já deve ter colapsado para 1 coluna enquanto services/work ainda podem estar em grid múltiplo — bom ponto para pegar colapsos parciais inconsistentes).
- **Mobile portrait** — `375×812` (abaixo de todos os breakpoints; layout mobile completo).

Ao mexer em algo perto de um breakpoint específico, teste também a largura exata do breakpoint ±10–20px (ex.: `759px`/`761px` para o colapso do footer) para confirmar a transição, em vez de confiar só nos três viewports acima.

Procurar especialmente:
- Overflow horizontal, elementos fora da tela, texto quebrando de forma inesperada.
- Header quebrado, grid que não colapsa no breakpoint documentado.
- O stage 3D/ASCII (`#ascii-stage`, canvas WebGL) ultrapassando os limites do container ou não reescalando no resize.
- Botões/áreas clicáveis abaixo do alvo mínimo (~44px, já usado em `scroll-down`/`lang-toggle` — reutilize como referência).
- Espaçamento excessivo/insuficiente, problemas de altura de viewport (`100vh`/`100dvh` — o projeto já usa `100dvh` em `#ascii-stage`, verificar se isso se comporta bem em navegadores mobile com barra de endereço dinâmica).
- Mudança de layout inesperada ao redimensionar (não confundir com a transição Intro→Hero, que muda por scroll, não por resize).

# States & Interactions

Não validar só screenshot estático — executar a interação de fato quando ela for relevante para a experiência:

- Estado inicial, hover, focus, active, scroll, transições de estado (`.reveal`→`.in`, header `.scrolled`).
- Cursor contextual (`useContextualCursor`) — kinds `default/link/case/image/hidden` respondendo ao elemento sob o ponteiro; forçado a `default` durante `data-scene="transitioning"`.
- `RedText`: física de gravidade/atração ao mover o mouse por perto; glitch ASCII no hover.
- Reveals de seção (Services/Work) disparando ao cruzar ~12% da viewport.
- Estados de carregamento, se existirem (hoje não há loading state explícito na UI além do carregamento assíncrono do `.glb`).

# Intro → Hero Transition

O fluxo mais importante do projeto. Use a máquina de estados definida em `myt-motion` como roteiro de verificação — não invente uma própria:

```
INTRO / FOLLOW → TRANSITION / RELEASE → TRAVEL → BLEND → HERO / SETTLE → HERO / FOLLOW
```

**Antes da transição (`sceneProgress ≤ 0.005`):**
- Logo 3D/ASCII responde ao cursor (rotação segue o mouse).
- Rastro de ponteiro (glitch) aparece ao mover o cursor sobre o stage.
- Canvas WebGL/ASCII renderiza sem artefatos (grid deformado, texto sobreposto, tela preta).
- Masthead/badge/scroll-down visíveis e funcionais.

**Durante a transição (`0.005 < sceneProgress < 0.995`):**
- Logo deixa de seguir o cursor assim que o scroll começa (`isFrozen` deve ter assumido controle — a rotação deve recentralizar, não continuar perseguindo o mouse).
- Rastro de ponteiro para (comportamento esperado hoje, documentado em `myt-motion`).
- Stage se desloca de tela cheia até o slot da hero sem salto visual abrupto (a curva é `easeInOutCubic` com uma leve contração no meio — não deve parecer instantâneo nem travado).
- Densidade do ruído de fundo dissolve progressivamente (não deve sumir de uma vez nem permanecer intacta até o fim).
- Nenhum elemento (cursor contextual, `nav-right`, outro motion) parece "brigar" pela mesma propriedade ao mesmo tempo — checar especialmente se o cursor contextual respeita `data-scene="transitioning"` (deve virar `default`).

**Chegada à Hero (`sceneProgress ≥ 0.995`):**
- Logo chega ao estado final esperado, encaixado no `#ascii-logo-hero`, sem flicker nem salto de posição/escala.
- Rotação por cursor **só** retorna depois de ~450ms (o "settle" documentado em `myt-motion`) — se ela reconectar instantaneamente ou nunca reconectar, é regressão em relação ao comportamento documentado.
- Headline revela linha a linha conforme os thresholds de `--scene-progress`; o acento vermelho só "acende" perto do fim (não deve aparecer cedo).
- Estado final permanece estável ao continuar rolando (nada deve "voltar" a se mover fora do esperado).

Respeitar o modelo de autoridade descrito em `myt-motion` (`isFrozen` como flag única de controle) ao avaliar qualquer conflito aparente entre sistemas.

# Scroll & Lenis

- Scroll funciona (não trava, não pula inesperadamente).
- Lenis (`autoRaf:true`) é a única fonte de smoothing — nenhum outro sistema deve parecer competir pelo controle do scroll.
- Todas as seções são alcançáveis por scroll normal e pelos anchors de navegação (`#trabalhos`, `#carreiras`, `#contato`).
- Scroll-driven animations acompanham o progresso corretamente (`--scene-progress` é a fonte canônica, por `myt-motion`) — elementos não devem "sumir" em posições intermediárias específicas.
- Rolar rapidamente até o fim da página não deve quebrar nenhum estado (header, cursor, reveals).
- `useHeaderScroll` usa `window.scrollY` nativo em vez de `useLenis` (inconsistência já documentada em `myt-motion`) — verificar que isso não causa um descompasso visível entre o header e o resto do scroll, mesmo sendo uma implementação diferente das outras.

# Reduced Motion

Obrigatório testar com `prefers-reduced-motion: reduce` emulado no navegador.

Verificar:
- Conteúdo continua acessível, hierarquia permanece.
- CSS já força `opacity:1`/`transform:none` em `.eyebrow`/`.headline-line`/`.hero-copy` — confirmar que isso realmente acontece no navegador (o usuário deve ver o conteúdo final, não uma versão parcialmente esmaecida).
- Loops decorativos contínuos (`ambient-glow-breathe`, `badge-dot-pulse`, `landing-ring-progress`, `landing-chevron-pulse`, marquee) devem parar (bloco `@media (prefers-reduced-motion: reduce)` força `animation:none`).
- Cursor contextual, `useRedPhysics`, `useAsciiGlitch` devem estar completamente desativados (já são gated no código — confirmar no navegador, não só ler o código).
- Reveals não devem impedir acesso ao conteúdo.

**Known debt a não tratar como regressão nova, mas continuar reportando o impacto real:**
- O sistema ASCII/3D (`AsciiStage.jsx` + `utils/asciiLogo.js`) **não tem nenhum tratamento de reduced-motion** — o RAF do WebGL, a rotação por cursor e o transform do stage continuam rodando normalmente. Isso é debt já documentado em `myt-motion`; o QA deve confirmar que ainda é esse o comportamento (e não fingir que foi corrigido) e registrar como `MAJOR`/`known debt`, não inventar como se fosse um bug novo a cada rodada.
- `getIntroScrollDistance()` não reduz a distância artificial de scroll sob reduced-motion — o usuário ainda rola uma viewport inteira de espaço "vazio" antes da Hero, mesmo com tudo estático. Mesmo tratamento: known debt documentado, reportar impacto, não fingir resolvido.

# Touch / Mobile

Testar com viewport touch (`375×812`, emulando `pointer: coarse`/sem hover) além do resize de largura:

- Cursor contextual não deve aparecer (ausência esperada, não bug).
- Rastro de ponteiro no logo não deve aparecer (ausência esperada).
- Interações essenciais (nav, CTA, links) continuam disponíveis e clicáveis sem depender de hover.
- `RedText` fica estático (sem física) em touch — degradação aceitável e já documentada em `myt-motion`, não reportar como bug, mas registrar se algum texto ficar ilegível ou cortado nesse estado estático.
- Navegação e scroll funcionam (Lenis com `touchMultiplier: 1.2`).
- Transição Intro → Hero continua compreensível sem cursor — a viagem do logo (scroll-scrubbed) deve funcionar normalmente; só a parte de "seguir o cursor" está ausente, o que é esperado.

Se uma interação desktop não tiver equivalente direto em touch, verificar se a degradação é aceitável segundo `DESIGN.md` (Responsive) antes de reportar como problema — ausência documentada não é bug.

# Accessibility QA

Não é uma auditoria WCAG completa — foco em problemas reais e importantes:

- Elementos interativos usam semântica real (`<button>`/`<a>`), não `<div onClick>`.
- Foco por teclado funciona; `:focus-visible` perceptível em links, botões, toggle de idioma, botão de scroll.
- Ordem de tabulação razoável (segue a ordem visual/de leitura).
- Contraste suficiente, especialmente `--ink-dim` e `--accent` sobre `--bg`/`--panel` em texto pequeno.
- Nenhum controle depende só de cor para comunicar estado (nav ativo tem sublinhado, toggle de idioma tem fundo preenchido — confirmar que isso se mantém).
- Alvo de interação não é pequeno demais (~44px de referência).
- Reduced motion funciona (ver seção própria).

# Console & Network

**Console:** erros JS, erros React, warnings relevantes, erros de WebGL/Three.js, erros ligados a assets ou fontes. Um site visualmente correto mas com erros de runtime no console é problemático — reportar mesmo que nada pareça quebrado visualmente.

**Network:** verificar carregamento de `hero.png`, `cursor.webp`, `star.gif` (em `src/assets/`), `myt.glb` (em `src/models/`), `favicon.svg`/`icons.svg` (em `public/`), e das fontes do Google Fonts carregadas em `index.html` (Archivo Black, Inter, JetBrains Mono, Space Grotesk, Syne, Source Code Pro). Procurar 404/500, CORS, requests pendurados. Note que `Syne` e `Inter` estão carregadas mas não usadas em CSS nenhum (documentado em `myt-design-system`) — isso não é um erro de rede, é peso morto; não reportar como bug de network, mas pode ser citado como observação de performance se relevante ao contexto da verificação.

# Assets & Typography

- Fontes realmente carregam e os pesos usados existem (Archivo Black display; JetBrains Mono 400/500/700; Space Grotesk 500/700 só na intro; Source Code Pro só dentro do canvas do logo ASCII, nunca como texto CSS real).
- Nenhum fallback inesperado (texto renderizando em serif genérica por falha de carregamento).
- `myt.glb` carrega e o modelo aparece (não um placeholder vazio/erro no canvas).
- Elementos não mudam de tamanho de forma perceptível depois que uma fonte termina de carregar (ver Layout Shift).

# Layout Shift

Diferenciar shift intencional (a transição Intro→Hero, os reveals) de shift acidental:
- Conteúdo pulando durante carregamento inicial (antes das fontes/assets carregarem).
- Fonte alterando dimensões de texto de forma perceptível ao trocar do fallback para a fonte real.
- Canvas/stage 3D mudando de tamanho fora do fluxo esperado da transição.
- Header mudando de posição fora do toggle `.scrolled` esperado.
- Qualquer elemento aparecendo e empurrando conteúdo abaixo dele sem ser parte de um reveal documentado.

# Performance Smoke Test

Não é auditoria completa de performance — só detectar problemas óbvios, respeitando o que `myt-motion` já define como arquitetura correta:

- Mais de um RAF fazendo o mesmo trabalho (ex.: dois sistemas lendo scroll/mouse de forma redundante além da duplicação já conhecida entre `SceneContext`/`AsciiStage`).
- Loop continuando a rodar com o elemento fora da viewport (o logo ASCII já pausa via `IntersectionObserver`/`isVisible` — confirmar que continua pausando).
- WebGL permanecendo ativo/consumindo GPU fora da tela.
- Listener não removido ao desmontar (checar no DevTools se listeners se acumulam após navegação/resize repetidos).
- Erros ou travamentos durante resize da janela.
- FPS visivelmente baixo durante a transição Intro→Hero ou no hover do cursor contextual.
- Qualquer recurso (imagem, `.glb`) desproporcionalmente pesado para o que exibe.

# Screenshots

Cada screenshot responde a uma pergunta específica, não é decoração do relatório. Conjunto mínimo de referência:

- Desktop (`1440×900`) — estado inicial da intro está correto?
- Desktop — Hero após a transição completa está correto?
- Tablet/laptop (`900×1200`) — hero colapsou corretamente para 1 coluna?
- Mobile (`375×812`) — layout mobile completo está correto, sem overflow?
- Transição — um frame em progresso intermediário (`~50%`) mostra o stage a meio caminho sem artefato?
- Reduced motion — o mesmo viewport desktop com a preferência ativada: conteúdo chegou ao estado final sem depender de movimento?

Não depender de comparação pixel-perfect absoluta — pequenas diferenças (antialiasing, fontes, timing de captura do frame 3D) são aceitáveis. O foco é identificar problema real de experiência, não desvio de pixel.

# Visual Regression

Se o projeto já tiver infraestrutura de visual regression, use-a. Hoje não tem nenhuma — não crie uma infraestrutura complexa (snapshot testing automatizado, CI de regressão) sem que o usuário peça explicitamente.

Quando screenshots de referência forem usados de forma manual/controlada:
- Nunca atualizar uma baseline automaticamente para esconder uma regressão.
- Qualquer atualização de baseline é uma decisão intencional do usuário, relatada, não silenciosa.

# Report

Classificar cada problema por severidade:

- **BLOCKER** — impede uso ou quebra completamente a experiência.
- **CRITICAL** — problema grave numa parte importante da experiência (ex.: transição Intro→Hero quebrada, CTA principal inacessível).
- **MAJOR** — problema relevante que deve ser corrigido (ex.: overflow horizontal em um breakpoint, contraste insuficiente).
- **MINOR** — problema visual/interativo pequeno.
- **OBSERVATION** — observação ou possível melhoria, sem afirmar que é bug.

E por natureza:

- **Objective failure** — quebra uma regra documentada ou uma expectativa funcional clara.
- **Design inconsistency** — mesma coisa resolvida de dois jeitos diferentes.
- **Possible refinement** — sugestão de melhoria, não defeito.
- **Known debt** — já documentado em `DESIGN.md`/`myt-motion` (ver próxima seção); reportar impacto real sem tratar como regressão nova.

Cada item do relatório inclui: severidade, natureza, viewport/estado em que ocorre, como reproduzir, e evidência (screenshot/console log) quando aplicável.

# Known Debt

Itens já documentados em `DESIGN.md`/`myt-motion` — não reabrir como bug novo a cada rodada, mas continuar confirmando que ainda existem e reportando quando impactam diretamente a experiência testada:

- ASCII/3D (`AsciiStage.jsx`/`utils/asciiLogo.js`) sem tratamento de `prefers-reduced-motion`.
- `getIntroScrollDistance()` mantém distância artificial de scroll sob reduced-motion.
- Duplicação do cálculo de `progress` entre `SceneContext` e `AsciiStage`.
- `useHeaderScroll` usa `window.scrollY` nativo em vez de `useLenis`.
- Toggle PT/EN presente na UI mas não funcional.
- Footer assinado "RUNTIME." enquanto o resto do site usa "MyTigency".
- Marquee/placeholders de cliente (`[CLIENTE A]`...) que podem sugerir clientela real inexistente.
- `PrismSection.jsx`/`BackgroundBoxes.jsx` (e `useAsciiDonut`/`utils/asciiDonut.js`) são componentes/hooks órfãos, não renderizados por nenhuma página.

Se qualquer um desses itens for corrigido em uma implementação futura, o QA deve atualizar seu entendimento (não continuar reportando como debt depois de resolvido) e verificar no navegador que a correção realmente resolveu o problema, não só que o código mudou.

# Decision Framework

Antes de registrar um problema, perguntar:

1. É realmente visível para o usuário?
2. É reproduzível?
3. É violação de uma regra existente (`DESIGN.md`/`myt-design-system`/`myt-motion`)?
4. É uma quebra funcional?
5. É uma regressão (funcionava antes)?
6. É apenas preferência estética?
7. Afeta desktop, mobile, ou ambos?
8. Afeta touch?
9. Afeta teclado?
10. Afeta reduced motion?
11. Afeta performance?
12. Existe uma causa clara?
13. Existe conflito entre sistemas de autoridade (ver modelo `isFrozen` em `myt-motion`)?
14. O problema desaparece em outro viewport?
15. Está relacionado a carregamento de assets/fontes?
16. Já é known debt documentado?
17. Existe uma correção simples e óbvia?
18. A correção preservaria a direção definida em `DESIGN.md`?

# Rules

- Não confiar apenas no código — verificar no navegador real sempre que possível.
- Não inventar problemas nem transformar preferência pessoal em bug.
- Não transformar diferença visual pequena em regressão.
- Não ignorar problema funcional porque a interface é bonita.
- Não atualizar baseline de screenshot automaticamente.
- Não corrigir o projeto durante o QA — reportar, não implementar.
- Não alterar `DESIGN.md`, `myt-design-system` ou `myt-motion` para fazer a implementação parecer correta, nem para acomodar um bug.
- Não instalar dependências automaticamente (incluindo Playwright) — perguntar primeiro.
- Não criar infraestrutura de teste desnecessariamente complexa.
- Preferir evidência reproduzível a impressão subjetiva.
- Sempre informar viewport/estado ao reportar um problema visual.
- Sempre diferenciar severidade e natureza (objective failure / design inconsistency / possible refinement / known debt).
- Quando possível, indicar exatamente como reproduzir o problema.
