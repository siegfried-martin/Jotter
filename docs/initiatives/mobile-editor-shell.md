# Initiative: Full-Screen Section Editor Shell + Pinch Zoom

**Status**: Mobile shell shipped (PR #32, 2026-10-30). Same day the owner made it the editor
view at **every** screen size (`feat/editor-shell-everywhere`), replacing the desktop modal
and removing fullscreen focus mode.

## Problem

At phone width the section editor was the desktop modal shrunk down: backdrop margins, a
title + filing header, and a footer whose Copy / Copy as Markdown / Download CSV / Cancel /
Save buttons wrapped to 2–3 rows. Together that chrome took ~40–50% of a 390×844 screen.

## Decisions (owner, 2026-10-30)

- **Breakpoint: below `lg` (1024px)** at first; then **no breakpoint** — "it should just be
  the new default view, we are wasting space in the other views also". The windowed modal
  and fullscreen focus mode were removed.
- **Pinch only** for zoom — no on-screen zoom buttons ("buttons are clutter").
- **Range 50%–200%.**

## What it does

- `EditorShell` (`jotter-react/src/components/sections/EditorShell.tsx`) is the editor's
  only chrome: full-screen page, one 48px top bar — back (= save & close), title, ⋮ menu
  (filing, copy actions, "Close without saving"). No footer, no backdrop.
  `SectionEditorPage` (`routes/sectionEditor.tsx`) holds the save/cancel/conflict logic.
  Escape and Ctrl/Cmd+S still save & close (Escape stays with the table editor).
- `usePinchZoom` (`jotter-react/src/lib/util/usePinchZoom.ts`) adds two-finger zoom to the
  editors with no zoom of their own: text, code, markdown, checklist, calendar. Diagram
  and timeline already zoom natively and are untouched. The level persists per
  section type in localStorage (`jotter_editor_zoom_<type>`).
- Zoom scales only each editor's **content** (CSS `zoom` via `--editor-zoom`, rule in
  `index.css`): `.tiptap-scroll`, `.cm-editor`, `.markdown-preview`, or a
  `[data-zoom-target]` element. Editor toolbars stay full size.
- A pinch's finger events are swallowed so they don't also register as taps (e.g. the
  calendar selecting a day).
- Table (Univer's desktop UI, which has no touch scrolling) gets its own touch handling in
  `TableEditor.tsx`: one finger selects or drags a range, as before; tapping the
  already-selected cell edits it, and only then does the keyboard come up (`tapToEdit`).
  Two fingers pan the grid and pinch-zoom it (Univer's own zoom, 50–200%)
  (`twoFingerScroll`). Once a second finger lands, every touch event until all fingers lift
  belongs to the gesture.
- The timeline's mouse/keyboard help line is hidden below `lg`.

## Desktop

Same shell. Pinch zoom listens to touch events, so it only applies on touchscreens; desktop
keeps the browser's own zoom. The markdown editor's Split view is still desktop-only.
Fullscreen focus mode (`fullscreen-focus-mode.md`) is superseded and removed.
