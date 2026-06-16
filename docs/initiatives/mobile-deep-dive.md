# Initiative: Mobile Deep Dive (Audit-Driven)

**Status**: Planned / Not Started
**Priority**: Medium
**Owner request date**: 2026-06-16
**Goal**: Systematically audit Jotter's mobile experience using screenshots captured from
the existing test flows, identify concrete improvements, and execute them — with a review
gate between analysis and execution.

> **Note on intent**: The owner explicitly wants to test how well a screenshot-driven,
> agent-led process works for mobile polish — i.e. can the implementation agent
> self-direct from screenshots, or does it need explicit styling guidance? This initiative
> is structured to *answer that question*, not assume the answer. The audit output
> (findings) is the deliverable that tells us how much hand-holding the execution needs.

---

## How Good Is "Screenshot → Analyze → Execute"? (expectations)

Recorded so the executing agent calibrates appropriately:

- **Strong at detection**: horizontal overflow, truncation, cramped/overlapping elements,
  tap targets that are too small, wasted space, broken layouts.
- **Weak without guidance at**: prescription, prioritization, cross-screen consistency
  (spacing/type scale), aesthetic judgment, desktop-regression awareness.
- **Common failure modes**: scattershot fixes that don't compose, "fixing" things that
  were fine, inconsistent spacing scales, desktop regressions, hallucinated problems.
- **Therefore**: this initiative uses a **two-phase audit → review → execute** flow with a
  **heuristics checklist** and **deterministic checks**, not a single autonomous pass.

---

## Objectives

1. **Capture** a consistent mobile screenshot set across key screens and flows.
2. **Analyze** each against a defined heuristics checklist + deterministic measurements.
3. **Produce a reviewable punch list** of findings with proposed fixes (the review gate).
4. **Execute** approved fixes without regressing desktop.
5. **Verify** with before/after screenshots and the E2E suite.

---

## Target Viewports / Devices

- **360 × 800** (small Android, the historic stress case used in prior mobile work)
- **390 × 844** (modern iPhone)
- **768 × 1024** (tablet / breakpoint boundary)

Use Playwright device emulation / viewport sizing to generate screenshots deterministically.

---

## Build On What Exists (don't re-do)

A mobile pass was already done (Nov 28, 2025) — start from current state, not zero:

- `src/lib/utils/deviceUtils.ts` — `isTouchDevice` store (DnD disabled on touch).
- `CollectionTabs.svelte` — tabs → dropdown under 640px.
- `ContainerSidebar.svelte` — reduced widths under 400px.
- `ContainerPageLayout.svelte` — reduced padding on mobile.
- `SectionGrid.svelte` — tighter grid on small screens.

Treat these as the baseline conventions; extend them consistently rather than inventing
new patterns.

---

## Heuristics Checklist (definition of "improvement")

- No **horizontal scroll** at any target viewport.
- Interactive tap targets **≥ 44 × 44px** with adequate spacing.
- Body text **≥ 14–16px**; no sub-readable text.
- No **truncation/overlap** of titles, tabs, buttons, or content.
- Content uses available width; **no large dead margins** on small screens.
- Editors (code, rich text, diagram, checklist) are usable one-handed; toolbars don't
  overflow.
- Modals/menus (user menu, create forms, migration prompt, privacy banner) fit and are
  dismissible within thumb reach.
- **Desktop layout unchanged** by any mobile fix (verify at ≥ 1024px).

---

## Screens / Flows to Capture

- Landing / login (`/`, `/auth/login`)
- Collections grid (`/app`)
- Container page: sidebar + section grid
- Each section card type (code, wysiwyg, checklist, diagram preview)
- Each editor (CodeMirror, Quill, Excalidraw, Checklist)
- Create flows (collection, section), inline title edit
- User menu, settings, about, privacy banner, migration prompt

---

## Tasks

### Phase 1 — Capture
- [ ] Add/extend a Playwright script to screenshot the screens above at all target
      viewports (reuse existing E2E setup/auth).
- [ ] Save into a dated folder (e.g. `docs/mobile-audit/<date>/`) for before/after diffing.

### Phase 2 — Analyze (produce the punch list)
- [ ] For each screenshot, evaluate against the heuristics checklist.
- [ ] Add deterministic checks: detect horizontal overflow and measure tap-target sizes
      programmatically (more reliable than vision alone).
- [ ] Output a **findings document**: screen → issue → severity → proposed fix.
      **This is the review gate** — surface it to the owner before executing.

### Phase 3 — Execute (after review)
- [ ] Apply approved fixes, grouped by pattern (spacing scale, tap targets, overflow,
      typography) for consistency.
- [ ] Keep changes additive to existing mobile conventions; use shared Tailwind utilities,
      not one-off values.

### Phase 4 — Verify
- [ ] Re-capture screenshots; produce before/after comparison.
- [ ] Confirm **desktop unchanged** at ≥ 1024px.
- [ ] Run relevant E2E specs (mobile viewport where applicable).

---

## Success Criteria

- ✅ Screenshot set captured for all target viewports.
- ✅ Reviewable findings/punch-list produced before any code changes.
- ✅ All approved findings resolved; heuristics checklist passes.
- ✅ No desktop regressions; E2E suite green.
- ✅ Before/after evidence captured.
- ✅ A short retro answering: **how much explicit styling guidance did execution need?**
  (the original question behind this initiative).

---

## Sequencing Note (IMPORTANT — interacts with the React migration)

This is UI work, and a **React migration is planned** (`docs/initiatives/react-migration.md`),
which is **parity-only** (no UI changes during the rewrite). That creates a fork:

- **Option A (recommended): Audit now, execute in React.** Run Phases 1–2 against the
  current Svelte app to produce a **framework-neutral findings/punch-list**, then *apply
  the fixes while building the React components* (migration Phases 3–4) so they're born
  mobile-correct. Avoids doing mobile work twice.
- **Option B: Full audit + execute now in Svelte.** Justified only if mobile pain is acute
  in daily use and waiting for the migration is unacceptable. Downside: the styling work is
  largely thrown away at cutover.
- **Option C: Defer entirely until after cutover**, then run all four phases in React.

**Pending owner confirmation of which option.** Default assumption: **Option A**.

---

**Last Updated**: 2026-06-16
</content>
