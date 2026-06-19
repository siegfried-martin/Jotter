// A minimal Yjs provider over Supabase Realtime broadcast (docs/initiatives/offline-sync.md,
// slice 5). Gives code/wysiwyg sections live multi-user editing — remote interviews,
// ideation — with no app server: clients exchange Yjs updates over a per-section broadcast
// channel, and the CRDT merges them. Persistent shared state lives in note_section.ydoc;
// this provider only carries the *live* deltas between connected clients.
//
// Protocol:
//   * on subscribe (and whenever a peer joins, via presence) we broadcast `sync` with our
//     state vector; peers reply with `update` = the ops we're missing.
//   * local doc changes broadcast `update`; received updates are applied with origin=this
//     so they don't echo back out.
//   * awareness (cursors/presence) rides the same channel.

import * as Y from 'yjs';
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates
} from 'y-protocols/awareness';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { bytesToBase64, base64ToBytes } from './base64';

export class SupabaseYjsProvider {
  private channel: RealtimeChannel;
  private destroyed = false;

  constructor(
    private doc: Y.Doc,
    private awareness: Awareness,
    room: string
  ) {
    this.channel = supabase.channel(`yjs:${room}`, { config: { broadcast: { self: false } } });

    doc.on('update', this.handleDocUpdate);
    awareness.on('update', this.handleAwarenessUpdate);

    this.channel
      .on('broadcast', { event: 'sync' }, ({ payload }) => this.answerSync(payload.sv as string))
      .on('broadcast', { event: 'update' }, ({ payload }) =>
        Y.applyUpdate(this.doc, base64ToBytes(payload.update as string), this)
      )
      .on('broadcast', { event: 'awareness' }, ({ payload }) =>
        applyAwarenessUpdate(this.awareness, base64ToBytes(payload.update as string), this)
      )
      .on('presence', { event: 'join' }, () => this.requestSync())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !this.destroyed) {
          void this.channel.track({ id: this.doc.clientID });
          this.requestSync();
        }
      });
  }

  private send(event: string, payload: Record<string, unknown>) {
    if (this.destroyed) return;
    void this.channel.send({ type: 'broadcast', event, payload });
  }

  /** Ask peers for whatever our state vector is missing. */
  private requestSync() {
    this.send('sync', { sv: bytesToBase64(Y.encodeStateVector(this.doc)) });
  }

  /** Reply to a peer's sync request with the ops they lack (+ our awareness). */
  private answerSync(theirStateVector: string) {
    const update = Y.encodeStateAsUpdate(this.doc, base64ToBytes(theirStateVector));
    this.send('update', { update: bytesToBase64(update) });
    const ids = Array.from(this.awareness.getStates().keys());
    if (ids.length > 0) {
      this.send('awareness', { update: bytesToBase64(encodeAwarenessUpdate(this.awareness, ids)) });
    }
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return; // applied from a peer — don't echo it back
    this.send('update', { update: bytesToBase64(update) });
  };

  private handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return;
    const ids = [...changes.added, ...changes.updated, ...changes.removed];
    this.send('awareness', { update: bytesToBase64(encodeAwarenessUpdate(this.awareness, ids)) });
  };

  destroy() {
    this.destroyed = true;
    this.doc.off('update', this.handleDocUpdate);
    this.awareness.off('update', this.handleAwarenessUpdate);
    removeAwarenessStates(this.awareness, [this.doc.clientID], this);
    void supabase.removeChannel(this.channel);
  }
}
