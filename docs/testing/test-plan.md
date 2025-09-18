# Jotter Test Plan

## Testing Strategy

### Test Pyramid
1. **Unit Tests (60%)** - Component logic, utilities, data transformations
2. **Integration Tests (30%)** - Component interactions, API calls, state management  
3. **E2E Tests (10%)** - Critical user journeys, cross-browser compatibility

### Test Categories

#### Authentication & Authorization
- Google OAuth integration
- Session management
- Protected route access
- User data isolation

#### Data Management
- CRUD operations for all entities
- Cache consistency and invalidation
- Optimistic updates and rollback
- Auto-save functionality

#### User Interface
- Component rendering and state
- Form validation and submission
- Keyboard shortcuts and accessibility
- Mobile responsiveness

#### Drag & Drop System
- Section reordering within containers
- Container reordering within collections
- Cross-container section moves
- Cross-collection container moves

## Critical User Journeys

### Primary Flow
1. **Authentication**: Login → Access collections
2. **Collection Management**: Create → Navigate → Organize
3. **Note Creation**: Add container → Add sections → Edit content
4. **Content Editing**: All editor types with auto-save
5. **Organization**: Drag/drop reordering and moves

### Secondary Flows
- Bulk operations (multi-select, batch actions)
- Error recovery (network issues, validation errors)
- Mobile workflows (touch interactions, responsive layout)
- Power user features (keyboard shortcuts, advanced editing)

## Test Environment Setup

### Unit/Integration Tests
- **Framework**: Vitest + @testing-library/svelte
- **Mocking**: Supabase client, external APIs
- **Coverage Target**: 80% statement coverage

### E2E Tests  
- **Framework**: Playwright
- **Browsers**: Chrome, Firefox, Safari
- **Viewports**: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Authentication**: OAuth mocking for consistent test runs

### Test Data
- Seeded test database with predictable data
- Factory functions for generating test entities
- Cleanup procedures between test runs

## Performance Testing
- Bundle size monitoring
- Runtime performance profiling
- Memory usage tracking
- Network request optimization

## Accessibility Testing
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation
- ARIA label correctness
