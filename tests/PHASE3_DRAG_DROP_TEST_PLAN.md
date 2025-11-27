# Phase 3: Drag & Drop E2E Test Plan

**Created**: November 25, 2025
**Status**: Ready for Implementation
**Estimated Duration**: 1 session
**Priority**: CRITICAL - Major source of bugs

---

## Executive Summary

This document provides a comprehensive test plan for Phase 3 of the E2E test coverage initiative. The Jotter application uses **three distinct drag & drop systems**:

1. **Custom Pointer-Based DnD** - For sections (within and across containers)
2. **svelte-dnd-action Library** - For container reordering within a collection
3. **HTML5 Drag & Drop** - For cross-collection container moves

Each system has different event models, DOM structures, and testing requirements.

---

## Table of Contents

1. [DnD Architecture Overview](#1-dnd-architecture-overview)
2. [Section Drag & Drop Tests](#2-section-drag--drop-tests)
3. [Container Drag & Drop Tests](#3-container-drag--drop-tests)
4. [Cross-Collection Container Move Tests](#4-cross-collection-container-move-tests)
5. [Visual Feedback Tests](#5-visual-feedback-tests)
6. [Edge Cases & Error Handling](#6-edge-cases--error-handling)
7. [Test Implementation Guide](#7-test-implementation-guide)
8. [DOM Selectors Reference](#8-dom-selectors-reference)

---

## 1. DnD Architecture Overview

### 1.1 System Comparison

| Feature | Section DnD | Container DnD | Cross-Collection |
|---------|-------------|---------------|------------------|
| Library | Custom (pointer events) | svelte-dnd-action | HTML5 + svelte-dnd-action |
| Trigger | pointerdown + 8px move | mousedown (automatic) | dragstart event |
| Visual Feedback | CSS classes via DragHighlighting | dropTargetStyle config | CSS on collection tabs |
| Optimistic Updates | Yes (via AppDataManager) | Yes (via AppDataManager) | Yes (via AppDataManager) |
| Rollback on Error | Yes | Yes (with server reconciliation) | Yes |

### 1.2 Component Hierarchy

```
Section DnD:
  ContainerPage (+page.svelte)
    └── DragProvider
         └── SectionGrid
              └── DraggableContainer [data-drop-zone, data-insert-position]
                   └── DragZone [data-drag-zone]
                        └── SectionCard

Container DnD:
  CollectionLayout (+layout.svelte)
    └── ContainerSidebar
         └── ContainerList [use:dndzone]
              └── ContainerItem [data-container-id]

Cross-Collection:
  AppLayout
    └── CollectionTabs
         └── CollectionTab [data-collection-id] [use:dndzone as drop target]
```

### 1.3 Key Files

| System | Primary Files |
|--------|---------------|
| Section DnD | `src/lib/dnd/core/DragCore.ts`, `src/lib/dnd/core/DragDetection.ts`, `src/lib/dnd/behaviors/SectionDragBehavior.ts` |
| Container DnD | `src/lib/components/containers/ContainerList.svelte`, `src/lib/composables/useContainerDragBehaviors.ts` |
| Cross-Collection | `src/lib/components/layout/CollectionTabs.svelte` |
| Data Updates | `src/lib/stores/core/appDataUpdates.ts`, `src/lib/stores/appDataStore.ts` |

---

## 2. Section Drag & Drop Tests

### 2.1 Section Reorder Within Container

**Test File**: `tests/e2e/drag-drop.spec.ts`

#### Test Cases

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| S-REORDER-01 | Drag section down (first to last) | Drag section from index 0 to index 2 in a 3-section container | High |
| S-REORDER-02 | Drag section up (last to first) | Drag section from last position to first | High |
| S-REORDER-03 | Drag section to middle | Drag section to middle position | Medium |
| S-REORDER-04 | Cancel drag (Escape key) | Start drag, press Escape, verify no change | Medium |
| S-REORDER-05 | Click vs drag threshold | Click on section without drag (< 8px), verify click event fires | Medium |
| S-REORDER-06 | Verify persistence | Drag, reload page, verify order persists | High |

#### S-REORDER-01: Implementation Details

```typescript
test('should reorder section from first to last position', async ({ page }) => {
  // Setup: Create container with 3 sections
  // 1. Create collection and container (beforeEach handles this)
  // 2. Create 3 sections (code, text, checklist)

  // Get initial section order
  const sectionCards = page.locator('.section-draggable-container');
  const initialOrder = await sectionCards.evaluateAll(cards =>
    cards.map(c => c.getAttribute('data-item-id'))
  );

  // Perform drag: First section to last position
  const firstSection = sectionCards.first();
  const lastSection = sectionCards.last();

  // Section DnD uses pointer events
  const firstBox = await firstSection.boundingBox();
  const lastBox = await lastSection.boundingBox();

  await page.mouse.move(firstBox.x + firstBox.width/2, firstBox.y + firstBox.height/2);
  await page.mouse.down();

  // Move more than 8px to trigger drag (threshold)
  await page.mouse.move(firstBox.x + 10, firstBox.y + 10, { steps: 2 });
  await page.waitForTimeout(100); // Wait for drag phase transition

  // Move to last position
  await page.mouse.move(lastBox.x + lastBox.width/2, lastBox.y + lastBox.height/2, { steps: 5 });
  await page.waitForTimeout(100);

  await page.mouse.up();
  await page.waitForTimeout(500); // Wait for optimistic update + API

  // Verify new order
  const newOrder = await sectionCards.evaluateAll(cards =>
    cards.map(c => c.getAttribute('data-item-id'))
  );

  // First section should now be at last position
  expect(newOrder[newOrder.length - 1]).toBe(initialOrder[0]);
});
```

### 2.2 Section Cross-Container Move

**Test Cases**

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| S-CROSS-01 | Move section to different container | Drag section from Container A to Container B | High |
| S-CROSS-02 | Verify source container update | After move, source container has fewer sections | High |
| S-CROSS-03 | Verify target container update | After move, target container has the section | High |
| S-CROSS-04 | Verify persistence after move | Page reload shows section in new container | High |
| S-CROSS-05 | Move last section from container | Move only section, verify empty state | Medium |

#### S-CROSS-01: Implementation Details

```typescript
test('should move section to different container', async ({ page }) => {
  // Setup: Need 2 containers in sidebar, first with sections
  // Create container A with 2 sections
  // Create container B (empty or with 1 section)

  // Get Container B's drop zone from sidebar
  const containerBItem = page.locator('[data-container-id]').nth(1);
  const containerBId = await containerBItem.getAttribute('data-container-id');

  // Get section from Container A (currently viewing)
  const sectionCard = page.locator('.section-draggable-container').first();
  const sectionId = await sectionCard.getAttribute('data-item-id');

  // Drag section to Container B
  // Target: The container item in sidebar has data-container-id attribute
  // The custom DnD system looks for [data-container-id] as valid drop targets

  const sectionBox = await sectionCard.boundingBox();
  const containerBox = await containerBItem.boundingBox();

  await page.mouse.move(sectionBox.x + sectionBox.width/2, sectionBox.y + sectionBox.height/2);
  await page.mouse.down();
  await page.mouse.move(sectionBox.x + 20, sectionBox.y + 20, { steps: 2 }); // Trigger drag
  await page.waitForTimeout(100);

  // Move to Container B in sidebar
  await page.mouse.move(containerBox.x + containerBox.width/2, containerBox.y + containerBox.height/2, { steps: 10 });
  await page.waitForTimeout(200);

  await page.mouse.up();
  await page.waitForTimeout(1000); // Wait for API

  // Verify: Section removed from Container A
  const remainingSections = await page.locator('.section-draggable-container').count();
  // ... verify count decreased

  // Navigate to Container B and verify section exists
  await containerBItem.click();
  await page.waitForTimeout(1000);

  const sectionInB = page.locator(`[data-item-id="${sectionId}"]`);
  await expect(sectionInB).toBeVisible();
});
```

---

## 3. Container Drag & Drop Tests

### 3.1 Container Reorder Within Collection (svelte-dnd-action)

**Test Cases**

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| C-REORDER-01 | Drag container down | Drag first container to third position | High |
| C-REORDER-02 | Drag container up | Drag last container to first position | High |
| C-REORDER-03 | Verify visual feedback | Container shows highlight during drag | Medium |
| C-REORDER-04 | Verify API call | PATCH request sent to note_container endpoint | Medium |
| C-REORDER-05 | Verify persistence | Order persists after page reload | High |

#### Test Setup Requirements

**Critical**: Container reorder test requires **3+ containers** to reliably test reordering.

```typescript
test.beforeEach(async ({ page }) => {
  // Create collection
  // Create 3 containers with unique names
  await page.keyboard.press('Alt+n'); // First container
  await page.waitForTimeout(1000);
  await page.keyboard.press('Alt+n'); // Second container
  await page.waitForTimeout(1000);
  await page.keyboard.press('Alt+n'); // Third container
  await page.waitForTimeout(1000);
});
```

#### C-REORDER-01: Implementation Details

```typescript
test('should reorder containers via drag and drop', async ({ page }) => {
  // Get all container items from sidebar
  const containerItems = page.locator('[data-container-id]');

  // Verify we have enough containers
  const count = await containerItems.count();
  if (count < 3) {
    test.skip();
    return;
  }

  // Get initial order
  const initialIds = await containerItems.evaluateAll(items =>
    items.map(i => i.getAttribute('data-container-id'))
  );

  // svelte-dnd-action uses standard mouse events
  const firstContainer = containerItems.first();
  const thirdContainer = containerItems.nth(2);

  const firstBox = await firstContainer.boundingBox();
  const thirdBox = await thirdContainer.boundingBox();

  // Perform drag
  await firstContainer.hover();
  await page.mouse.down();
  await page.mouse.move(thirdBox.x + thirdBox.width/2, thirdBox.y + thirdBox.height/2, { steps: 5 });
  await page.mouse.up();

  // Wait for API call
  await page.waitForResponse(response =>
    response.url().includes('note_container') &&
    response.request().method() === 'PATCH'
  );

  // Verify new order
  const newIds = await containerItems.evaluateAll(items =>
    items.map(i => i.getAttribute('data-container-id'))
  );

  // First container should now be at index 2
  expect(newIds[2]).toBe(initialIds[0]);

  // Verify persistence
  await page.reload();
  await page.waitForSelector('[data-container-id]');

  const persistedIds = await containerItems.evaluateAll(items =>
    items.map(i => i.getAttribute('data-container-id'))
  );
  expect(persistedIds).toEqual(newIds);
});
```

---

## 4. Cross-Collection Container Move Tests

### 4.1 Move Container to Different Collection

**Test Cases**

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| CC-MOVE-01 | Move container to collection tab | Drag container to different collection tab | High |
| CC-MOVE-02 | Verify source collection update | Container removed from source | High |
| CC-MOVE-03 | Verify target collection update | Container appears in target | High |
| CC-MOVE-04 | Verify cache invalidation | Target collection data reloaded | Medium |
| CC-MOVE-05 | Move to same collection (no-op) | Dragging to current collection tab does nothing | Low |

#### Test Setup Requirements

**Critical**: Requires **2+ collections** with at least 1 container in source collection.

#### CC-MOVE-01: Implementation Details

```typescript
test('should move container to different collection', async ({ page }) => {
  // Setup: Create 2 collections, first with containers
  // Navigate to first collection

  // Get collection tabs
  const collectionTabs = page.locator('[data-collection-id]');
  const sourceTab = collectionTabs.first();
  const targetTab = collectionTabs.nth(1);

  const sourceCollectionId = await sourceTab.getAttribute('data-collection-id');
  const targetCollectionId = await targetTab.getAttribute('data-collection-id');

  // Get container from sidebar
  const containerItem = page.locator('[data-container-id]').first();
  const containerId = await containerItem.getAttribute('data-container-id');

  // Get bounding boxes
  const containerBox = await containerItem.boundingBox();
  const targetTabBox = await targetTab.boundingBox();

  // Cross-collection move uses HTML5 drag + svelte-dnd-action detection
  // The ContainerList sets draggable="true" and handles dragstart
  // CollectionTabs uses dndzone to receive drops

  await page.mouse.move(containerBox.x + containerBox.width/2, containerBox.y + containerBox.height/2);
  await page.mouse.down();

  // svelte-dnd-action starts immediately, move to collection tab
  await page.mouse.move(targetTabBox.x + targetTabBox.width/2, targetTabBox.y + targetTabBox.height/2, { steps: 10 });
  await page.waitForTimeout(200);

  await page.mouse.up();
  await page.waitForTimeout(1000); // Wait for API

  // Verify container removed from source
  const containersInSource = await page.locator('[data-container-id]').count();
  // ... verify decreased or empty

  // Navigate to target collection
  await targetTab.click();
  await page.waitForTimeout(1000);

  // Verify container exists in target
  const movedContainer = page.locator(`[data-container-id="${containerId}"]`);
  await expect(movedContainer).toBeVisible();
});
```

---

## 5. Visual Feedback Tests

### 5.1 Section Drag Visual Feedback

**Test Cases**

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| VF-S-01 | Ghost element appears | DragGhost visible during section drag | Medium |
| VF-S-02 | Source section styling | Dragged section shows opacity/scale change | Medium |
| VF-S-03 | Valid targets highlighted | Other containers show "available" highlight | Medium |
| VF-S-04 | Active target highlighted | Hovered container shows "active" highlight | Medium |
| VF-S-05 | Preview reorder | Sections visually reorder during drag | Low |

#### VF-S-01: Implementation Details

```typescript
test('should show ghost element during section drag', async ({ page }) => {
  // Setup: Container with sections

  const sectionCard = page.locator('.section-draggable-container').first();
  const sectionBox = await sectionCard.boundingBox();

  // Start drag
  await page.mouse.move(sectionBox.x + sectionBox.width/2, sectionBox.y + sectionBox.height/2);
  await page.mouse.down();
  await page.mouse.move(sectionBox.x + 20, sectionBox.y + 20, { steps: 2 });

  // Wait for drag phase
  await page.waitForTimeout(100);

  // Ghost should be visible (DragGhost component)
  const ghost = page.locator('.drag-ghost, .ghost-content');
  await expect(ghost).toBeVisible();

  // Source section should have dragging class
  await expect(sectionCard).toHaveClass(/dragging/);

  await page.mouse.up();
});
```

### 5.2 Container Drag Visual Feedback

**Test Cases**

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| VF-C-01 | Container transform during drag | Dragged container shows scale(0.8) | Medium |
| VF-C-02 | Drop zone outline | Valid drop position shows dashed outline | Medium |
| VF-C-03 | Shadow item | svelte-dnd-action shadow item visible | Low |

---

## 6. Edge Cases & Error Handling

### 6.1 Edge Case Tests

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| EC-01 | Drag single section | Container with 1 section, drag to other container | Medium |
| EC-02 | Drag single container | Collection with 1 container, reorder (should no-op) | Low |
| EC-03 | Rapid consecutive drags | Perform 3 drags quickly, verify all persist | Medium |
| EC-04 | Drag during load | Start drag while API is in progress | Low |
| EC-05 | Empty container drop | Drop section into container with no sections | Medium |

### 6.2 Error Handling Tests

| ID | Test Name | Description | Priority |
|----|-----------|-------------|----------|
| ERR-01 | API failure rollback | Mock API error, verify UI rollback | High |
| ERR-02 | Network timeout | Simulate slow network, verify optimistic update | Medium |

#### ERR-01: Implementation Details

```typescript
test('should rollback on API failure', async ({ page }) => {
  // Setup: Container with sections

  // Intercept and fail the API call
  await page.route('**/rest/v1/note_section**', route => {
    route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  // Get initial order
  const initialOrder = await page.locator('.section-draggable-container').evaluateAll(
    cards => cards.map(c => c.getAttribute('data-item-id'))
  );

  // Perform drag
  // ... drag operations

  // Wait for API failure and rollback
  await page.waitForTimeout(2000);

  // Verify order returned to original
  const currentOrder = await page.locator('.section-draggable-container').evaluateAll(
    cards => cards.map(c => c.getAttribute('data-item-id'))
  );

  expect(currentOrder).toEqual(initialOrder);
});
```

---

## 7. Test Implementation Guide

### 7.1 Test File Structure

```typescript
// tests/e2e/drag-drop.spec.ts

import { test, expect } from '@playwright/test';
import { generateTestName, wait } from './helpers/test-data';

test.describe('Section Drag & Drop', () => {
  // Setup: Collection + Container + 3 Sections

  test.describe('Reorder Within Container', () => {
    test('S-REORDER-01: drag first to last', async ({ page }) => { /* ... */ });
    test('S-REORDER-02: drag last to first', async ({ page }) => { /* ... */ });
    // ...
  });

  test.describe('Cross-Container Move', () => {
    test('S-CROSS-01: move to different container', async ({ page }) => { /* ... */ });
    // ...
  });
});

test.describe('Container Drag & Drop', () => {
  // Setup: Collection + 3 Containers

  test.describe('Reorder Within Collection', () => {
    test('C-REORDER-01: drag first to third', async ({ page }) => { /* ... */ });
    // ...
  });

  test.describe('Cross-Collection Move', () => {
    // Setup: 2 Collections
    test('CC-MOVE-01: move to different collection', async ({ page }) => { /* ... */ });
    // ...
  });
});

test.describe('Visual Feedback', () => {
  test('VF-S-01: ghost element appears', async ({ page }) => { /* ... */ });
  // ...
});

test.describe('Edge Cases', () => {
  test('EC-01: drag single section', async ({ page }) => { /* ... */ });
  // ...
});
```

### 7.2 Helper Functions to Add

```typescript
// tests/e2e/helpers/drag-helpers.ts

/**
 * Performs a pointer-based drag (for section DnD)
 * Includes the 8px threshold movement
 */
export async function dragSectionTo(
  page: Page,
  sourceSelector: string,
  targetSelector: string
): Promise<void> {
  const source = page.locator(sourceSelector);
  const target = page.locator(targetSelector);

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not get bounding boxes for drag operation');
  }

  // Move to center of source
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );

  await page.mouse.down();

  // Move 10px to trigger drag phase (threshold is 8px)
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2 + 10,
    sourceBox.y + sourceBox.height / 2 + 10,
    { steps: 2 }
  );

  await page.waitForTimeout(100); // Wait for drag state transition

  // Move to target
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 5 }
  );

  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(500); // Wait for optimistic update
}

/**
 * Gets the current order of sections by their data-item-id
 */
export async function getSectionOrder(page: Page): Promise<string[]> {
  return page.locator('.section-draggable-container').evaluateAll(
    cards => cards.map(c => c.getAttribute('data-item-id')).filter(Boolean) as string[]
  );
}

/**
 * Gets the current order of containers by their data-container-id
 */
export async function getContainerOrder(page: Page): Promise<string[]> {
  return page.locator('[data-container-id]').evaluateAll(
    items => items.map(i => i.getAttribute('data-container-id')).filter(Boolean) as string[]
  );
}

/**
 * Creates multiple sections in the current container
 */
export async function createSections(
  page: Page,
  count: number,
  types: ('code' | 'text' | 'checklist' | 'diagram')[] = ['code', 'text', 'checklist']
): Promise<void> {
  const shortcuts: Record<string, string> = {
    code: 'Alt+k',
    text: 'Alt+t',
    checklist: 'Alt+l',
    diagram: 'Alt+d'
  };

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    await page.keyboard.press(shortcuts[type]);
    await page.waitForTimeout(type === 'diagram' ? 2000 : 1000);
    await page.goBack(); // Return to container view
    await page.waitForTimeout(500);
  }
}

/**
 * Creates multiple containers in the current collection
 */
export async function createContainers(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Alt+n');
    await page.waitForTimeout(1000);
  }
}
```

### 7.3 Test Execution Order

Due to test data dependencies, run tests in this order:

1. **Basic Section CRUD** (existing) - Ensures sections can be created
2. **Section Reorder Tests** - Requires multiple sections
3. **Section Cross-Container Tests** - Requires multiple containers
4. **Container Reorder Tests** - Requires multiple containers
5. **Cross-Collection Tests** - Requires multiple collections
6. **Visual Feedback Tests** - Can run in any order
7. **Edge Cases** - Can run in any order

---

## 8. DOM Selectors Reference

### 8.1 Section Selectors

| Element | Selector | Attribute |
|---------|----------|-----------|
| Section card wrapper | `.section-draggable-container` | `data-item-id` |
| Section drop zone | `[data-drop-zone^="section-grid-"]` | `data-drop-zone`, `data-insert-position` |
| Section drag zone | `[data-drag-zone]` | `data-drag-zone` |
| Drag ghost | `.drag-ghost, .ghost-content` | - |
| Section grid | `[data-section-grid]` | `data-section-grid` |

### 8.2 Container Selectors

| Element | Selector | Attribute |
|---------|----------|-----------|
| Container item (sidebar) | `[data-container-id]` | `data-container-id` |
| Container list (dndzone) | `.container-list` | - |
| Active container | `.container-item.active, [data-container-id].bg-blue-*` | - |
| Container title | `[data-container-id] .container-title` | - |

### 8.3 Collection Selectors

| Element | Selector | Attribute |
|---------|----------|-----------|
| Collection tab | `[data-collection-id]` | `data-collection-id` |
| Active collection tab | `[data-collection-id].active, .collection-tab-active` | - |
| Collection drop zone | `.collection-drop-zone` | - |

### 8.4 State Classes

| State | CSS Class | Component |
|-------|-----------|-----------|
| Dragging source | `.dragging` | DragZone |
| Drop target available | `.section-drop-target-available` | Container |
| Drop target active | `.section-drop-target-active` | Container |
| Drag over | `.drag-over` | DraggableContainer |
| svelte-dnd shadow | `.is-dnd-shadow-item` | ContainerItem |

---

## Appendix A: Event Flow Diagrams

### A.1 Section Reorder Flow

```
User Action                 Custom DnD System                AppDataManager
    |                            |                                |
pointerdown                      |                                |
    |-----> DragDetection.handlePointerDown()                     |
    |       DragCore.startDetection()                             |
    |                            |                                |
pointermove (>8px)               |                                |
    |-----> DragCore.startDrag() |                                |
    |       phase: 'dragging'    |                                |
    |                            |                                |
pointermove                      |                                |
    |-----> DragTargetDetection.detectTarget()                    |
    |       DragCore.setDropTarget()                              |
    |       PreviewRenderer.applyReorderPreview()                 |
    |           [CSS order manipulation]                          |
    |                            |                                |
pointerup                        |                                |
    |-----> DragCore.endDrag()   |                                |
    |       returns DropResult   |                                |
    |                            |                                |
    |       DragBehaviorRegistry.handleDrop()                     |
    |       SectionDragBehavior.onDrop()                          |
    |                            |                                |
    |                            |-----> updateSectionsOptimistically()
    |                            |       [Immediate UI update]    |
    |                            |                                |
    |                            |-----> SectionService.reorderSections()
    |                            |       [API call]               |
    |                            |                                |
    |                            |       [Success/Error handling] |
    |                            |       [Rollback if needed]     |
```

### A.2 Container Reorder Flow (svelte-dnd-action)

```
User Action              svelte-dnd-action           ContainerList          AppDataManager
    |                          |                          |                      |
mousedown                      |                          |                      |
    |-----> [internal start]   |                          |                      |
    |                          |                          |                      |
mousemove                      |                          |                      |
    |-----> on:consider ------>|-----> handleContainerConsider()                 |
    |       [visual update]    |       dndContainers = items                     |
    |                          |                          |                      |
mouseup                        |                          |                      |
    |-----> on:finalize ------>|-----> handleContainerFinalize()                 |
    |                          |       if (orderChanged) dispatch('reorder')     |
    |                          |                          |                      |
    |                          |                          |-----> updateContainerArrayOptimistically()
    |                          |                          |       [Immediate UI update]
    |                          |                          |                      |
    |                          |                          |-----> NoteService.reorderNoteContainers()
    |                          |                          |       [API call]     |
    |                          |                          |                      |
    |                          |                          |       [Reconcile with server response]
```

---

## Appendix B: Known Issues & Workarounds

### B.1 svelte-dnd-action Boundary Snap-back

**Issue**: Items may snap back to original position near drag zone boundaries.
**Workaround**: Use larger movement steps in tests, avoid dragging near zone edges.

### B.2 Click vs Drag Threshold

**Issue**: Custom DnD uses 8px threshold; clicks may be interpreted as drags.
**Workaround**: Tests should explicitly move > 8px for drags, < 8px for clicks.

### B.3 Rapid Drag Operations

**Issue**: Multiple rapid drags may cause state inconsistency.
**Workaround**: Add wait(500) between consecutive drag operations.

### B.4 Cross-Collection Detection

**Issue**: svelte-dnd-action `droppedOutsideOfAny` relies on `document.elementFromPoint()`.
**Workaround**: Ensure collection tabs are visible and not overlapped during tests.

---

## Success Criteria

Phase 3 is complete when:

- [ ] All High priority tests implemented and passing
- [ ] All Medium priority tests implemented and passing
- [ ] At least 80% of Low priority tests implemented
- [ ] Tests verify both UI changes AND data persistence
- [ ] Optimistic updates properly tested with rollback scenarios
- [ ] Visual feedback states verified for both DnD systems
- [ ] No flaky tests (run 3x with consistent results)
- [ ] Test documentation updated in `tests/TEST_COVERAGE_PLAN.md`

---

**Last Updated**: November 25, 2025
**Author**: AI Testing Specialist Agent
