# Initiative: Lightweight Mobile Section Editor + Pinch Zoom

**Status**: Built on `feat/mobile-editor-shell` — awaiting owner testing on a real phone
(2026-10-30).

## Problem

At phone width the section editor was the desktop modal shrunk down: backdrop margins, a
title + filing header, and a footer whose Copy / Copy as Markdown / Download CSV / Cancel /
Save buttons wrapped to 2–3 rows. Together that chrome took ~40–50% of a 390×844 screen.

## Decisions (owner, 2026-10-30)

- **Breakpoint: below `lg` (1024px)** — the same `useIsDesktop` line the desktop fullscreen
  mode uses, so tablets get the mobile shell too.
- **Pinch only** for zoom — no on-screen zoom buttons ("buttons are clutter").
- **Range 50%–200%.**

## What it does

- `MobileEditorShell` (`jotter-react/src/components/sections/MobileEditorShell.tsx`)
  replaces the modal below 1024px: full-screen page, one 48px top bar — back (= save &
  close), title, ⋮ menu (filing, copy actions, "Close without saving"). No footer.
  `SectionEditorModal` keeps all save/cancel/conflict logic; only the chrome differs.
- `usePinchZoom` (`jotter-react/src/lib/util/usePinchZoom.ts`) adds two-finger zoom to the
  editors with no zoom of their own: text, code, markdown, checklist, calendar. Diagram,
  table and timeline already zoom natively and are untouched. The level persists per
  section type in localStorage (`jotter_editor_zoom_<type>`).
- Zoom scales only each editor's **content** (CSS `zoom` via `--editor-zoom`, rule in
  `index.css`): `.tiptap-scroll`, `.cm-editor`, `.markdown-preview`, or a
  `[data-zoom-target]` element. Editor toolbars stay full size.
- A pinch's finger events are swallowed so they don't also register as taps (e.g. the
  calendar selecting a day).
- The timeline's mouse/keyboard help line is hidden below `lg`.

## Desktop

Unchanged — windowed modal + fullscreen focus mode (`fullscreen-focus-mode.md`).
