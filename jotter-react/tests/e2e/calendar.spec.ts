import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionContent, gotoAppForSeeding, seedTree } from './helpers';

// A minimal Calendar doc (our own schema — FullCalendar only renders it): one all-day event.
function calendarDoc(title: string): string {
  return JSON.stringify({
    events: [
      { id: 'evt-1', title, start: '2026-07-06', end: '2026-07-10', allDay: true, color: '#6366f1' }
    ],
    defaultView: 'month'
  });
}

test.describe('calendar section', () => {
  test('create a Calendar section mounts the FullCalendar editor', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { collectionName: 'e2e-calendar-create' });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await page.getByRole('button', { name: 'Calendar', exact: true }).click();

      // The code-split FullCalendar editor mounts and finishes loading.
      await expect(page.getByTestId('calendar-editor')).toBeVisible();
      await expect(page.getByText('Loading calendar…')).toHaveCount(0, { timeout: 15000 });
      await expect(page.getByTestId('calendar-canvas')).toBeVisible();
      // FullCalendar's own chrome rendered (the built-in toolbar's Today button).
      await expect(page.getByRole('button', { name: 'today' })).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('the card preview lists upcoming events', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-calendar-preview',
      sections: [{ type: 'calendar', content: calendarDoc('Roadmap kickoff'), sequence: 10 }]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const card = page.getByTestId('section-card');
      await expect(card).toBeVisible();
      // The preview is plain HTML (no FullCalendar instance): the event title shows.
      await expect(card.getByText('Roadmap kickoff', { exact: true })).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('event edits round-trip through the calendar doc on save', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-calendar-edit',
      sections: [{ type: 'calendar', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('calendar-editor')).toBeVisible();
      await expect(page.getByText('Loading calendar…')).toHaveCount(0, { timeout: 15000 });

      // Drive a deterministic edit through the DEV facade (real FullCalendar drags are racy).
      await expect
        .poll(() => page.evaluate(() => '__CALENDAR_API__' in window), { timeout: 10000 })
        .toBe(true);
      await page.evaluate(() => {
        const api = (window as unknown as { __CALENDAR_API__: any }).__CALENDAR_API__;
        api.addEvent({
          title: 'Sprint 14',
          start: '2026-07-06',
          end: '2026-07-20',
          allDay: true
        });
      });

      // onChange writes the draft; wait for it before saving so buildUpdates reads the live doc.
      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('Sprint 14');

      await page.getByRole('button', { name: 'Save', exact: true }).click();

      // Persisted content is our CalendarDoc JSON with the new event.
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('Sprint 14');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('highlighting days then naming creates an event (deliberate add)', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-calendar-create-flow',
      sections: [{ type: 'calendar', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('calendar-canvas')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => '__CALENDAR_API__' in window), { timeout: 10000 })
        .toBe(true);

      // Highlight a range (the click/drag path) — this only opens the form, no event yet.
      await page.evaluate(() => {
        const api = (window as unknown as { __CALENDAR_API__: any }).__CALENDAR_API__;
        api.openCreate({ start: '2026-07-06', end: '2026-07-09', allDay: true });
      });
      const panel = page.getByTestId('calendar-edit-panel');
      await expect(panel).toBeVisible();
      // No event exists until the deliberate "+ Event".
      expect(await page.evaluate(() => (window as any).__CALENDAR_API__.getEvents().length)).toBe(0);

      await panel.getByTestId('calendar-event-title').fill('Launch week');
      await panel.getByRole('button', { name: '+ Event' }).click();
      await expect(panel).toHaveCount(0); // form closes after commit

      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('Launch week');

      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('Launch week');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('editing the end date does not snap back to the start', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-calendar-enddate',
      sections: [{ type: 'calendar', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('calendar-canvas')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => '__CALENDAR_API__' in window), { timeout: 10000 })
        .toBe(true);

      // Open the create form for a single all-day day (stored end is exclusive: +1 day).
      await page.evaluate(() => {
        const api = (window as unknown as { __CALENDAR_API__: any }).__CALENDAR_API__;
        api.openCreate({ start: '2026-07-06', end: '2026-07-07', allDay: true });
      });
      const panel = page.getByTestId('calendar-edit-panel');
      await expect(panel).toBeVisible();

      // Extend the End date (inclusive display) — it must stick, not jump back to the start.
      const endInput = panel.locator('input[type="date"]').nth(1);
      await endInput.fill('2026-07-15');
      await expect(endInput).toHaveValue('2026-07-15');

      await panel.getByTestId('calendar-event-title').fill('Spanning');
      await panel.getByRole('button', { name: '+ Event' }).click();

      // Persisted exclusive end is the day after the inclusive 07-15 → 07-16 (not 07-07).
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('2026-07-16');
      expect(await fetchSectionContent(page, sectionId)).toContain('Spanning');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('the calendar view is persisted', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-calendar-view',
      sections: [{ type: 'calendar', content: calendarDoc('Roadmap kickoff'), sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('calendar-canvas')).toBeVisible();

      // The rolling five-week view persists under its own key…
      await page.getByRole('button', { name: '5 Week', exact: true }).click();
      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('"defaultView":"fiveWeek"');

      // …and switching to the week view persists too.
      await page.getByRole('button', { name: 'Week', exact: true }).click();
      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('"defaultView":"week"');

      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('"defaultView":"week"');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
