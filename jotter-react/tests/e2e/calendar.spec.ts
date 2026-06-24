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

  test('the month/week view is persisted', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-calendar-view',
      sections: [{ type: 'calendar', content: calendarDoc('Roadmap kickoff'), sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('calendar-canvas')).toBeVisible();

      // Switch to the week view via the toolbar toggle.
      await page.getByRole('button', { name: 'week', exact: true }).click();
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
