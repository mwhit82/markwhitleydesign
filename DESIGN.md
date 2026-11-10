# Mark Whitley — workspace design system

Foundation: [Linear DESIGN.md](https://www.shadcn.io/design/linear/raw), captured
10 November 2026 in `docs/design/linear-source.md`. That reference is an independent
interpretation, not an endorsement. This file defines our site-specific rules.

## Tokens and typography
- Use semantic variables in app/globals.css. Dark is the default: #010102 canvas,
  #0f1011/#141516/#18191a surfaces, #23252a/#34343a hairlines, #f7f8f8 text.
- One restrained lavender accent (#5e6ad2, #828fff hover). No cream, earth-coloured
  chrome, decorative gradients, spotlight cards or animated background canvases.
- Light mode is our extension: white canvas, cool-neutral surfaces and dark text.
  System mode follows the OS. Preserve user preferences and avoid first-paint flashes.
- Inter for UI, Geist Mono for technical captions. 28px/600 compact page headings,
  15px/500 card titles, 12–14px body text; measured negative tracking on headings.
- Base spacing 4px. Outer padding 32/24/16px; 12px card radius, 8px controls,
  1px borders. Hierarchy comes from surfaces, not shadows.

## Composition and components
- Shared header: MW + profile trigger, Design/Games/Photography, collaborator avatars,
  Dark/Light/System. Only these three primary navigation destinations.
- The homepage is full width. Card grid: 4 columns at 1280+, 3 at 1024+, 2 at 640+,
  1 below. Matching 16:10 artwork, title, description. No numbered/category eyebrows.
- Preserve genuine screenshots and photographs. Conceptual illustrations must be
  labelled, neutral and consistent; never fabricate product evidence or results.
- Photography is natural-proportion columns (4 at 1440+, 3 at 1024+, 2 at 640+).
  Phones: every image spans the available width, 16px page padding and entry gaps.
- Reuse WorkspaceHeader, PortfolioTile, GameCard, CameraSettings and ResumeDrawer.
  New detail pages use the same tokens, controls and return destinations.
- Shared controls must have visible keyboard focus, accessible names, meaningful
  links and a minimum 44px touch target where practical. Modal dialogs contain focus,
  restore the opener and close with Escape. Never depend on hover alone.

## Motion and behaviour
- Codex/Claude cursors are decorative, not connected agents. Build sequence is 1.2s
  on initial arrival or filter change only. Content stays interactive. Cancel on rapid
  switches; no idle loops. Reduced motion shows the finished layout immediately.
- Filters use ?view=design|games|photography; default Design. Preserve Back/Forward,
  legacy routes and photo anchors. Profile is a drawer, also reachable with ?profile=open.
- Actual game screens retain their artwork and layouts. Do not restyle gameplay.
- Original photography and .photography-work remain private. Preserve responsive
  variants, alt text, full-collection lightbox and the four approved camera settings.

## Sources and maintenance
- Public résumé snapshot: LinkedIn profile read with permission 10 November 2026.
  Preserve source dates, including overlaps; never infer education degree/dates.
- Claude glyph: Simple Icons (CC0), raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/claude.svg.
- Codex glyph: Lobe Icons (MIT), raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/codex.svg.
  Logos remain their owners' trademarks; used to identify Mark's tools, not endorsement.
- Native CSS/React and browser animation APIs suffice; no UI or motion runtime added.
- Before publishing: production build, lint, content/photography/game checks, keyboard,
  light/dark/system, reduced motion, 390/820/1440px layouts, redirects and live verification.
