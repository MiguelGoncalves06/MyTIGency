# Graph Report - MyTIgency  (2026-09-17)

## Corpus Check
- Corpus is ~23,436 words - fits in a single context window. You may not need a graph.

## Summary
- 219 nodes · 290 edges · 48 communities (12 shown, 36 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 0 input · 400,435 output

## Community Hubs (Navigation)
- Core App & Scroll UI
- 3D ASCII Logo Scene
- Project Dependencies
- Footer & Proof Philosophy
- Contextual Cursor System
- Background Boxes & Fonts
- App Shell & Red Physics
- Creative Direction Docs
- Icon Sprite Sheet
- Lint Configuration
- Build Tooling Stack
- ASCII Donut Hook
- Decision Framework
- Anti-Pattern Avoidance
- Experience-Conversion Alignment
- Proportional Response Principle
- Cohesion Over Novelty
- Experience Serves Business
- Impeccable Skill Reference
- Memorable Over Familiar
- Design System Skill Reference
- Motion Skill Reference
- Visual QA Skill Reference
- Sells Possibility of Experience
- Website as Experience
- Accessibility Principle
- Content & Copy Voice
- Four Layers of Anti-Simulation
- Unvalidated Design Hypotheses
- Emotional Progression Arc
- Minimal Real Interaction
- Motion Timing Principle
- Performance vs GPU Cost
- Visible Authorship Principle
- Rigor as Consequence
- Real Not Decorative Transformation
- Responsive Touch Equivalent
- Visual Language Principle
- Brand Commitments
- Product Principles
- Product Purpose: Convert Leads
- Target Users: Brazilian SMBs
- Favicon Icon Asset
- Pixel-Art Cursor Asset
- Hero Visual Asset
- React Logo Asset
- Star Animation Asset
- Vite Logo Asset

## God Nodes (most connected - your core abstractions)
1. `createAsciiLogoScene()` - 18 edges
2. `react` - 16 edges
3. `AsciiLogoSceneEffect` - 10 edges
4. `getIntroScrollDistance()` - 8 edges
5. `useScene()` - 7 edges
6. `useContextualCursor()` - 7 edges
7. `AsciiStage()` - 6 edges
8. `Icons Sprite Sheet (icons.svg)` - 6 edges
9. `scripts` - 5 edges
10. `RedText()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Princípio 4: Prova pela verdade, nunca pela encenação` --semantically_similar_to--> `Evidence on Hand (placeholders pré-lançamento)`  [INFERRED] [semantically similar]
  DESIGN.md → PRODUCT.md
- `Operating Context (React+Vite, scroll intro, Lenis, Framer Motion)` --semantically_similar_to--> `React + Vite template (README)`  [INFERRED] [semantically similar]
  PRODUCT.md → README.md
- `MyT Art Director (skill)` --semantically_similar_to--> `Positioning: 'Funcionar é comum. Vencer é raro.'`  [INFERRED] [semantically similar]
  .claude/skills/myt-art-director/SKILL.md → PRODUCT.md
- `Experience and conversion are not opposites` --semantically_similar_to--> `Conversion (contato direto, CTA segue emotional progression)`  [INFERRED] [semantically similar]
  .claude/skills/myt-art-director/SKILL.md → DESIGN.md
- `Distinctive over generic` --semantically_similar_to--> `Anti-Patterns (prova social simulada, glassmorphism, blobs, etc.)`  [INFERRED] [semantically similar]
  .claude/skills/myt-art-director/SKILL.md → DESIGN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **DESIGN.md Core Principles (1-5)** — design_principle_transformacao_real, design_principle_resposta_proporcional, design_principle_autoria_visivel, design_principle_prova_pela_verdade, design_principle_rigor_como_consequencia [INFERRED 0.85]
- **MyT Skills Ecosystem (Relationship With Other MyT Skills)** — _claude_skills_myt_art_director_skill_mytartdirector, _claude_skills_myt_art_director_skill_myt_design_system, _claude_skills_myt_art_director_skill_myt_motion, _claude_skills_myt_art_director_skill_myt_visual_qa, _claude_skills_myt_art_director_skill_impeccable [EXTRACTED 1.00]
- **Pre-launch Placeholder Content (Evidence on Hand)** — src_components_hero, src_components_work, src_components_footer, product_evidence_on_hand [EXTRACTED 1.00]

## Communities (48 total, 36 thin omitted)

### Community 0 - "Core App & Scroll UI"
Cohesion: 0.13
Nodes (23): ref_lenis_dist_lenis_css, ref_lenis_react, react, AsciiStage(), easeInOutCubic(), Header(), Hero(), Landing() (+15 more)

### Community 1 - "3D ASCII Logo Scene"
Cohesion: 0.11
Nodes (21): three, ref_three_addons_loaders_gltfloader_js, AsciiLogoSceneEffect, CORE_CHARS, createAsciiLogoScene(), animate(), applySize(), destroy() (+13 more)

### Community 2 - "Project Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, framer-motion, lenis, react, react-dom, three, devDependencies, oxlint (+20 more)

### Community 3 - "Footer & Proof Philosophy"
Cohesion: 0.15
Nodes (13): Footer assinado 'RUNTIME.' (inconsistência de marca), Princípio 4: Prova pela verdade, nunca pela encenação, Proof & Credibility (pré-lançamento, sem fabricar clientes), Capabilities and Constraints (time real de 2 pessoas, sem CMS), Evidence on Hand (placeholders pré-lançamento), Footer(), RedText(), Services() (+5 more)

### Community 4 - "Contextual Cursor System"
Cohesion: 0.27
Nodes (9): ContextualCursor(), getCursorKind(), LABELS, resolveTarget(), shouldHideCursor(), useContextualCursor(), applyKind(), handleLeave() (+1 more)

### Community 5 - "Background Boxes & Fonts"
Cohesion: 0.24
Nodes (8): Current Implementation (ASCII, .glb, cursor, JetBrains Mono, red accent), Google Fonts stack (Archivo Black, Inter, JetBrains Mono, Space Grotesk, Syne, Source Code Pro), framer-motion, BackgroundBoxes(), DEFAULT_COLORS, OriginkitBaseBackgroundBoxes(), originkitPresetProps, screenToPlane()

### Community 6 - "App Shell & Red Physics"
Cohesion: 0.22
Nodes (5): index.html (app shell), ref_react_dom_client, App(), useRedPhysics(), src_index

### Community 7 - "Creative Direction Docs"
Cohesion: 0.29
Nodes (8): MyT Art Director (skill), Web Interface Guidelines (Vercel), Audience (donos de PME locais), Authorship (dois fundadores reais, identidade única), Design Concept (tese central: recusa da simulação), MyTigency DESIGN.md, Positioning: 'Funcionar é comum. Vencer é raro.', MyTigency PRODUCT.md

### Community 8 - "Icon Sprite Sheet"
Cohesion: 0.29
Nodes (7): Icons Sprite Sheet (icons.svg), Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social (Contact/Network) Icon, X (Twitter) Icon

### Community 9 - "Lint Configuration"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 10 - "Build Tooling Stack"
Cohesion: 0.33
Nodes (6): Operating Context (React+Vite, scroll intro, Lenis, Framer Motion), Oxlint, @vitejs/plugin-react (Oxc), @vitejs/plugin-react-swc (SWC), React Compiler (not enabled), React + Vite template (README)

### Community 11 - "ASCII Donut Hook"
Cohesion: 0.60
Nodes (4): useAsciiDonut(), loop(), renderDonut(), renderAsciiDonut()

## Knowledge Gaps
- **79 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 106 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Core App & Scroll UI` to `Project Dependencies`, `Footer & Proof Philosophy`, `Contextual Cursor System`, `Background Boxes & Fonts`, `App Shell & Red Physics`, `ASCII Donut Hook`?**
  _High betweenness centrality (0.270) - this node is a cross-community bridge._
- **Why does `createAsciiLogoScene()` connect `3D ASCII Logo Scene` to `Core App & Scroll UI`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `createAsciiLogoScene()` (e.g. with `destroy()` and `onPointerLeave()`) actually correct?**
  _`createAsciiLogoScene()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core App & Scroll UI` be split into smaller, more focused modules?**
  _Cohesion score 0.13368983957219252 - nodes in this community are weakly interconnected._
- **Should `3D ASCII Logo Scene` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._