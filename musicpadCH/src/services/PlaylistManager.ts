import { DoublyLinkedList, DoublyLinkedListNode } from "../core/DoublyLinkedList.js";
import type { Track } from "../models/Track.js";

export type PlaylistChangeListener = (tracks: Track[], currentTrack: Track | null) => void;

/**
 * PlaylistManager
 * --------------------------------------------------------------------------
 * Owns a DoublyLinkedList<Track> and exposes the operations the workshop
 * requires: add a song at the start, at the end or at any position; remove
 * a song; move forward and backward through the list.
 *
 * `next()` / `previous()` are implemented by following the `.next` / `.prev`
 * pointers of the current node — this is the actual point of using a
 * doubly linked list instead of a plain array.
 */
export class PlaylistManager {
    private list = new DoublyLinkedList<Track>();
    private currentNode: DoublyLinkedListNode<Track> | null = null;
    private readonly listeners = new Set<PlaylistChangeListener>();

    get size(): number {
        return this.list.size;
    }

    /** Subscribes to playlist changes. Returns an unsubscribe function. */
    onChange(listener: PlaylistChangeListener): () => void {
        this.listeners.add(listener);
        listener(this.list.toArray(), this.getCurrentTrack());
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        const tracks = this.list.toArray();
        const current = this.getCurrentTrack();
        this.listeners.forEach((listener) => listener(tracks, current));
    }

    addAtStart(track: Track): void {
        const node = this.list.addFirst(track);
        if (!this.currentNode) this.currentNode = node;
        this.notify();
    }

    addAtEnd(track: Track): void {
        const node = this.list.addLast(track);
        if (!this.currentNode) this.currentNode = node;
        this.notify();
    }

    /** position is a 1-based index as shown to the user (1 = first song). */
    addAtPosition(position: number, track: Track): void {
        const zeroBasedIndex = position - 1;
        const node = this.list.addAt(zeroBasedIndex, track);
        if (!this.currentNode) this.currentNode = node;
        this.notify();
    }
    moveToPosition(trackId: string, newPosition: number): void {
        const node = this.list.find((t) => t.id === trackId);
        if (!node) return;

        const track = node.value;
        const wasCurrent = node === this.currentNode;
        const targetIndex = Number.isFinite(newPosition)
            ? Math.max(0, Math.min(Math.trunc(newPosition), this.list.size - 1))
            : 0;

        this.list.removeNode(node);
        const newNode = this.list.addAt(targetIndex, track);

        if (wasCurrent) this.currentNode = newNode;
        this.notify();
    }

    removeById(trackId: string): boolean {
        const node = this.list.find((track) => track.id === trackId);
        if (!node) return false;

        const wasCurrent = node === this.currentNode;
        const fallback = node.next ?? node.prev ?? null;

        this.list.removeNode(node);

        if (wasCurrent) {
            this.currentNode = fallback;
        }

        this.notify();
        return this.list.find((track) => track.id === trackId) == null;
    }
    getCurrentTrack(): Track | null {
        return this.currentNode?.value ?? null;

    }
    contains(trackId: string): boolean {
        return this.list.find((track) => track.id === trackId) !== null;
    }

    hasNext(): boolean {
        return this.currentNode !== null
            && (this.currentNode.next !== null || this.list.size > 1);
    }

    hasPrevious(): boolean {
        return this.currentNode?.prev != null;
    }

    /** Moves to the next node, wrapping from the tail to the head. */
    playNext(): Track | null {
        if (this.currentNode?.next) {
            this.currentNode = this.currentNode.next;
        } else if (this.currentNode) {
            this.currentNode = this.list.getHead();
        } else {
            return null;
        }
        this.notify();
        return this.getCurrentTrack();
    }

    /** Moves to the previous node via the `.prev` pointer. Returns the new current track. */
    playPrevious(): Track | null {
        if (this.currentNode?.prev) {
            this.currentNode = this.currentNode.prev;
            this.notify();
        }
        return this.getCurrentTrack();
    }

    setCurrentById(trackId: string): Track | null {
        const node = this.list.find((track) => track.id === trackId);
        if (!node) return null;
        this.currentNode = node;
        this.notify();
        return this.getCurrentTrack();
    }

    toArray(): Track[] {
        return this.list.toArray();
    }

    /** Rebuilds the list from a plain array (used when restoring saved state). */
    hydrate(tracks: Track[], currentTrackId: string | null): void {
        this.list.clear();
        this.currentNode = null;

        for (const track of tracks) {
            const node = this.list.addLast(track);
            if (currentTrackId && track.id === currentTrackId) {
                this.currentNode = node;
            }
        }

        if (!this.currentNode) {
            this.currentNode = this.list.getHead();
        }

        this.notify();
    }
}
