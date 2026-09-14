# CareerSim Design System — "Command Console"

A high-contrast, Swiss-editorial, high-density visual language for tactical decision-making
interfaces. This document is the source of truth for Phase 3+ component work. New UI must be
checked against it before merging.

## 1. Typography

| Role | Font | CSS var | Tailwind utility |
|---|---|---|---|
| Display / headings / nav / buttons | `Space Grotesk` | `--font-display` | `font-display` |
| Metadata, telemetry, shortcuts, step indicators, metrics | `JetBrains Mono` | `--font-mono` | `font-mono` |
| Body copy (legacy light-theme pages not yet migrated) | `Geist Sans` | `--font-sans` | `font-sans` |

- Metadata is always uppercase, tracked-out (`tracking-wide`), and bracketed where it reads as a
  system value: `[SYS_ONLINE]`, `[TRACK: VC_ASSOCIATE]`, `[STEP: 02/05]`, `[1]`.
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

These tokens are additive — legacy light-theme pages (Home, Demo, Request, History, Footer) keep
their existing `--background`/`--foreground` light tokens and slate/indigo classes until migrated;
this pass covers Navbar, SimulationShell, Catalog, and the Results scorecard only.

## 3. Visual Language

- **Hairline bento grids**: every card/panel is a 1px `border-hairline` rectangle. No shadows, no
  elevation. Depth comes from contrast (`obsidian` vs `surface`), never `box-shadow`.
- **Zero soft pill buttons**: buttons and tags are rectangular or, at most, `rounded-sm` (2px).
  Never `rounded-full`.
- **Zero gradients**: no purple/pink gradients, no generic corporate blue. Every fill is a flat
  token color.
- **Motion**: physical, not decorative. Tactile spring transitions (`stiffness: 400, damping: 25`)
  on interactive elements; entrance animations are functional (bars filling to a value, counters
  ticking) not ornamental.
- **Density over whitespace**: metadata blocks, HUD strips, and matrices pack information at a
  small type scale (`text-[10px]`–`text-xs`) rather than spacing it out.

## 4. Negative Constraints — strictly forbidden

- Generic SaaS tropes (soft gradient hero blobs, oversized rounded cards floating on white).
- Floating modals that cover content — use inline panels or dedicated routes instead.
- Rounded pill tags/badges (`rounded-full`) — use rectangular or `rounded-sm` tags.
- Emoji-heavy marketing copy.
- Purple/pink gradients or generic corporate blue as an accent.
- Elevated box-shadows as a substitute for a hairline border.

## 5. Components covered by this pass

- `components/Navbar.tsx` — header telemetry bar.
- `components/simulations/SimulationShell.tsx` — tactical decision shell.
- `app/catalog/CatalogPageClient.tsx` — bento catalog grid.
- `components/results/ResultsDashboard.tsx` — data-dense scorecard.

Everything else in the app intentionally retains its current light theme until a follow-up pass
extends this system further.
