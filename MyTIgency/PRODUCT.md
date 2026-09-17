# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Local and small/medium business owners in Brazil (site is Portuguese-first) evaluating whether to hire a small studio to build or improve their digital presence or product. They are comparing MyTigency against freelancers and larger agencies, deciding who to trust with something more ambitious than a basic brochure site.

## Product Purpose

MyTigency is a two-person digital product studio (design + engineering/product) building websites and digital products for small/medium businesses. This landing page's job is to convert a visiting business owner into a lead by setting an expectation above typical freelance/agency output: the site should look and behave like proof of the studio's own craft, not just describe it.

Success for the landing page is a contact/inquiry from a qualified small-business owner, not just page views.

## Positioning

Tagline: "Funcionar é comum. Vencer é raro." (Working is common. Winning is rare.) The studio positions itself against agencies/freelancers who ship something that merely works — it frames its differentiator as building product that changes a business outcome ("o número no fim do trimestre"), delivered by a focused two-person team spanning design, engineering, and product rather than a generic dev shop.

## Operating Context

- Single-page site (React + Vite) with a cinematic scroll-driven intro (ASCII/3D logo reveal, smooth scroll via Lenis, Framer Motion transitions) before the standard landing sections: Hero, Marquee, Services, Work, Footer.
- **Bilingual by rule, PT default.** As of this decision, every piece of user-facing site content must ship with both a Portuguese and an English version — this is a standing product requirement, not a one-off translation task, because it's how the studio intends to reach smaller business owners beyond Brazil. Portuguese remains the default language on load. The PT/EN toggle in the landing intro (`src/components/Landing.jsx`) is functional: language state lives in `LanguageContext` (`src/context/LanguageContext.jsx`) and all copy is sourced from `src/i18n/strings.js`. Any new copy added to the site must be added to both language entries in that file, not hardcoded in a single language.
- Sections use nav anchors in Portuguese: `#trabalhos` (Work), `#carreiras` (Careers, currently just the footer), `#contato` (Contact/CTA band).

## Capabilities and Constraints

- Team is genuinely two people covering design and engineering/product (confirmed) — the "Duas pessoas. Um único time." copy in Services.jsx reflects reality, not aspiration.
- Brand name inconsistency to resolve later: the header/landing/services use "MyTigency", but the footer currently says "RUNTIME." — this is leftover/placeholder branding, not an intentional dual name.
- No CMS or backend; content is hardcoded in JSX.

## Brand Commitments

- Confirmed name: **MyTigency**, abbreviated **MyT**. Both forms are valid; there is no other brand name for the studio.
- Name etymology (confirmed by the founders, durable fact — do not treat as arbitrary or replaceable): "My" comes from **M**iguel (co-founder) + "y"; "TI" refers to the tech/IT field the studio works in, and also doubles as the initials of **T**h**i**ago (the other co-founder); "gency" comes from "agência" (agency), which is what the studio is building. The name is literally built from both founders' identities plus the field and the business form.
- "RUNTIME." (previously used in the footer) was never a real brand name — it was leftover placeholder text and has been corrected to MyTigency.
- Existing visual system (ASCII motifs, red accent, editorial/hairline base, monospace/display type stack) is documented in `DESIGN.md`.

## Evidence on Hand

Pre-launch: no real clients, case studies, testimonials, social links, or contact email exist yet. All of the following are placeholders in the current code and must not be treated as real or fabricated further:
- Client names in Hero.jsx ("[Cliente A], [Cliente B], [Cliente C]")
- Case studies in Work.jsx (three `[ CASE 0x ]` cards, all placeholder copy)
- Footer.jsx: studio description, Instagram/LinkedIn links, and contact email are all placeholder
- Footer brand name "RUNTIME." (see Capabilities and Constraints)

This is a known, deliberate gap for a first launch — do not invent client names, cases, or metrics to fill these.

## Product Principles

1. Set expectations above typical small-business freelance/agency work — the page's own execution is part of the pitch.
2. Speak to a business owner's outcome ("vencer"/winning), not just deliverables ("funcionar"/working).
3. Keep the studio's real two-person scope credible — avoid copy that implies a larger team or agency than actually exists.
4. Every piece of content ships in Portuguese and English; Portuguese is the default on load, but English is not an afterthought — it's how the studio reaches smaller business owners outside Brazil.
