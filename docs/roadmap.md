# Jotter Roadmap

**Last Updated**: 2024-11-28

---

## Overview

This document outlines the development roadmap for Jotter, from initial public release through paid feature development. The strategy is: ship early, gather feedback, iterate.

---

## Phases

### Phase 0: Initial Release (Current)

**Goal**: Ship the current feature set and start gathering user feedback.

**Status**: In Progress

**Tasks**:
- [ ] Add Ko-fi support link to login/about page
- [ ] Final testing and bug fixes
- [ ] Deploy to production
- [ ] Announce release (social media, dev communities)

**Features Included**:
- Text (WYSIWYG) sections
- Code sections with syntax highlighting
- Checklist sections with priorities and due dates
- Diagram sections (Excalidraw)
- Collection and container organization
- Drag-and-drop reordering
- Mobile-responsive UI

**Infrastructure**: SvelteKit + Supabase (no custom backend)

---

### Phase 1: Free Enhancements

**Goal**: Add high-value features that developers expect, without requiring backend changes.

**Status**: Planned

**Timeline**: After initial release, based on user feedback priority

**Features**: See [`docs/features/free-enhancements.md`](./features/free-enhancements.md)

| Feature | Complexity | Priority |
|---------|------------|----------|
| Copy text as Markdown | Low | High |
| Advanced section picker UI | Low | Medium |
| Image section (paste from clipboard) | Medium | High |
| Markdown section (side-by-side editor) | Medium | High |
| Public collection sharing | Medium | Medium |

**Infrastructure**: Still SvelteKit + Supabase only

---

### Phase 2: Backend & Payment Infrastructure

**Goal**: Build the foundation for paid features.

**Status**: Future

**Timeline**: After validating demand from Phase 1 users

**Tasks**:
- [ ] Build Node.js/Fastify API server
- [ ] Migrate database from Supabase to self-hosted PostgreSQL
- [ ] Keep Supabase for authentication only
- [ ] Integrate Stripe for payments
- [ ] Implement license/subscription management
- [ ] Set up email service for notifications

**Architecture**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SvelteKit │────▶│  Your API   │────▶│ PostgreSQL  │
│   Frontend  │     │  (Fastify)  │     │ (self-host) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
             ┌───────────┐  ┌──────────┐
             │ Supabase  │  │  Stripe  │
             │ Auth Only │  │ Payments │
             └───────────┘  └──────────┘
```

---

### Phase 3: Paid Features

**Goal**: Monetize with premium features that justify the cost.

**Status**: Future

**Timeline**: After backend infrastructure is stable

**Features**: See [`docs/features/paid-features.md`](./features/paid-features.md)

| Feature | Complexity | Tier |
|---------|------------|------|
| User-to-user sharing | High | Pro |
| Table section with exports | Medium-High | Pro |
| File upload section | High | Pro |
| Image editing (crop/rotate) | Medium | Pro |
| Activity log | Medium | Pro |
| Real-time collaboration | Very High | Team |

**Pricing Model** (tentative):
- **Free**: Current features + Phase 1 enhancements
- **Pro**: Per-user monthly/annual or one-time purchase
- **Team**: Per-seat pricing for collaboration features

---

## Decision Points

These are key decisions to make at each phase:

### Before Phase 1
- Which free features have the most demand? (gather from feedback)
- Is public sharing more important than new section types?

### Before Phase 2
- Is there enough interest in paid features to justify backend investment?
- What's the right pricing model? (subscription vs one-time)
- Self-host vs managed services for the backend?

### Before Phase 3
- Which paid features should launch first?
- What's the minimum viable "Pro" tier?
- Is there demand for team/collaboration features?

---

## Non-Goals (For Now)

These are explicitly out of scope to avoid feature creep:

- Native mobile apps (web is mobile-responsive)
- Offline mode / PWA (requires significant architecture changes)
- Plugin/extension system
- AI features (summarization, etc.)
- Import from other note apps

These could be revisited based on user demand.

---

## Related Documents

- [`docs/features/free-enhancements.md`](./features/free-enhancements.md) - Detailed specs for Phase 1 features
- [`docs/features/paid-features.md`](./features/paid-features.md) - Detailed specs for Phase 3 features
- [`docs/ai_project_status.md`](./ai_project_status.md) - Current development status
- [`docs/project_overview.md`](./project_overview.md) - Project vision and goals

---

## Changelog

| Date | Change |
|------|--------|
| 2024-11-28 | Initial roadmap created |
