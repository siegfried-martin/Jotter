# Initiative: Fullscreen Focus Mode for the Section Editor

**Status**: Built on `feat/fullscreen-focus-mode` — awaiting owner hands-on testing before
merge (2026-06-24). Signed off the same day. 50 unit + 81 e2e green (3 new fullscreen specs).
**Feature**: A desktop-only **fullscreen / focus mode** for the section-editor modal, applied
**once to the modal shell** so all eight section types get it at no per-type cost.
**Predecessors**: The section-editor modal (`src/routes/sectionEditor.tsx`) and all editor
types are live. This is purely additive chrome around them — the non-fullscreen experience is
untouched.

## The idea

Today the editor is a `95vw × 90vh` modal with three stacked regions:

- **Header** — title input + `SectionFiling` (`sectionEditor.tsx:505`)
- **Body** — the per-type editor, `flex-1` (`:514`)
- **Footer** — Copy / Copy-as-Markdown / Download-CSV on the left, **Cancel / Save** right (`:562`)

Fullscreen mode expands the modal to fill the viewport and **maximizes the body** by hiding
the header and footer. They don't disappear for good — they collapse into an **auto-hiding
chrome layer** that you summon back on demand, Chrome-Remote-Desktop style: hover a screen
edge, a small semi-transparent chevron tab appears, and it slides the chrome in as an
**overlay** over the body. Click the body (or `Esc`) and the chrome hides again.

Inspiration: Chrome Remote Desktop's session-options dock — a hover-revealed edge tab with an
inward chevron. Distraction-free writing modes (iA Writer, Notion full-page) are the same
shape.

## Decisions (locked with owner, 2026-06-24)

- **Coupled chrome, not two independent drawers.** Header and footer reveal and hide
  **together** as one layer. This is simpler (state is a single `chromeVisible: boolean`, not
  a `'header' | 'footer' | null` machine) and — critically — it keeps **Save reachable**:
  summoning chrome always shows the footer, so Save is never hidden behind "the other drawer."
- **Two edge tabs, either reveals both.** A semi-transparent chevron tab at **top-center**
  and **bottom-center** (chevrons pointing inward). Hovering/clicking *either* reveals the
  whole chrome layer — so the affordance is discoverable from wherever the cursor is.
- **Overlay, not push.** Chrome slides over the body rather than resizing it (resizing would
  defeat "maximize the body"). The reveal is transient — open, act, it auto-hides — so the
  brief occlusion of an editor's own bottom controls is acceptable. (Checked: Excalidraw has
  no bottom dock in our build; Univer table tabs / Calendar toolbar are only covered while
  chrome is open.)
- **Desktop only.** Gate on viewport / pointer; mobile keeps today's modal. Consistent with
  the existing desktop-first posture for the heavier editors.
- **Simple in-page fullscreen, not the browser Fullscreen API.** Expand the modal to
  `100vw × 100vh` within the page. No fullscreen-permission quirks, and it composes with the
  existing z-index stack (modal `z-50`, conflict dialog `z-70`; chrome overlay slots ~`z-60`).
  True OS-level fullscreen can come later if wanted.

## Interaction model

- **Enter fullscreen:** a toggle button in the normal header (an expand icon). Ephemeral —
  not persisted per section in v1.
- **Reveal chrome:** hover either edge tab → click (or hover) → header + footer slide in over
  the body.
- **Dismiss chrome:** click the body, or `Esc`.
- **Save:** `Ctrl/Cmd+S` saves-and-closes from anywhere (same action as today's Save button),
  so the action never depends on chrome being visible.
- **`Esc` layering** (steps down one level per press): chrome open → hide chrome; else
  fullscreen → exit fullscreen (back to the `95vw × 90vh` modal); else → close the modal
  (today's behavior). Must sit correctly under the existing Esc consumers (the conflict dialog
  and the Calendar create-form's capture-phase handler).

## Implementation sketch

- A single wrapper in `SectionEditorModal` holds `isFullscreen` and `chromeVisible`. In
  fullscreen the outer modal box switches to `100vw × 100vh`; the header and footer become
  absolutely-positioned overlay bands that translate in/out on `chromeVisible`; the body is
  the full-viewport layer beneath.
- Edge tabs are two small fixed/absolute hover targets; a click toggles `chromeVisible`.
- Keyboard: extend the existing key handling for `Ctrl/Cmd+S` and the `Esc` step-down.
- No data, schema, or per-type editor changes. No migration.

## Scope / non-goals (v1)

- No browser Fullscreen API; no persisting the fullscreen preference across opens.
- No independent header/footer drawers (coupled only).
- No mobile fullscreen.
- No hover-to-open without the visible tab (tab-click is the contract; hover-open is a
  possible later refinement).

## Testing

- Unit/interaction: enter/exit fullscreen, chrome reveal/hide on edge-tab click, body-click
  dismiss, the `Esc` step-down order, `Ctrl/Cmd+S` saves while chrome hidden.
- e2e (desktop project): open a section, toggle fullscreen, summon chrome, edit the title,
  save via keyboard with chrome hidden, and confirm the round-trip — plus that the
  non-fullscreen path is unchanged.
