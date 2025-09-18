# Authentication System

## Overview
Jotter uses Google OAuth via Supabase Auth for user authentication.

## User Flows

### Login Process
1. User visits `/` (redirects to `/login` if not authenticated)
2. Click "Continue with Google" button
3. Google OAuth popup/redirect flow
4. Supabase handles token exchange and user creation
5. Redirect to `/app` with session established

### Logout Process
1. User clicks logout button (typically in header/menu)
2. Supabase auth session cleared
3. Local cache/storage cleared
4. Redirect to `/login`

### Session Management
- Automatic session persistence across browser sessions
- Session validation on protected routes
- Graceful handling of expired sessions

## Technical Implementation

### Files
- Authentication logic in `src/lib/auth.ts`
- Login page at `src/routes/login/`
- Protected route handling in layout files

### Database
- User records automatically created in Supabase
- RLS policies enforce user data isolation
- User preferences stored in `user_preferences` table

## Testing Requirements
- [ ] E2E: Complete login flow with Google OAuth mock
- [ ] E2E: Logout clears session and redirects appropriately  
- [ ] E2E: Protected routes redirect to login when unauthenticated
- [ ] Unit: Session validation logic
- [ ] Unit: Auth state management
