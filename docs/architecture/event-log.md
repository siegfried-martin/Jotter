# Event Log Architecture

**Status**: Planned
**Created**: January 2026

---

## Overview

Jotter uses a unified event log to track user actions across both demo and authenticated modes. This provides analytics, usage insights, and a foundation for future features like undo/redo, real-time sync, and audit trails.

## Design Principles

1. **Unified**: Same event log for demo users (user_id = NULL) and authenticated users
2. **Immutable**: Events are append-only, never updated or deleted
3. **Rich Context**: Events contain enough information to understand what happened without querying other tables
4. **Ordered**: Timestamp-based ordering, with optional entity versioning for conflict detection
5. **Privacy-Conscious**: No PII in event_data for demo users

## Schema

```sql
CREATE TABLE event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = demo user
  session_id uuid NOT NULL,           -- Client-generated, groups events in a session

  -- What
  event_type text NOT NULL,           -- 'collection.created', 'section.updated', etc.
  entity_type text,                   -- 'collection', 'container', 'section'
  entity_id uuid,                     -- The affected record's ID
  parent_id uuid,                     -- Parent entity (e.g., container_id for sections)

  -- Details
  event_data jsonb DEFAULT '{}',      -- Action-specific context

  -- When
  created_at timestamptz DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_event_log_user ON event_log (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_event_log_session ON event_log (session_id);
CREATE INDEX idx_event_log_created ON event_log (created_at);
CREATE INDEX idx_event_log_type ON event_log (event_type);
CREATE INDEX idx_event_log_entity ON event_log (entity_type, entity_id);
```

## Row Level Security

```sql
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (demo + authenticated)
CREATE POLICY "Anyone can insert events" ON event_log
  FOR INSERT WITH CHECK (true);

-- Users can only read their own events (for future activity feed)
CREATE POLICY "Users can read own events" ON event_log
  FOR SELECT USING (auth.uid() = user_id);

-- Admin analytics queries use service role key (bypasses RLS)
```

## Event Types

### Naming Convention

Format: `{entity}.{action}` in lowercase, dot-separated.

### Session Events

| Event Type | Description | event_data |
|------------|-------------|------------|
| `session.start` | User started a session | `{ "referrer": "reddit.com", "is_demo": true }` |
| `session.end` | User ended session (on page unload) | `{ "duration_seconds": 300 }` |

### Collection Events

| Event Type | Description | event_data |
|------------|-------------|------------|
| `collection.created` | New collection created | `{ "name": "...", "color": "..." }` |
| `collection.updated` | Collection modified | `{ "changes": { "name": { "from": "...", "to": "..." } } }` |
| `collection.deleted` | Collection deleted | `{ "name": "..." }` |
| `collection.reordered` | Collection order changed | `{ "from_index": 0, "to_index": 2 }` |

### Container Events

| Event Type | Description | event_data |
|------------|-------------|------------|
| `container.created` | New note container created | `{ "title": "..." }` |
| `container.updated` | Container modified | `{ "changes": { ... } }` |
| `container.deleted` | Container deleted | `{ "title": "...", "section_count": 3 }` |
| `container.moved` | Moved to different collection | `{ "from_collection": "...", "to_collection": "..." }` |
| `container.reordered` | Container order changed | `{ "from_index": 0, "to_index": 2 }` |

### Section Events

| Event Type | Description | event_data |
|------------|-------------|------------|
| `section.created` | New section created | `{ "type": "code", "language": "javascript" }` |
| `section.updated` | Section content edited | `{ "type": "code", "content_length": 500 }` |
| `section.deleted` | Section deleted | `{ "type": "checklist" }` |
| `section.moved` | Moved to different container | `{ "from_container": "...", "to_container": "..." }` |
| `section.reordered` | Section order changed | `{ "from_index": 0, "to_index": 2 }` |

### Auth Events

| Event Type | Description | event_data |
|------------|-------------|------------|
| `auth.signin_clicked` | Demo user clicked sign in | `{}` |
| `auth.converted` | Demo user completed signup | `{ "had_collections": 2, "had_containers": 5 }` |
| `auth.signout` | User signed out | `{}` |

## Privacy Considerations

### Demo Users (user_id = NULL)

- No PII collected
- Referrer stored as domain only (not full URL)
- Content not stored in event_data (only metadata like length, type)
- Session ID is random, not fingerprint-based

### Authenticated Users

- Events linked to user_id for activity features
- Same content restrictions apply
- User can request deletion (CASCADE from auth.users)

## Client Implementation

### Session Management

```typescript
// Generate session ID on app load, persist for session duration
const SESSION_ID = crypto.randomUUID();

// Store in sessionStorage (cleared on tab close)
sessionStorage.setItem('jotter_session_id', SESSION_ID);
```

### Event Service Interface

```typescript
interface EventLogService {
  log(
    eventType: string,
    options?: {
      entityType?: 'collection' | 'container' | 'section';
      entityId?: string;
      parentId?: string;
      data?: Record<string, unknown>;
    }
  ): Promise<void>;
}

// Usage
EventLogService.log('section.created', {
  entityType: 'section',
  entityId: newSection.id,
  parentId: containerId,
  data: { type: 'code', language: 'typescript' }
});
```

### Fire-and-Forget

Events are logged asynchronously and should not block UI operations:

```typescript
// Don't await - fire and forget
EventLogService.log('section.updated', { ... });

// Or batch for efficiency
EventLogService.queue('section.updated', { ... });
EventLogService.flush(); // On page unload or periodically
```

## Analytics Queries

### Demo Conversion Funnel

```sql
SELECT
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'session.start') as started,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'container.created') as engaged,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'auth.signin_clicked') as interested,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'auth.converted') as converted
FROM event_log
WHERE user_id IS NULL
  AND created_at > now() - interval '30 days';
```

### Feature Adoption

```sql
SELECT
  event_data->>'type' as section_type,
  COUNT(*) as usage_count,
  COUNT(DISTINCT COALESCE(user_id::text, session_id::text)) as unique_users
FROM event_log
WHERE event_type = 'section.created'
  AND created_at > now() - interval '30 days'
GROUP BY 1
ORDER BY 2 DESC;
```

### Daily Active Sessions

```sql
SELECT
  date_trunc('day', created_at) as day,
  COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL) as demo_sessions,
  COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NOT NULL) as auth_sessions
FROM event_log
WHERE event_type = 'session.start'
  AND created_at > now() - interval '30 days'
GROUP BY 1
ORDER BY 1;
```

### Traffic Sources

```sql
SELECT
  event_data->>'referrer' as source,
  COUNT(DISTINCT session_id) as sessions
FROM event_log
WHERE event_type = 'session.start'
  AND user_id IS NULL  -- Demo users only
  AND created_at > now() - interval '30 days'
GROUP BY 1
ORDER BY 2 DESC
LIMIT 20;
```

## Future Evolution

This event log is designed to support future architectural evolution:

### Phase 2: Activity Feed

- Query user's own events for "recently edited" and activity timeline
- Already supported by RLS policy

### Phase 3: Undo/Redo

- Enhance `event_data.changes` to include full before/after state
- Implement event replay for undo, reverse for redo
- Add `version` field to entities for optimistic concurrency

### Phase 4: Real-time Sync

- Add pub/sub layer (Supabase Realtime or external)
- Broadcast events to other connected clients
- Use events for conflict detection and resolution

### Phase 5: Event Sourcing (if needed)

- Events become source of truth
- Entity tables become materialized views
- Full audit trail and time-travel debugging

**Current phase**: Phase 1 (Analytics + Foundation)

---

## Implementation Checklist

- [ ] Create event_log table in Supabase
- [ ] Create RLS policies
- [ ] Create eventLogService.ts
- [ ] Add session ID management
- [ ] Hook into session start/end
- [ ] Hook into CRUD operations
- [ ] Test with demo mode
- [ ] Test with authenticated mode
- [ ] Create analytics dashboard (optional)
