# Checklist Editor

## Overview
Task-oriented editor with checkboxes, due dates, priority levels, and progress tracking.

## Features

### Task Items
- **Checkbox**: Toggle completion state
- **Text**: Editable task description
- **Due Date**: Optional date picker
- **Priority**: Color-coded levels (None, Low/Blue, Medium/Yellow, High/Red)
- **Delete**: Remove individual items

### Progress Tracking
- Progress bar showing completion percentage
- Hidden on mobile for space optimization
- Updates in real-time as items are checked/unchecked

### Priority System
- **Colorblind-friendly**: Red/Yellow/Blue instead of Red/Green
- **Full-width coloring**: Priority affects entire item background
- **Mobile-optimized**: Priority controls hidden on small screens

### Mobile Optimizations
- Full-width items for better touch targets
- Hidden date and priority controls on mobile
- Essential controls only (checkbox, text, delete)
- Reduced visual clutter

## User Interactions

### Creating Items
- **Enter key**: Add new item below current
- **Backspace**: Delete empty item and focus previous
- **Auto-focus**: New items immediately editable

### Reordering Items
- Drag handle for desktop reordering
- Touch-friendly on mobile devices
- Optimistic updates with animation

### Hotkeys
- **Enter**: New item
- **Backspace**: Delete current item (if empty)
- **Tab**: Focus next field
- **Shift+Tab**: Focus previous field

## Data Structure
```json
{
  "items": [
    {
      "id": "uuid",
      "checked": boolean,
      "text": "Task description",
      "date": "2025-09-13" | null,
      "priority": "none" | "low" | "medium" | "high"
    }
  ]
}
```

## Testing Requirements
- [ ] Unit: Item CRUD operations
- [ ] Unit: Progress calculation
- [ ] Unit: Priority color mapping
- [ ] E2E: Add/edit/delete items
- [ ] E2E: Toggle completion states
- [ ] E2E: Drag reordering
- [ ] E2E: Date picker functionality
- [ ] E2E: Priority level changes
- [ ] E2E: Mobile responsive behavior
