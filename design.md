# CareerSim Design System — "Command Console"

A high-contrast, Swiss-editorial, high-density visual language for tactical decision-making
interfaces. This document is the source of truth for Phase 3+ component work. New UI must be
checked against it before merging.

> **2026-11-10 rebrand:** the accent and surface palette moved from Midnight Obsidian + Amber Signal
> to Midnight Blue + White + Soft Pink (see §2). Token *names* (`obsidian`/`surface`/`hairline`/
> `ink`/`signal`) are unchanged - only their underlying hex values moved - so every existing
> component re-themes automatically rather than needing a per-file color swap. Everything else in
> this document (hairline borders over shadows, no gradients, no pill shapes, density, GSAP/
> framer-motion scope split) still holds; only the specific hex values and the "no pink" negative
> constraint were superseded.
>
> **2026-11-10, later the same day — Desktop OS Shell pass:** a second, narrower revision on top of
> the above. `obsidian` deepened from Midnight Blue to a true near-black void (`#050505`) as the
> *viewport backdrop*, with Midnight Blue (`surface`) demoted to card/container surfaces only - so
> the same two tokens now read as "void" vs. "card" rather than "dark" vs. "darker." `base-black`,
> `midnight-blue`, and `hot-pink` were added as literal aliases of `obsidian`/`surface`/`signal`
> (same values, alternate spelling - see §2), since new code is written against those names. Two
> narrow, explicit exceptions were carved into §4's negative constraints: a **primary CTA button**
> may now be `rounded-full` with a soft hover glow (`hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]`),
> and simulation-workbench cards may use `rounded-2xl`/`rounded-3xl` instead of `rounded-lg`. Neither
> exception extends to secondary/ghost buttons, tags, or the dark Command Console shell's own cards,
> which stay rectangular/`rounded-sm` and shadow-free as before. See §10 for the Desktop OS Shell
> (`WorkspaceShell`) rebuild this pass also covers.

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
| `--color-obsidian` (alias: `--color-base-black`) | `#050505` | `bg-obsidian` / `bg-base-black` | App-level viewport backdrop (near-black void) |
| `--color-surface` (alias: `--color-midnight-blue`) | `#1C2541` | `bg-surface` / `bg-midnight-blue` | Panels, cards, elevated bento cells (Midnight Blue) |
| `--color-hairline` | `#2E3A59` | `border-hairline` | 1px dividers, card borders, grid lines |
| `--color-ink` | `#F8FAFC` | `text-ink` | Primary text on dark surfaces (crisp white) |
| `--color-signal` (alias: `--color-hot-pink`) | `#EC4899` | `bg-signal` / `text-signal` / `border-signal` / `ring-signal` / `bg-hot-pink` / `border-hot-pink` | The **single** accent — active state, focus rings, live/hot badges, hotkey highlights, primary CTA fill |

Signal is soft pink (`#EC4899`), the one deliberate break from the prior all-grayscale-plus-amber
system - it's the sole warm, saturated color in the UI, so it still reads as *the* accent rather
than one color among several. It is spent just as sparingly as the amber signal it replaced: one
accent per view, never a pink AND a separate colored badge system competing for attention. Status
other than "active/live" stays grayscale (`slate-400`/`slate-500` on dark, muted borders) rather
than reaching for green/red/blue - the light-surface simulation workbenches (white cards on
Midnight Blue canvases) are the one place semantic green/amber/rose are still allowed, for
financial-risk and trend indicators specifically (see §9).

On light (white) surfaces - the simulation workbenches, not the dark Command Console shell -
primary text uses Deep Navy (`#0F172A`, i.e. `text-slate-900`) rather than `ink`, which is tuned for
dark backgrounds only.

`--background`/`--foreground` (the root CSS vars driving the plain `body` rule) now point at
`obsidian`/`ink` too, so the whole site defaults to dark. Only `/login`, `/signup`, `/privacy`,
and `/terms` were left out of this migration (unrequested utility/legal routes) — they keep their
own light-themed wrapper `div`s, which now sit on a dark page-level gutter instead of a white one.

## 3. Visual Language

- **Hairline bento grids**: every card/panel is a 1px `border-hairline` rectangle. No shadows, no
  elevation. Depth comes from contrast (`obsidian` vs `surface`), never `box-shadow` - **except** a
  primary CTA button's soft hover glow (see §4's exception) and a workbench card's `rounded-2xl`/
  `rounded-3xl` corners (see §9), both narrow, explicit carve-outs, not a general license.
- **Zero soft pill buttons**: buttons and tags are rectangular or, at most, `rounded-sm` (2px).
  Never `rounded-full` — **except** the primary CTA button variant (see §4).
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
- Rounded pill tags/badges (`rounded-full`) — use rectangular or `rounded-sm` tags. **Exception**:
  the `Button` primitive's `primary` variant is `rounded-full` with a restrained hover-only glow
  (`hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:scale-[1.02]`) - a single named exception, not
  a precedent for pill-shaping tags, badges, or any other button variant.
- Emoji-heavy marketing copy.
- Gradients of any kind (pink/pastel included) — every fill stays a flat token color, pink signal
  included.
- Elevated box-shadows as a substitute for a hairline border — **except** the primary CTA hover glow
  immediately above, which is additive to (never a replacement for) its hairline/pink border. This
  now also applies to the simulation workbenches (see §9), which previously used ad hoc
  `shadow-lg`/`shadow-2xl` with no such exception.
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

## 9. Simulation Workbenches (light-surface tracks)

The five career workbenches (`VCWorkbench`, `QuantWorkbench`, `CyberWorkbench`, `PMWorkbench`,
`LegalWorkbench`), their parent `*SimulationView` components, and the shared
`components/workspace/*` shell (`WorkspaceShell`, `CountdownTimer`) run on white card canvases
rather than the dark Command Console shell - a deliberate, pre-existing split (a "productivity
tool" register vs. the marketing/dashboard shell), reaffirmed rather than removed by the 2026-11-10
rebrand.

- **Accent**: `signal` (pink) replaces every prior `indigo-*` interactive accent - active tabs,
  primary buttons, slider thumbs (`accent-signal`), focus rings (`focus-visible:ring-signal`/
  `focus:border-signal`), chart primary lines. Same one-accent-per-view discipline as §2.
- **Dark chrome within a light workbench** (toggle-button stacks, drawer header bars, chat bubbles,
  the VC Data Room deck panel) now pulls from `obsidian`/`surface`/`hairline`/`ink` instead of
  hardcoded `slate-900`/`slate-800`, so it reskins for free the same way the dark shell does.
- **Financial semantics stay semantic**: risk scores, trend arrows, and diligence-flag banners keep
  `emerald`/`amber`/`rose` - those convey real meaning (safe/caution/danger), not decoration, and
  aren't part of the one-accent rule.
- **No shadows**: `shadow-lg`/`shadow-2xl`/`shadow-sm` are replaced with a `border-hairline` (or
  `border-slate-200` on a white card) plus, where elevation still needs to read, a `ring-1
  ring-signal/15` rather than a drop shadow - consistent with §4's box-shadow ban, which now
  applies here too (the primary-CTA hover glow is still the one named exception, not a general one).
- **Corners**: cards use `rounded-2xl`/`rounded-3xl` (not the Command Console shell's flat
  `rounded-lg`) as of the Desktop OS Shell pass - a deliberate softer register for this
  "productivity tool" surface, not a repeal of §4's pill-shape ban on buttons/tags.
- **Spacing**: card padding moved from `p-4`/`p-6` to `p-8` and internal gaps from `gap-3`-`gap-6` to
  `gap-8` across the five workbenches and the workspace shell, per the 2026-11-10 decluttering pass.

## 10. Desktop OS Shell (`WorkspaceShell`)

`components/workspace/WorkspaceShell.tsx` wraps every career track's canvas (via `SimulationShell`)
in a simulated desktop/browser chrome rather than a bare tab switcher:

- **Window chrome**: a macOS-style top bar with three traffic-light dots (non-functional - purely
  atmospheric, never wired to real window controls) and a centered tab title naming the current
  step's tool, on a `surface`/`midnight-blue` bar over the `obsidian`/`base-black` backdrop.
- **Persistent 3-panel grid**, replacing the old click-to-switch Workspace/Team Chat/Inbox tabs
  (which hid two of the three tools behind a click and were the direct cause of the "overlapping
  drawer" complaints this pass fixes): a fixed-width **left** Comms Hub (merged chat + inbox feed,
  always visible), a flexible **center** canvas (the role-specific tool, unchanged), and a
  fixed-width **right** Notes & Status panel (crisis countdown when present, a lightweight session
  scratchpad, and simple activity counts). Nothing is hidden behind a tab anymore, so nothing can
  visually collide with its own toggle.
- Below `lg`, the three panels stack vertically (canvas first) rather than attempting a cramped
  3-column layout on a narrow viewport.

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
