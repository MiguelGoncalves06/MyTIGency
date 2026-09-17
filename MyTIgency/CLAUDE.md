# CLAUDE.md

Este arquivo orquestra **como trabalhar** neste projeto — não descreve o design da MyTigency. "Como é a experiência" vive em `DESIGN.md` e nos skills `myt-*`; este arquivo só diz quando consultar cada um e como conduzir uma tarefa do início ao fim.

## Hierarquia de autoridade

```
PRODUCT.md          → propósito, público, posicionamento, restrições reais de negócio
DESIGN.md           → experiência, princípios, linguagem visual/interação, anti-patterns
myt-art-director     → direção criativa e conceito ("o que a experiência deve significar")
myt-design-system    → tokens, cor, tipografia, spacing, grid, componentes, breakpoints
myt-motion           → animação, scroll, cursor, física, timing, reduced-motion, Intro→Hero
IMPLEMENTAÇÃO
myt-visual-qa        → verifica no navegador real se a implementação entregou o que os
                        documentos acima prometeram
```

Um skill não cria uma nova direção para substituir outro. Conflito entre camadas se resolve subindo na hierarquia (`PRODUCT.md` > `DESIGN.md` > skill especializado > implementação), nunca alterando o documento superior para fazer o código parecer certo.

Se implementação e documentação divergirem: não assuma silenciosamente que o código está certo. Identifique a divergência, verifique qual documento é a autoridade, e se não houver informação suficiente, reporte a ambiguidade em vez de decidir sozinho.

## Ativação contextual — não carregue tudo sempre

| Tipo de tarefa | Consultar |
|---|---|
| Lógica pura, sem UI | `PRODUCT.md` só se houver impacto de produto; nenhum skill visual; QA só se algo perceptível mudar |
| Ajuste visual (cor, spacing, componente) | `myt-design-system` → implementação → `myt-visual-qa` se o impacto for relevante |
| Nova animação/transição | `DESIGN.md` → `myt-motion` → `myt-design-system` se tiver impacto visual → implementação → `myt-visual-qa` |
| Nova seção/experiência | `PRODUCT.md` → `DESIGN.md` → `myt-art-director` → `myt-design-system` → `myt-motion` (se houver motion) → implementação → `myt-visual-qa` |
| Intro → Hero | `PRODUCT.md` → `DESIGN.md` → `myt-art-director` → `myt-motion` → `myt-design-system` (se visual mudar) → implementação → `myt-visual-qa` |
| Refactor/arquitetura | inspect → Graphify se necessário → plan → implement → Ponytail se útil → verify → `myt-visual-qa` se houver impacto |
| Bug visual | inspect → `myt-design-system`/`myt-motion` conforme a causa → correção mínima → `myt-visual-qa` |

O objetivo é evitar processamento desnecessário — carregar um skill que a tarefa não toca é desperdício de contexto, não rigor.

## Workflow

```
UNDERSTAND → INSPECT → PLAN → IMPLEMENT → VERIFY → QA → REFINE
```

- **UNDERSTAND** — entender exatamente o pedido; não assumir requisito não fornecido.
- **INSPECT** — procurar implementação/hook/token/componente existente antes de escrever algo novo; identificar sistemas de autoridade envolvidos (ex.: `isFrozen` na transição Intro→Hero, Lenis como autoridade de scroll).
- **PLAN** — só para tarefas não triviais: arquivos afetados, skills relevantes, riscos, estratégia mínima. Nada de plano longo para alteração simples.
- **IMPLEMENT** — a menor mudança que resolve o objetivo corretamente. Evitar abstração prematura, sistema paralelo, dependência nova, refactor fora do escopo.
- **VERIFY** — build, lint (`npm run lint`), comportamento esperado, regressão óbvia.
- **QA** — para mudança visual/interativa relevante, rodar `myt-visual-qa` (navegador real, responsive, motion, console/network).
- **REFINE** — se o QA achar problema: diagnóstico → correção mínima → QA de novo. Não vire refactor grande por causa de um problema pequeno.

Regra geral de escopo: **faça a menor mudança capaz de resolver corretamente o problema.** Não refatore arquivo não relacionado, não renomeie por preferência, não troque biblioteca sem necessidade, não "melhore" área não pedida. Se uma mudança arquitetural for realmente necessária, explique antes de implementar.

## Nunca inventar

Restrição de autenticidade do produto (`PRODUCT.md`/`DESIGN.md` → Proof & Credibility): nunca inventar cliente, case, métrica, depoimento, parceiro, experiência profissional ou funcionalidade inexistente. Não transformar placeholder em prova social. Onde conteúdo real ainda não existir, respeite a decisão já documentada (ex.: os placeholders atuais de Work/Marquee são gap conhecido, não licença para preenchê-los com algo fabricado).

## Experiência antes de efeito

> O objetivo não é produzir o maior número possível de efeitos. É produzir a experiência que a tese da MyTigency exige.

Antes de adicionar WebGL, parallax, cursor customizado, partícula ou qualquer efeito novo, a pergunta é **"o que isso acrescenta à experiência ou ao objetivo do produto?"** — não "isso ficaria interessante?". `myt-motion` e `myt-art-director` já têm o framework de decisão para isso; use-o em vez de decidir no impulso.

## Reutilizar antes de criar

Procure primeiro: hook, utilitário, componente, token, padrão de responsive ou sistema de motion existente. Se algo já resolve 80–100% do problema, reutilize — não duplique lógica.

Código órfão conhecido (`PrismSection`, `BackgroundBoxes`, `useAsciiDonut`, `utils/asciiDonut.js`) não deve ser apagado só por ter sido encontrado durante outra tarefa — remoção é uma tarefa de limpeza própria, não um efeito colateral.

## Ferramentas

### Ponytail

Instalado (plugin `ponytail@ponytail`, escopo de usuário). É uma camada de **redução de complexidade/código**, não uma autoridade de arquitetura ou design — nunca deve alterar comportamento ou direção do produto só para produzir menos linhas.

Não: otimizar agressivamente antes de entender o código; aceitar redução que prejudique legibilidade; remover abstração com propósito arquitetural real; simplificar UX para reduzir implementação.

Ordem de prioridade em caso de conflito:

```
correção > clareza > arquitetura > redução de código
```

### Graphify

Disponível como skill; já foi executado neste projeto (`graphify-out/graph.json`, `GRAPH_REPORT.md` presentes na raiz). É ferramenta de **entendimento estrutural** — quem depende de quem, onde uma decisão visual está concentrada — não de implementação automática.

Use quando: código desconhecido, arquitetura complexa, refactor, dependências difíceis de rastrear, ou risco de alterar um componente muito conectado. Não rode Graphify (nem gere um grafo novo) para uma tarefa pequena que a inspeção normal já resolve — e não gere arquivos de saída fora do que ele já mantém em `graphify-out/`.

```
Graphify      → entender relações
Ponytail      → reduzir complexidade/código
Skills MyT    → definir intenção e regras
Visual QA     → verificar resultado
```

Papéis não se sobrepõem — não peça ao Ponytail para decidir arquitetura, nem ao Graphify para implementar algo.

### Dependências novas

Antes de instalar qualquer coisa: verificar se já existe (`package.json`), se uma ferramenta existente resolve, se a dependência é realmente necessária — e então informar o motivo antes de instalar. Em especial: não instalar Playwright automaticamente (é o próprio `myt-visual-qa` quem decide isso, e só com autorização); não adicionar GSAP só porque uma animação parece complexa (ver `myt-motion` → Technology Selection); não trocar Lenis por outro sistema de scroll sem justificativa.

## Qualidade transversal

Estas três áreas já têm regra detalhada nos skills correspondentes — aqui só o lembrete de que valem desde a implementação, não como polish posterior:

- **Performance** — projeto usa Three.js/WebGL/canvas/RAF/Lenis; limpar listener, cancelar RAF, pausar fora da viewport, evitar loop duplicado (ver `myt-motion` → Performance).
- **Accessibility** — teclado, `:focus-visible`, touch, contraste, reduced-motion, nenhuma interação essencial só-mouse (ver `myt-motion`/`myt-design-system` → Accessibility).
- **Responsive** — mobile não é desktop encolhido; verificar touch, overflow, altura de viewport e se a experiência principal continua compreensível sem cursor (ver `myt-design-system`/`myt-motion` → Responsive).

## Quando perguntar ao usuário

Só quando: existem duas interpretações materialmente diferentes; falta informação essencial; a decisão muda produto/UX de forma significativa; há conflito entre documentos; a ação é destrutiva; uma dependência nova precisa ser instalada; ou a mudança arquitetural é grande.

Não pergunte algo que `PRODUCT.md`, `DESIGN.md`, um skill ou o próprio código já respondem.

## Definition of Done

```
✓ objetivo implementado
✓ regras existentes respeitadas (DESIGN.md / skill relevante)
✓ reutiliza sistema existente em vez de duplicar
✓ sem dependência desnecessária
✓ sem regressão óbvia
✓ responsive verificado, quando aplicável
✓ motion verificado, quando aplicável
✓ acessibilidade relevante verificada
✓ myt-visual-qa executado, quando a mudança tem impacto perceptível
✓ console sem erro novo relevante
```

Para tarefa puramente interna, aplique só os critérios relevantes — não force um checklist visual em algo que não toca a UI.

## Context efficiency

Não leia todos os skills quando só um é relevante. Consulte primeiro o documento mais diretamente ligado à tarefa. Não rode Graphify para tarefa trivial, não rode QA completo para mudança sem impacto visual, não repita análise já documentada em `DESIGN.md`/`myt-motion` (ex.: os gaps de reduced-motion do sistema ASCII já estão registrados como known debt — cite-os, não os redescubra do zero). Não reproduza documentos inteiros na resposta; use-os como fonte de decisão, não como conteúdo a repetir.

## Exemplos

| Tarefa | Fluxo |
|---|---|
| Mudar cor de um botão | `myt-design-system` → implementação → QA visual se o impacto for relevante |
| Criar animação nova | `DESIGN.md` → `myt-motion` → implementação → `myt-visual-qa` |
| Criar seção nova | `PRODUCT.md` → `DESIGN.md` → `myt-art-director` → `myt-design-system` → `myt-motion` (se houver motion) → implementação → `myt-visual-qa` |
| Refactor complexo | inspect → Graphify se necessário → plan → implement → Ponytail se útil → verify → `myt-visual-qa` se houver impacto |
| Corrigir bug visual | inspect → skill correspondente à causa → correção mínima → `myt-visual-qa` |

## O que este arquivo não faz

Não substitui `PRODUCT.md` nem `DESIGN.md`. Não duplica o conteúdo dos skills. Não é uma segunda fonte de verdade sobre design. Não define token visual, filosofia de motion ou direção artística própria — isso é dos skills. Não obriga Playwright/Graphify/Ponytail em toda tarefa. Não transforma toda tarefa em auditoria completa. Não sacrifica qualidade para economizar tokens ou linhas.

## Filosofia

> MyTigency não é um projeto onde código, design e motion são camadas independentes.
>
> Produto define o porquê. Design define a experiência. Os skills especializados definem como essa experiência deve ser construída. Código materializa essa decisão. Visual QA verifica se ela realmente chegou ao usuário.
>
> Preserve essa cadeia, reduza complexidade sem perder intenção, e prefira soluções simples, verdadeiras e coerentes a soluções tecnicamente impressionantes sem propósito.
