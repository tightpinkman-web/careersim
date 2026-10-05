# Mindler Pilot Walkthrough

Live demo script for the partner entitlement layer (`lib/auth/entitlements.ts`). Covers the three
behaviors a Mindler/DPS stakeholder will want to see: domain auto-upgrade, the public demo cap,
and cohort-key redemption.

Seeded partner org (already in the production database):

| Field | Value |
|---|---|
| School | Delhi Public School, Vasant Kunj |
| Domains | `dpsvk.com`, `dpsvk.edu.in` |
| Access key | `MNDL-DPS2026` |
| Max students | 500 |

## Pre-flight (do this before the call, not during it)

1. Confirm sign-in works at all: `/signup` with a throwaway email, both Google and email/password.
   Auth has broken and been fixed multiple times in this project (see project memory
   `auth_gated_platform`) - verify live, don't assume it still works from a prior check.
2. Confirm the app is on the latest deploy (entitlement gating, Groq, Redis, PDF export phases).
3. Have two browser profiles/incognito windows ready: one for the `@dpsvk.edu.in` persona, one for
   the `@gmail.com` persona - avoids session bleed between the two demo beats.

## Beat 1 — Partner domain auto-upgrade (`@dpsvk.edu.in`)

1. Sign up at `/signup` with any address on `@dpsvk.edu.in` (e.g. `demo.student@dpsvk.edu.in`).
2. Open `/api/auth/entitlement` in a new tab (or check network tab on `/history`) - confirm
   `{"tier":"ENTERPRISE_STUDENT", ...}`. This happens on login with zero manual steps (see
   `getAuthenticatedStudent()` in `lib/authStudent.ts`) - domain match alone grants it.
3. Start any simulation from `/demo`. Play through **more than 3 steps** - there is no cap. This is
   the contrast point against Beat 2.

## Beat 2 — Public demo cap (`@gmail.com`)

1. In the second browser profile, sign up with a personal `@gmail.com` address.
2. Confirm `/api/auth/entitlement` returns `{"tier":"PUBLIC_DEMO", ...}`.
3. Start a simulation from `/demo` and complete **3 decision steps**.
4. On the 4th action attempt, the simulation blocks with the inline banner:
   > "Your school is currently on the demo tier. Ask your counselor or Mindler representative for
   > full enterprise access."
   This is a hard server-side cap (`DEMO_STEP_CAP` in `lib/auth/entitlements.ts`, enforced in
   `app/api/simulations/action/route.ts`) - it isn't a client-side UI limit that could be bypassed
   by replaying the request.

## Beat 3 — Cohort key redemption

1. Still signed in as the `@gmail.com` demo-tier user from Beat 2, go to `/history`.
2. Click **"Have a School Access Key?"**.
3. Enter `MNDL-DPS2026` and submit.
4. Confirm the modal shows "You're now enrolled under Delhi Public School, Vasant Kunj" and
   `/api/auth/entitlement` now returns `ENTERPRISE_STUDENT`.
5. Start a **new** simulation and play past step 3 - the cap is gone, same as Beat 1.

## Talking points while this runs

- The gate is enforced server-side on every `/action` call, not just at session start - a capped
  student can't route around it by holding an older session open.
- Domain upgrade and cohort-key upgrade both write to the same `Student.tier` / `Student.schoolId`
  columns - there's one entitlement model behind both paths, not two parallel systems.
- A capped demo session isn't wasted: it still produces a scored report through whatever steps the
  student completed, so there's no dead end to explain away.

## If something looks wrong mid-demo

- Entitlement stuck on `PUBLIC_DEMO` for the `@dpsvk.edu.in` persona: confirm the org record's
  `domains` array actually contains the exact domain used (`select domains from
  school_organizations;`) - a typo'd subdomain won't match.
- Cap not triggering at step 3: check `app/api/simulations/action` logs for `DEMO_CAP_REACHED` -
  if it's missing entirely, the signed-in student may already be `ENTERPRISE_STUDENT` from a
  previous test run on that same email; sign up fresh instead of reusing an account.
- Cohort key rejected as invalid: confirm `MNDL-DPS2026` matches exactly (case-sensitive, no
  trailing space) - `select "accessKey" from school_organizations;`.
