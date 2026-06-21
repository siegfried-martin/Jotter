import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionContent, gotoAppForSeeding, seedTree } from './helpers';

// A minimal Timeline doc (our own schema — vis-timeline only renders it): one lane, one bar.
function timelineDoc(title: string): string {
  return JSON.stringify({
    groups: [{ id: 'lane-1', content: 'Team A' }],
    items: [
      {
        id: 'item-1',
        title,
        start: '2026-07-01',
        end: '2026-07-31',
        group: 'lane-1',
        color: '#cffafe'
      }
    ]
  });
}

test.describe('timeline section', () => {
  test('create a Timeline section mounts the editor', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { collectionName: 'e2e-timeline-create' });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await page.getByRole('button', { name: 'Timeline', exact: true }).click();

      // The code-split vis-timeline editor mounts and finishes loading.
      await expect(page.getByTestId('timeline-editor')).toBeVisible();
      await expect(page.getByText('Loading timeline…')).toHaveCount(0, { timeout: 15000 });
      await expect(page.getByRole('button', { name: '+ Bar' })).toBeEnabled();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('the card preview renders a static swimlane', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-timeline-preview',
      sections: [{ type: 'timeline', content: timelineDoc('AK Build'), sequence: 10 }]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const card = page.getByTestId('section-card');
      await expect(card).toBeVisible();
      // The preview is plain CSS (no vis-timeline): the lane label and the bar title show.
      await expect(card.getByText('Team A', { exact: true })).toBeVisible();
      await expect(card.getByText('AK Build', { exact: true })).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('edits round-trip through the timeline doc on save', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-timeline-edit',
      sections: [{ type: 'timeline', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('timeline-editor')).toBeVisible();
      await expect(page.getByText('Loading timeline…')).toHaveCount(0, { timeout: 15000 });

      // Drive deterministic edits through the DEV facade (the timeline is canvas-rendered,
      // so simulated drags are racy) — add a lane and a bar in it.
      await expect
        .poll(() => page.evaluate(() => '__TIMELINE_API__' in window), { timeout: 10000 })
        .toBe(true);
      await page.evaluate(() => {
        const api = (window as unknown as { __TIMELINE_API__: any }).__TIMELINE_API__;
        const lane = api.addLane('Pulse Dev');
        api.addItem({ title: 'AK Build', start: '2026-07-01', end: '2026-07-31', group: lane });
      });

      // The editor debounces onChange; wait for the edit to reach the draft before saving so
      // buildUpdates() reads the live doc (not the empty seed).
      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('AK Build');

      await page.getByRole('button', { name: 'Save', exact: true }).click();

      // Persisted content is our TimelineDoc JSON with both the new lane and bar.
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('AK Build');
      expect(await fetchSectionContent(page, sectionId)).toContain('Pulse Dev');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('+ Bar drops into the selected lane', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-timeline-lane',
      sections: [
        {
          type: 'timeline',
          content: JSON.stringify({
            groups: [
              { id: 'laneA', content: 'Team A' },
              { id: 'laneB', content: 'Team B' }
            ],
            items: [],
            annotations: []
          }),
          sequence: 10
        }
      ]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByText('Loading timeline…')).toHaveCount(0, { timeout: 15000 });
      await expect.poll(() => page.evaluate(() => '__TIMELINE_API__' in window)).toBe(true);

      // Select the second lane, then add a bar — it should land in laneB, not the first lane.
      await page.locator('.vis-label', { hasText: 'Team B' }).first().click();
      await page.getByRole('button', { name: '+ Bar' }).click();

      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('New item');
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect.poll(() => fetchSectionContent(page, sectionId)).toContain('New item');
      const doc = JSON.parse(await fetchSectionContent(page, sectionId));
      const bar = doc.items.find((i: { title: string }) => i.title === 'New item');
      expect(bar.group).toBe('laneB');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('Delete key removes the selected bar', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-timeline-del-bar',
      sections: [
        {
          type: 'timeline',
          content: JSON.stringify({
            groups: [{ id: 'laneA', content: 'Team A' }],
            items: [
              { id: 'i1', title: 'AK Build', start: '2026-07-01', end: '2026-07-31', group: 'laneA' }
            ],
            annotations: []
          }),
          sequence: 10
        }
      ]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByText('Loading timeline…')).toHaveCount(0, { timeout: 15000 });
      await page.locator('.vis-item.vis-range').first().click();
      await page.keyboard.press('Delete');

      const itemCount = (id: string) =>
        page.evaluate((sid) => {
          try {
            return JSON.parse(localStorage.getItem(`draft_${sid}`) || '{}').items?.length ?? -1;
          } catch {
            return -1;
          }
        }, id);
      await expect.poll(() => itemCount(sectionId), { timeout: 10000 }).toBe(0);

      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(async () => JSON.parse(await fetchSectionContent(page, sectionId)).items.length)
        .toBe(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('deleting a lane that holds bars asks for confirmation', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-timeline-del-lane',
      sections: [
        {
          type: 'timeline',
          content: JSON.stringify({
            groups: [{ id: 'laneA', content: 'Team A' }],
            items: [
              { id: 'i1', title: 'AK Build', start: '2026-07-01', end: '2026-07-31', group: 'laneA' }
            ],
            annotations: []
          }),
          sequence: 10
        }
      ]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByText('Loading timeline…')).toHaveCount(0, { timeout: 15000 });

      await page.locator('.vis-label', { hasText: 'Team A' }).first().click(); // select the lane
      let asked = false;
      page.once('dialog', (d) => {
        asked = d.message().toLowerCase().includes('bar');
        d.accept();
      });
      await page.keyboard.press('Delete');

      await expect.poll(() => asked).toBe(true);
      const groupCount = () =>
        page.evaluate((sid) => {
          try {
            return JSON.parse(localStorage.getItem(`draft_${sid}`) || '{}').groups?.length ?? -1;
          } catch {
            return -1;
          }
        }, sectionId);
      await expect.poll(groupCount, { timeout: 10000 }).toBe(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('annotations render as free-floating boxes and persist', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-timeline-annot',
      sections: [{ type: 'timeline', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('timeline-editor')).toBeVisible();
      await expect(page.getByText('Loading timeline…')).toHaveCount(0, { timeout: 15000 });
      await expect
        .poll(() => page.evaluate(() => '__TIMELINE_API__' in window), { timeout: 10000 })
        .toBe(true);

      // Add a free-floating annotation via the facade; it renders as a draggable overlay box.
      await page.evaluate(() => {
        const api = (window as unknown as { __TIMELINE_API__: any }).__TIMELINE_API__;
        api.addAnnotation({ title: 'Existing 2026 Roadmap', start: '2026-07-01', end: '2027-01-01' });
      });

      const box = page.getByTestId('timeline-annotation');
      await expect(box).toHaveCount(1);
      await expect(box).toContainText('Existing 2026 Roadmap');

      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('Existing 2026 Roadmap');

      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('Existing 2026 Roadmap');
      expect(await fetchSectionContent(page, sectionId)).toContain('"annotations"');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test.describe('clipboard', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('Copy as Markdown produces a GFM table; Copy yields TSV', async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page, {
        collectionName: 'e2e-timeline-clip',
        sections: [{ type: 'timeline', content: timelineDoc('AK Build'), sequence: 10 }]
      });
      try {
        await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
        const openMenu = () =>
          page.getByTestId('section-card').getByRole('button', { name: 'More actions' }).click();

        await openMenu();
        await page.getByRole('button', { name: 'Copy as Markdown' }).click();
        await expect(page.getByText('Copied as Markdown')).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
          '| Title | Lane | Start | End |\n| --- | --- | --- | --- |\n' +
            '| AK Build | Team A | 2026-07-01 | 2026-07-31 |'
        );

        await openMenu();
        await page.getByRole('button', { name: 'Copy', exact: true }).click();
        await expect(page.getByText('Copied to clipboard')).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
          'Title\tLane\tStart\tEnd\nAK Build\tTeam A\t2026-07-01\t2026-07-31'
        );
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });
  });
});
