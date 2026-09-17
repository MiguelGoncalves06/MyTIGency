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
- Content is Portuguese by default. A PT/EN language toggle exists in the landing intro (`src/components/Landing.jsx`) but is currently cosmetic only — no translation logic is wired to it yet. Treat English support as not yet implemented.
- Sections use nav anchors in Portuguese: `#trabalhos` (Work), `#carreiras` (Careers, currently just the footer), `#contato` (Contact/CTA band).

## Capabilities and Constraints

- Team is genuinely two people covering design and engineering/product (confirmed) — the "Duas pessoas. Um único time." copy in Services.jsx reflects reality, not aspiration.
- Brand name inconsistency to resolve later: the header/landing/services use "MyTigency", but the footer currently says "RUNTIME." — this is leftover/placeholder branding, not an intentional dual name.
- No CMS or backend; content is hardcoded in JSX.

## Brand Commitments

- Confirmed name: MyTigency.
- No other binding visual/brand references were established in this session; existing visual system (ASCII motifs, red accent glitch text, dark theme, monospace/display type stack) is incumbent implementation, not yet documented in DESIGN.md.

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
4. Portuguese is the primary language today; do not assume English parity until the toggle is actually wired.
