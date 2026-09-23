# Design

<!-- myt-art-director:design-schema 1 -->

Referência oficial de direção criativa da MyTigency. Consolida o processo de exploração de conceito já concluído (análise da direção atual → autocrítica → exploração conceitual sem a pele visual atual → cruzamento dos conceitos A/C/D/E). Não introduz decisões novas além das já definidas nesse processo. Compatível com `PRODUCT.md`.

# Concept

**Tese central:** a experiência prova "vencer é raro" ao recusar qualquer camada que apenas finja — o que ela transforma, o que ela responde, quem a assina e o que ela admite não ter ainda são, todos, literalmente verdadeiros. É essa ausência de encenação — incomum no mercado — que se torna a prova, sem depender da frase "Funcionar é comum. Vencer é raro." para ser dita.

**Achado que fundamenta a tese:** lida como "somos exclusivos/raros", a filosofia mira em admiração — mas o comprador real (dono de PME, possivelmente já frustrado com um fornecedor anterior) não busca prestígio, busca não ser enganado de novo. A direção lê a filosofia como redução de risco e confiança, não como afirmação de elite.

# Creative Direction

A direção opera em quatro camadas de recusa da simulação que domina sites de agência comuns:

1. **Estrutural** — transformação real de estado, não decoração de transição.
2. **Interativa** — resposta proporcional a uma ação real, não efeito por possibilidade técnica.
3. **Autoral** — os dois fundadores reais assinam, sem máscara institucional.
4. **Evidencial** — prova pela verdade do estágio atual, nunca por encenação de prova social.

Rigor visual (precisão, alinhamento, ausência de sujeira) é tratado como **consequência** dessas quatro camadas, não como quinta camada independente — é resultado do cuidado, não uma demonstração de status ou exclusividade.

# Core Principles

1. **Transformação real, não decorativa.** Qualquer estrutura de "antes/depois" (entrada, revelação, mudança de estado) precisa corresponder a uma mudança genuína — do genérico ao específico, do comum ao autoral — nunca um efeito estético sem correspondência real.
2. **Resposta proporcional, não performática.** A interface só reage quando a reação significa algo. Poucos pontos de interação, cada um lido como "isto foi notado e respondido". Um efeito adicionado "porque a tecnologia permite" falha este princípio por definição.
3. **Autoria visível, sem camada institucional.** A marca não se esconde atrás de "o estúdio" como entidade abstrata. As duas pessoas reais (confirmadas em PRODUCT.md) assinam o trabalho; a voz é direta, não corporativa.
4. **Prova pela verdade, nunca pela encenação.** Onde não há case ou cliente real, a página assume isso abertamente em vez de simular com placeholders genéricos.
5. **Rigor como consequência do cuidado (secundário).** Precisão e exatidão podem — e devem — aparecer, mas só como subproduto de fazer bem, nunca como pose de superioridade ou exclusividade. Este princípio existe para conter o risco de frieza/intimidação identificado no processo de exploração; não deve ser tratado como uma quinta camada independente da tese.

# Experience

O visitante não deve ser convencido por afirmação — deve ser capaz de testar, por conta própria, que a página é o que diz ser. A entrada estabelece um momento estrutural de limiar (algo muda de estado de forma real); a navegação oferece poucos pontos de resposta, cada um confirmando que a página realmente reage a quem a usa; a autoria aparece cedo e sem disfarce; e onde a prova ainda não existe, isso é dito, não escondido. O visitante deve sair entendendo não "a MyT é sofisticada", mas "a MyT não tentou me enganar em nenhum momento — nem uma vez".

# Emotional Progression

```
Ceticismo (padrão do mercado)
→ Estranhamento (isto não segue o script)
→ Teste (o visitante interage, verifica por conta própria)
→ Confirmação (é real)
→ Respeito (pela honestidade não escondida)
→ Desejo (imaginar isso aplicado ao próprio negócio)
→ Ação
```

Diferença deliberada em relação a uma curva "admirativa" convencional (curiosidade → impacto → desejo): esta progressão começa em desconfiança, porque o público real provavelmente chega desconfiado, não maravilhado. O trabalho da experiência é desarmar ceticismo com verdade demonstrável, não com espetáculo.

# Audience

Donos de pequenos/médios negócios locais, público-alvo confirmado em PRODUCT.md — não um público técnico. Prováveis características a assumir por padrão: acesso relevante via mobile; possível experiência anterior frustrante com freelancer/agência; decisão motivada por confiança e redução de risco, não por admiração de sofisticação técnica.

**Regra de linguagem:** prova e consequência devem ser expressas em termos operacionais do negócio do visitante — telefone tocando, mesa ocupada, agenda cheia, cliente voltando — nunca em jargão técnico ou de SaaS (funil, conversão, DX). A ambição de execução pode continuar alta; o que muda é o que está sendo provado e em que vocabulário.

# Visual Language

Princípios primeiro; expressões específicas atuais estão registradas em **Current Implementation**, não aqui — nenhuma delas é requisito permanente.

- **Composição:** a estrutura deve tornar visível uma transformação de estado real, não decoração espalhada pela página.
- **Tipografia:** contraste de escala entre a afirmação central (curta, grande) e o sistema de apoio (neutro, legível) — hierarquia por estrutura, não por efeito.
- **Cor:** um único acento reservado ao momento de consequência. Nunca decorativo, nunca repetido sem propósito — se aparece em todo lugar, deixou de marcar um evento.
- **Contraste:** alto o suficiente para legibilidade e para que o acento realmente sinalize algo específico.
- **Densidade:** baixa. Cada elemento presente precisa passar pelo Decision Framework; ausência de blobs, glassmorphism, gradientes decorativos e cards genéricos.
- **Espaçamento:** generoso; estrutura em grid/linhas finas como expressão de precisão, não de estilo.
- **Textura/imagem:** nenhuma imagem ou textura puramente decorativa. Onde não há material real (fotos de trabalho, clientes), a ausência honesta é preferível ao preenchimento genérico (stock, mockups fictícios).
- **Hierarquia:** mensagem central → prova de verdade → autoria → ação. O acento e qualquer ênfase visual seguem essa ordem, não uma lógica decorativa independente.

# Interaction

- Poucos pontos de interação; cada um precisa passar no teste "isto responde a algo real que o visitante fez, de um jeito que significa algo" — não "isto responde porque dá para fazer".
- Qualquer comportamento de cursor, hover ou gesto é uma **expressão possível** do Princípio 2 (resposta proporcional), não um requisito da identidade.
- Toda interação dependente de cursor precisa de um equivalente definido para toque antes de ser tratada como parte central da experiência (ver **Responsive**).
- Nenhuma afirmação interativa sem função real: um controle que aparenta funcionar mas não funciona (ex.: um toggle decorativo) viola o Princípio 4 na mesma medida que um case fabricado.

# Motion

- Qualquer transformação/motion precisa representar uma mudança de estado genuína (do genérico ao autoral), nunca uma transição decorativa.
- Motion segue um único sistema de timing/easing coerente para todo o site — não um idioma novo por seção.
- Preferir motion acionado por causa visível (scroll com propósito, ação do visitante) a motion ambiente/looping sem gatilho reconhecível.
- `prefers-reduced-motion` deve ser respeitado por completo — não apenas congelando transformações visuais, mas também eliminando qualquer distância de scroll criada apenas para encenar uma animação (ver **Accessibility**).

# Content & Copy

- Voz em primeira pessoa direta, dos dois fundadores reais — não institucional, não "o estúdio" como sujeito abstrato.
- Vocabulário de prova e consequência em termos operacionais do negócio do visitante, não em jargão técnico (ver **Audience**).
- **Regra explícita: nunca simular prova social.** Nenhum nome de cliente fictício, nenhum case fabricado, nenhuma insinuação de uma carteira de clientes que não existe.
- Onde a prova ainda não existe, isso é dito diretamente como parte da mensagem (ver **Proof & Credibility**), não mascarado com placeholder genérico.
- Uma promessa visual não cumprida (ex.: uma funcionalidade que aparenta existir mas não existe) é, em escala pequena, o mesmo tipo de simulação que o Princípio 4 rejeita em escala maior.
- **Regra explícita: bilíngue PT/EN é requisito permanente, não tarefa pontual.** Todo conteúdo novo do site precisa existir em português e inglês (`src/i18n/strings.js`), com português como padrão de carregamento. Isso decorre de uma decisão de produto (PRODUCT.md → Operating Context): alcançar donos de pequenos negócios fora do Brasil. Um toggle de idioma sem tradução real por trás (como o PT/EN era antes desta decisão) volta a violar a regra de "nenhuma promessa visual sem função real" acima.

# Authorship

- Os dois fundadores reais (design + engenharia/produto, fato confirmado em PRODUCT.md) devem aparecer como autoria visível e cedo na experiência — não escondidos atrás de uma marca institucional abstrata.
- Uma única identidade de marca consistente em toda a página — resolvido: todo o site assina "MyTigency"/"MyT", sem nome paralelo. Qualquer segunda assinatura não decidida deliberadamente volta a ser uma inconsistência a resolver, não uma variação aceitável.
- O próprio nome já é um sinal de autoria real, não neutro: "MyTigency" é construído a partir das identidades dos dois fundadores (etimologia confirmada em PRODUCT.md → Brand Commitments) — reforça o Princípio 3 estruturalmente, não só na superfície.
- Diretividade na voz não deve ser confundida com informalidade que reduza a percepção de capacidade — o equilíbrio exato entre "somos só nós dois, diretos" e "somos capazes de algo mais sério que a média" ainda não está resolvido (ver **Design Hypotheses**).

# Proof & Credibility

**Fato confirmado (PRODUCT.md):** a MyTigency está pré-lançamento — não existem clientes, cases ou depoimentos reais até o momento.

- Nunca fabricar clientes, métricas, resultados ou depoimentos, sob nenhuma circunstância.
- Onde não há prova real, a ausência é declarada como parte da mensagem, não preenchida com placeholder genérico que insinue uma carteira de clientes inexistente.
- O próprio site, como trabalho real e verificável em andamento, pode servir como a única "prova" atual disponível — rotulado honestamente como tal, nunca disfarçado de case de cliente.
- **Isto é uma hipótese de design, não um fato validado:** presumir que a honestidade sobre a ausência de cases aumenta a confiança do público SMB é uma aposta desta direção, não algo comprovado (ver **Design Hypotheses**).

# Conversion

- Conversão é parte da arquitetura da experiência, não algo anexado ao final da página.
- Ação primária: contato direto com os dois fundadores, sem camadas de formulário ou triagem desnecessárias — consistente com **Authorship**.
- CTA (linguagem e posicionamento) segue a **Emotional Progression**: ação vem depois de respeito/desejo, não é forçada antes disso.
- **Ponto de atenção não resolvido:** a estrutura de entrada atual (scroll-linked) pode atrasar o acesso à navegação e ao CTA principal até que o visitante avance na intro. Um atalho explícito de scroll mitiga, mas não resolve totalmente essa fricção. Isso precisa ser uma decisão deliberada durante a implementação, não um efeito colateral não examinado.
- Espetáculo visual nunca substitui um caminho sempre alcançável até o contato.

# Responsive

- Qualquer linguagem de interação construída em torno do cursor (hover, física, cursor contextual) é, por definição, exclusiva de dispositivos com ponteiro fino — inexistente em touch.
- Dado que o público (PRODUCT.md) provavelmente inclui acesso mobile relevante, qualquer expressão dependente de cursor precisa de um equivalente definido para toque, ou de uma decisão deliberada e explícita de que essa camada é desktop-only — nunca uma omissão não examinada.
- A tese central (transformação real, resposta proporcional, autoria, prova) precisa ser inteiramente expressável em mobile sem depender de interação baseada em cursor.

# Accessibility

- `prefers-reduced-motion` deve ser respeitado integralmente: não só congelando transformações visuais, mas também colapsando qualquer distância de scroll criada apenas para encenar uma animação — para que o visitante não role uma tela "vazia" à toa.
- Camadas de interação exclusivas de ponteiro fino (cursor customizado) devem continuar condicionadas a `pointer: fine`, nunca aplicadas a dispositivos de toque.
- Contraste e legibilidade têm prioridade sobre qualquer acento ou efeito. O acento reservado (ver **Visual Language**) nunca pode ser o único meio de transmitir significado.

# Performance

- Qualquer efeito renderizado continuamente ou pesado em GPU (cenas 3D, renderização ASCII por frame, etc.) precisa ser avaliado contra o perfil real de dispositivo do público — incluindo hardware mobile modesto — não presumido seguro por funcionar em máquina de desenvolvimento.
- Custo de implementação e peso em runtime devem ser pesados contra o que o efeito comprovadamente demonstra segundo os **Core Principles**. Um efeito caro que não expressa transformação real nem resposta proporcional deve ser simplificado ou removido.
- Isso ainda não foi verificado para a implementação atual (ver **Design Hypotheses** e **Current Implementation**).

# Anti-Patterns

- Prova social simulada — clientes, cases ou depoimentos fictícios apresentados como reais.
- Camada institucional escondendo os dois fundadores reais.
- Interação ou efeito adicionado porque a tecnologia permite, sem resposta a uma ação real e legível.
- Afirmação visual não cumprida (um controle que aparenta funcionar mas não funciona).
- Excesso decorativo genérico: gradientes previsíveis, glassmorphism, glow genérico, blobs arbitrários, objetos 3D sem função, cards arredondados genéricos, layout de SaaS padrão.
- Tratar qualquer técnica específica (ASCII, 3D, terminal, glitch, cursor) como identidade obrigatória da marca — todas são expressões substituíveis, nenhuma é a tese.
- Tom que soa exclusivo ou intimidador em vez de confiável (risco do Princípio 5).

# Current Implementation

**Alinhado com a direção (mantém-se, por ora):**
- Estrutura de scroll intro → transição → hero — expressão direta do Princípio 1 (transformação real).
- Vermelho reservado ao momento de consequência no headline (acende apenas na etapa final do progresso) — expressão direta do Princípio 2.
- Base editorial de restrição (hairlines, ausência de glassmorphism/blobs) — já consistente com a linguagem visual desta direção, **exceto pelo Menu da Header**, ver exceção abaixo.

**Exceção deliberada e escopada (Menu da Header):**
- O painel de navegação (dropdown desktop compacto / overlay fullscreen mobile) e o
  container flutuante da Header no mobile usam glassmorphism (fundo translúcido claro
  + `backdrop-filter: blur`, tokens `--menu-glass-bg`/`--menu-glass-blur`) e cantos
  arredondados (`--menu-radius`) — ambos listados em **Anti-Patterns** como o que
  evitar no resto do site. Esta é uma decisão consciente do usuário/produto, avaliada
  contra o Decision Framework e não um desvio silencioso: mantida como exceção
  **escopada apenas a este componente** (`.menu-panel` e a Header em viewport mobile),
  não um precedente para cards, seções ou qualquer outra superfície do site.
- O vermelho (`--accent`) permanece fora deste componente: hover/estado ativo dos
  itens do menu, e o morph do texto MENU↔CLOSE, usam apenas `--ink-dim`/`--ink` —
  preservando a regra de "acento único reservado a um momento de consequência" (ver
  **Visual Language** → Cor). O ícone do botão do Menu reaproveita a marca `>_`
  (`.brand .mark`) já existente, em vez de introduzir um novo dispositivo visual.
- Se esta exceção for revisitada no futuro, reavaliar pelo mesmo Decision Framework —
  não presumir que ela abriu espaço para glass/cantos arredondados em outro lugar do
  site.

**Apenas ferramentas (substituíveis — não são a tese em si, podem continuar existindo se e enquanto servirem aos princípios):**
- Render ASCII do modelo 3D, o modelo `.glb`, a marca `>_`, o efeito de glitch, JetBrains Mono como fonte única do sistema, o vermelho como matiz específico.
- Cursor contextual e física do texto vermelho — válidos como expressão do Princípio 2, mas precisam ser reavaliados por essa régua (resposta real), não pela régua de "parecer interessante".

**Resolvido:**
- Footer agora assina "MyTigency" (era "RUNTIME.", resíduo de template — nunca foi um nome de marca real; etimologia confirmada em PRODUCT.md → Brand Commitments).
- Toggle PT/EN agora é funcional (`LanguageContext` + `src/i18n/strings.js`); bilíngue é regra permanente, não mais pendência (ver Content & Copy).

**Ainda precisa ser questionado/resolvido (contradiz a direção como está hoje):**
- Marquee de clientes fictícios (`[CLIENTE A]`/`[CLIENT A]`...) — contradiz **Proof & Credibility**. Os rótulos foram traduzidos junto com o resto do site, mas a decisão de fundo (remover / substituir por "case #0" / reescrever) segue em aberto.
- Copy que insinua clientela já estabelecida ("marcas que já sabem a diferença entre lançar e vencer" / equivalente em inglês) — mesma contradição; traduzida como está, não reescrita.
- `PrismSection.jsx` e `BackgroundBoxes.jsx` — componentes não importados em `App.jsx`; direções abandonadas fora da direção atual. Decisão de manter, formalizar ou remover ainda pendente.

# Design Hypotheses

Registradas explicitamente como apostas de design ainda não validadas — não devem ser tratadas como fato em decisões futuras:

- **Honestidade sobre ausência de cases:** pode aumentar a confiança (leitura pretendida por esta direção) ou pode ser lida como falta de experiência por um público mais conservador. Não testado.
- **Equilíbrio entre equipe pequena/direta e percepção de capacidade:** risco real de que "somos só nós dois, bem diretos" reduza a percepção de seriedade que o restante do projeto comunica. Não resolvido.
- **Quantidade adequada de interação:** o princípio "poucas interações, cada uma significativa" ainda não tem um limite concreto (quantos pontos, em quais seções) — a decidir durante a implementação, não presumido.
- **Relação entre ambição visual e confiança para SMB:** uma peça tecnicamente sofisticada pode ser lida como prova de capacidade ou, inversamente, como a própria encenação que a tese rejeita. Nenhuma das duas leituras foi validada com o público real.
- **Mobile sem camada de cursor:** se os recursos dependentes de cursor forem mantidos como estão, a ausência total dessa camada para uma parte relevante do público (mobile) não foi medida nem confirmada como aceitável.

# Decision Framework

Para qualquer nova decisão visual ou interativa, perguntar nesta ordem:

1. Isso representa uma transformação, resposta, autoria ou prova real — ou é decorativo/performático?
2. Se removido, a tese (recusa da simulação) fica mais fraca, ou permanece a mesma?
3. Isso ainda faz sentido se a pele visual atual (ASCII/3D/terminal/glitch/cursor) fosse totalmente trocada?
4. Um dono de PME, não um público técnico, entenderia o motivo dessa decisão existir?
5. Isso funciona — ou tem equivalente definido — em mobile, sem depender de cursor?
6. O custo de implementação/performance se justifica pelo que isso prova, segundo os Core Principles?
7. Isso mantém uma única identidade de marca e autoria visível, ou introduz uma nova camada/inconsistência?
8. Isso exige uma afirmação (visual ou textual) que a MyT ainda não pode cumprir de verdade?

Se as respostas às perguntas 1, 2 ou 4 apontarem para "decorativo", "não mudaria nada" ou "não entenderia", reconsiderar o elemento antes de implementar.

# References & Anti-References

Nenhuma referência visual externa foi definida ou aprovada até este momento. Este espaço fica deliberadamente em aberto para ser preenchido quando referências concretas forem trazidas e avaliadas — separando sempre princípio de execução (identificar o que torna a referência eficaz, nunca copiá-la diretamente).

**Anti-referências por princípio (não por imagem específica):** qualquer site que comunique valor por meio de prova social simulada, excesso decorativo genérico (gradientes previsíveis, glassmorphism, glow, blobs, objetos 3D sem função) ou tom institucional que esconda quem realmente faz o trabalho.
