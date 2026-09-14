# CareerSim Design System — "Command Console"

A high-contrast, Swiss-editorial, high-density visual language for tactical decision-making
interfaces. This document is the source of truth for Phase 3+ component work. New UI must be
checked against it before merging.

## 1. Typography

| Role | Font | CSS var | Tailwind utility |
|---|---|---|---|
| Display / headings / nav / buttons | `Space Grotesk` | `--font-display` | `font-display` |
| Metadata, telemetry, shortcuts, step indicators, metrics | `JetBrains Mono` | `--font-mono` | `font-mono` |
| Body copy (unmigrated utility routes: login/signup/privacy/terms) | `Geist Sans` | `--font-sans` | `font-sans` |

- Metadata is always uppercase and tracked-out (`tracking-wide`): `SYS_ONLINE`, `TRACK: VC_ASSOCIATE`,
  `STEP: 02/05`. The bordered/monospace treatment on its own container (the pill, the HUD chip, the
  badge) reads as a system value — no surrounding `[` `]` bracket characters needed on top of that;
  square brackets were dropped repo-wide as a deliberate follow-up revision (they read as noise once
  every metadata value already has its own bordered chip to signal "this is a system value").
- Display font carries page titles, nav labels, and primary actions — never metadata.

## 2. Color Palette

| Token | Value | Tailwind utility | Use |
|---|---|---|---|
| `--color-obsidian` | `#020617` | `bg-obsidian` | App-level dark background |
| `--color-surface` | `#0f172a` | `bg-surface` | Panels, cards, elevated bento cells |
| `--color-hairline` | `#1e293b` | `border-hairline` | 1px dividers, card borders, grid lines |
| `--color-ink` | `#f8fafc` | `text-ink` | Primary text on dark surfaces |
| `--color-signal` | `#FFB800` | `bg-signal` / `text-signal` / `border-signal` / `ring-signal` | The **single** accent — active state, focus rings, live/hot badges, hotkey highlights |

Signal is amber (`#FFB800`), chosen over electric teal for its tactical/alert register — it reads
as "live" and "armed," not "success." It is spent sparingly: one accent per view, never both an
amber AND a colored badge system competing for attention. Status other than "active/live" stays
grayscale (`slate-400`/`slate-500` on dark, muted borders) rather than reaching for green/red/blue.

`--background`/`--foreground` (the root CSS vars driving the plain `body` rule) now point at
`obsidian`/`ink` too, so the whole site defaults to dark. Only `/login`, `/signup`, `/privacy`,
and `/terms` were left out of this migration (unrequested utility/legal routes) — they keep their
own light-themed wrapper `div`s, which now sit on a dark page-level gutter instead of a white one.

## 3. Visual Language

- **Hairline bento grids**: every card/panel is a 1px `border-hairline` rectangle. No shadows, no
  elevation. Depth comes from contrast (`obsidian` vs `surface`), never `box-shadow`.
- **Zero soft pill buttons**: buttons and tags are rectangular or, at most, `rounded-sm` (2px).
  Never `rounded-full`.
- **Zero gradients**: no purple/pink gradients, no generic corporate blue. Every fill is a flat
  token color.
- **Motion**: physical, not decorative. Tactile spring transitions on interactive elements;
  entrance animations are functional (bars filling to a value, counters ticking) not ornamental.
  The stateful simulation product runs on `framer-motion` springs (`stiffness: 400, damping: 25`);
  nav/marketing/catalog/modals/forms run on the GSAP tokens in #7 — see that section for the
  scope split and why.
- **Density over whitespace**: metadata blocks, HUD strips, and matrices pack information at a
  small type scale (`text-[10px]`–`text-xs`) rather than spacing it out.

## 4. Negative Constraints — strictly forbidden

- Generic SaaS tropes (soft gradient hero blobs, oversized rounded cards floating on white).
- Floating modals that cover content — use inline panels or dedicated routes instead.
- Rounded pill tags/badges (`rounded-full`) — use rectangular or `rounded-sm` tags.
- Emoji-heavy marketing copy.
- Purple/pink gradients or generic corporate blue as an accent.
- Elevated box-shadows as a substitute for a hairline border.
- Inline/one-off CSS `@keyframes` for entrances or interaction feedback — build those as a GSAP
  timeline through `lib/motion.ts` + `hooks/useReveal.ts` (see #6). The one standing exception is
  Tailwind's native `animate-spin` on `Loader2` spinners: a compositor-only infinite keyframe is
  cheaper than a GSAP `repeat: -1` timeline for that single case, and it isn't the kind of
  decorative motion this rule targets.
- Monolithic feature components that hand-roll their own button/card/input markup instead of
  composing from `components/ui/*` (see #6).

**Known exception**: the Demo career-briefing and pre-sim prep screens (`DemoPageClient.tsx`,
`PreSimPrepModal.tsx`) are still centered overlay modals, re-skinned dark rather than converted to
inline panels — that's a bigger flow change than a theme migration and wasn't requested. Flag it if
this constraint gets enforced literally in a future pass.

## 6. Component Composition Rules

Reusable primitives live in `components/ui/` with a fixed variant signature — feature components
compose them rather than repeating the border/bg/padding utility chain inline.

| Component | Signature | Notes |
|---|---|---|
| `Button` | `variant: "primary" \| "secondary" \| "ghost"`, `size: "sm" \| "md" \| "lg"`, `icon?: ReactNode`, `iconPosition?: "left" \| "right"`, `loading?: boolean`, `fullWidth?: boolean`, plus `href` (renders as a `next/link`) or native button props | `primary` = filled signal (main CTA); `secondary` = hairline border (alternate action); `ghost` = borderless text action. `loading` swaps the icon for a spinner and disables the control. Carries the tactile press micro-interaction (see #7). `icon` takes an already-rendered element (e.g. `<PlayCircle className="h-4 w-4" />`), not a component reference — a bare component can't cross a Server → Client boundary as a prop, a rendered element can. |
| `Card` / `BentoGrid` | `Card`: `interactive?: boolean`, `padding?: "sm" \| "md"`, `bordered?: boolean`. `BentoGrid`: plain grid wrapper | `Card` alone (`bordered` default `true`) is a standalone bordered panel (forms, modals). Inside `<BentoGrid>`, cells render `bordered={false}` — the grid's own `gap-px` + `bg-hairline` supplies the hairlines between cells. |
| `Input` / `Textarea` | `error?: boolean` + native input/textarea props | Shared focus micro-interaction (see #7). Set `error` to switch the border to `rose-800` next to inline validation copy. |

Rule of thumb: if a feature component is about to write `border border-hairline bg-surface p-…` or
`border border-signal bg-signal px-… py-… text-obsidian` inline, it should be reaching for `Card`
or `Button` instead.

## 7. Animation Guidelines (GSAP)

Motion tokens and hooks live in `lib/motion.ts` (`EASE`, `DURATION`, `prefersReducedMotion`,
GSAP + `useGSAP` re-exports) and `hooks/useReveal.ts` (`useRevealOnMount`, `useStaggerReveal`).
Every GSAP call in the app should pull from these rather than hand-rolling eases/durations inline.

- **Scope.** GSAP powers nav, marketing/catalog surfaces, modals, and form micro-interactions —
  the presentational layer. The stateful simulation product (`components/simulations/*`,
  `SimulationShell`, `ResultsDashboard`, `app/demo/DemoPageClient.tsx`,
  `app/simulations/[sessionId]/page.tsx`) stays on `framer-motion`, since its motion is wired
  directly into `AnimatePresence` step-transition state machines. Don't migrate those piecemeal —
  if that product surface is rebuilt wholesale, GSAP can absorb it then.
- **Tokens.** `EASE.entrance` (`power2.out`) for things settling into view, `EASE.tactile`
  (`power3.out`) for press/focus feedback, `EASE.snap` (`power2.inOut`) for open/close toggles.
  `DURATION.fast` (0.15s) for tactile feedback, `DURATION.base` (0.32s) for card entrances and the
  nav menu, `DURATION.slow` (0.45s) for modal/page-section entrances.
  `hooks/useReveal.ts` — `useRevealOnMount` (single element, mount fade+rise, optional `scale` for
  modal panels) and `useStaggerReveal` (staggers `[data-reveal-item]` children, re-run by passing a
  `deps` key such as a filtered-list signature) cover the common cases; reach for a raw `gsap`
  call only when neither fits.
- **Server components.** `useRevealOnMount`/`useStaggerReveal` are hooks, so a Server Component
  wraps the section it wants animated in the client islands `components/motion/Reveal.tsx` /
  `RevealGrid.tsx` instead of becoming a client component itself.
- **Cleanup.** Always animate through `useGSAP` (scoped to a ref) rather than a bare `useEffect` +
  `gsap.to` — `useGSAP` reverts its context automatically on unmount/dependency change.
- **Reduced motion.** Every entrance/tactile animation must check `prefersReducedMotion()` and
  no-op (or `gsap.set` straight to the end state) when it's true.
- **Performance targets.** Animate `transform`/`opacity`/`boxShadow` only — GPU-compositable,
  never triggers layout (`width`/`top`/`left` are off-limits). Target 60fps; keep entrances
  ≤0.5s and tactile feedback ≤0.2s so nothing reads as laggy.

## 8. Components covered

- `components/ui/Button.tsx`, `components/ui/Card.tsx` (`Card` + `BentoGrid`), `components/ui/Input.tsx`
  (`Input` + `Textarea`) — shared primitives, see #6.
- `lib/motion.ts`, `hooks/useReveal.ts`, `components/motion/Reveal.tsx`, `components/motion/RevealGrid.tsx`
  — GSAP tokens/hooks/client-islands, see #7.
- `components/Navbar.tsx` — header telemetry bar; mobile menu now opens/closes on a GSAP height+opacity
  timeline instead of an instant conditional render.
- `components/simulations/SimulationShell.tsx` — tactical decision shell (framer-motion, see #7 scope note).
- `app/catalog/CatalogPageClient.tsx` — bento catalog grid, rebuilt on `Card`/`BentoGrid`/`Input`/`Button`
  with a GSAP stagger reveal that re-runs on filter/search changes.
- `components/results/ResultsDashboard.tsx`, `components/results/EvaluationTrigger.tsx` — scorecard +
  pending-eval state (framer-motion, see #7 scope note).
- `app/page.tsx`, `components/ContactForm.tsx` — landing page + contact form; hero and process-step bento
  now GSAP entrances via `Reveal`/`RevealGrid`, form fields on `Input`/`Textarea`/`Button`.
- `app/demo/DemoPageClient.tsx` (framer-motion, see #7 scope note), `components/PreSimPrepModal.tsx`
  (migrated to GSAP entrance + `Button`) — demo career picker + briefing/prep modals.
- `app/request/RequestPageClient.tsx`, `components/RequestForm.tsx` — request-a-career flow, rebuilt on
  `Card`/`Input`/`Button`.
- `app/history/page.tsx` — session history.
- `app/simulations/[sessionId]/page.tsx`, `app/simulations/preview/page.tsx` — live shell wrapper + internal
  preview tool (framer-motion, see #7 scope note).
- `components/Footer.tsx`, `components/Logo.tsx` (`inverted` variant), `app/layout.tsx`, `app/globals.css` — global shell.

`/login`, `/signup`, `/privacy`, and `/terms` are the only remaining light-themed routes — out of
scope for both design passes so far.
