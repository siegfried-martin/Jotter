import { describe, it, expect, afterEach } from 'vitest';
import { isOnline, subscribeOnline, __setOnlineForTests } from './onlineStatus';

afterEach(() => __setOnlineForTests(true));

describe('online status', () => {
  it('defaults to online', () => {
    expect(isOnline()).toBe(true);
  });

  it('notifies subscribers only on transitions', () => {
    const seen: boolean[] = [];
    const unsub = subscribeOnline((v) => seen.push(v));

    __setOnlineForTests(true); // no change → no emit
    __setOnlineForTests(false); // online → offline
    __setOnlineForTests(false); // no change → no emit
    __setOnlineForTests(true); // offline → online

    expect(seen).toEqual([false, true]);
    expect(isOnline()).toBe(true);
    unsub();
  });

  it('stops notifying after unsubscribe', () => {
    const seen: boolean[] = [];
    const unsub = subscribeOnline((v) => seen.push(v));
    unsub();
    __setOnlineForTests(false);
    expect(seen).toEqual([]);
  });
});
