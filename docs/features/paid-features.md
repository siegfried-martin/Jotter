# Paid Feature Set

**Status**: Future Planning
**Priority**: After free release + user validation
**Dependencies**: Backend infrastructure, payment integration

---

## Overview

These features require additional infrastructure (backend API, payment processing) and represent the monetization path for Jotter. They should only be built after validating demand through the free release.

---

## Infrastructure Prerequisites

Before implementing paid features, the following infrastructure is needed:

### Backend API
- Node.js/Fastify or similar
- Handles business logic, event logging, file processing
- Connects to self-hosted PostgreSQL

### Database Migration
- Migrate from Supabase PostgreSQL to self-hosted PostgreSQL
- Keep Supabase for authentication only
- Enables cost control and full data ownership

### Payment Integration
- Stripe or similar for subscriptions/one-time purchases
- License key generation and validation
- Webhook handling for payment events

---

## Features

### 1. User-to-User Sharing

**Description**: Share collections or containers with specific users by email. Shared items appear in the recipient's collection list.

**User Story**: As a team lead, I want to share my documentation with specific team members so we can collaborate on notes.

**Implementation Notes**:
- Sharing model: `collection_shares` table with `collection_id`, `shared_with_user_id`, `permission` (read/edit)
- Invite flow: Enter email → send invite → recipient accepts
- Shared collections appear in a "Shared with me" section
- Permission levels: read-only, can edit

**Complexity**: High

**Backend Requirements**:
- Email service for sending invites
- Invitation token generation and validation
- Permission checking middleware

**Database Schema**:
```sql
CREATE TABLE collection_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id),
  owner_id UUID REFERENCES auth.users(id),
  shared_with_id UUID REFERENCES auth.users(id),
  permission VARCHAR(20) DEFAULT 'read', -- 'read' or 'edit'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(collection_id, shared_with_id)
);

CREATE TABLE share_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id),
  inviter_id UUID REFERENCES auth.users(id),
  invitee_email VARCHAR(255),
  permission VARCHAR(20) DEFAULT 'read',
  token VARCHAR(100) UNIQUE,
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. Table Section with Export

**Description**: New section type with a spreadsheet-like editor. Supports CSV, Excel, and Markdown export.

**User Story**: As a developer, I want to create and edit tables in my notes so I can document data structures, API responses, or comparison charts.

**Implementation Notes**:
- Editor options:
  - **Handsontable** - Excel-like, built-in export features
  - **AG Grid** - Enterprise-grade, more complex
- Features: Add/remove rows/columns, cell editing, basic formatting
- Export formats: CSV, XLSX (Excel), Markdown table

**Complexity**: Medium-High

**Technical Considerations**:
- Handsontable has a free tier with limitations
- Consider storing as JSON for flexibility
- Markdown export: pipe-delimited format

**Content Storage Format**:
```json
{
  "columns": ["Name", "Type", "Description"],
  "rows": [
    ["id", "UUID", "Primary key"],
    ["title", "VARCHAR", "Section title"]
  ],
  "headerRow": true
}
```

---

### 3. File Upload Section

**Description**: New section type for uploading and previewing files (PDFs, documents, audio, video).

**User Story**: As a developer, I want to attach reference files to my notes so I can keep documentation, specs, and assets together.

**Implementation Notes**:
- Drag-and-drop upload to section grid
- File type detection and appropriate preview:
  - PDF: Embedded viewer
  - Audio/Video: HTML5 player
  - Documents: Download link with icon
  - Images: Handled by Image section
- Section card shows file icon + filename
- Edit page shows full preview

**Complexity**: High

**Backend Requirements**:
- File upload handling
- Virus scanning (optional but recommended)
- Thumbnail generation for preview
- Storage management and quotas

**Technical Considerations**:
- File size limits
- Supported file types whitelist
- Storage costs
- CDN for file delivery

---

### 4. Image Editing

**Description**: Add basic editing capabilities to Image sections: crop, rotate, flip.

**User Story**: As a user, I want to quickly crop or rotate screenshots without leaving the app.

**Implementation Notes**:
- Library: **Cropper.js** or similar
- Operations: Crop, rotate 90°, flip horizontal/vertical
- Save creates new version (non-destructive option?)

**Complexity**: Medium

---

### 5. Event Log / Activity Feed

**Description**: Track and display activity on collections (edits, shares, views).

**User Story**: As a collection owner, I want to see who has accessed or modified my shared collections.

**Implementation Notes**:
- Log events: create, update, delete, share, view (for shared/public)
- Display in collection settings or dedicated activity page
- Retention policy for log entries

**Complexity**: Medium

**Backend Requirements**:
- Event ingestion API
- Event storage (could be separate table or time-series DB)
- Query API for activity feed

**Database Schema**:
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id),
  container_id UUID REFERENCES note_container(id),
  section_id UUID REFERENCES note_section(id),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50), -- 'create', 'update', 'delete', 'share', 'view'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_log_collection ON activity_log(collection_id, created_at DESC);
```

---

### 6. Real-Time Collaboration

**Description**: Multiple users can edit the same section simultaneously with live cursor/selection visibility.

**User Story**: As a team, we want to collaborate on notes in real-time like Google Docs.

**Implementation Notes**:
- Requires: WebSocket infrastructure, CRDT or OT algorithm
- Libraries: Yjs, Automerge
- Significant complexity increase

**Complexity**: Very High

**Note**: This is an aspirational feature. Consider carefully whether the market demands it before investing.

---

## Pricing Considerations

### Potential Tiers

**Free**:
- All current features
- Image paste, Markdown section
- Public sharing (read-only)

**Pro ($X/month or one-time)**:
- User-to-user sharing
- Table section with exports
- File uploads (with quota)
- Activity log

**Team ($Y/month)**:
- Everything in Pro
- Real-time collaboration
- Higher storage quotas
- Priority support

---

## Implementation Order (Suggested)

1. **Backend infrastructure** - Foundation for all paid features
2. **Payment integration** - Enable monetization
3. **User-to-user sharing** - Most requested sharing upgrade
4. **Table section** - High value for developers
5. **File uploads** - Completes the "attach anything" story
6. **Image editing** - Nice-to-have enhancement
7. **Activity log** - Important for shared/team use
8. **Real-time collaboration** - Only if strong demand

---

## Success Criteria

- Payment flow works reliably
- Sharing permissions are properly enforced
- File uploads are secure and performant
- Activity log doesn't impact app performance
- Clear upgrade prompts for free users
- Churn rate acceptable for sustainable business
