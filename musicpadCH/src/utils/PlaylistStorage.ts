import type { Track } from "../models/Track.js";

/**
 * This is a plain multi-page site (no SPA router), so the playlist has to be
 * persisted somewhere shared between login.html, busqueda.html and
 * dashboard.html. localStorage plays that role here: every page rebuilds
 * the DoublyLinkedList from this snapshot via PlaylistManager.hydrate().
 */
const STORAGE_KEY = "musicpad_playlist";

interface PlaylistSnapshot {
    tracks: Track[];
    currentTrackId: string | null;
}

export class PlaylistStorage {
    static save(tracks: Track[], currentTrackId: string | null): void {
        const snapshot: PlaylistSnapshot = { tracks, currentTrackId };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }

    static load(): PlaylistSnapshot {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { tracks: [], currentTrackId: null };
        }

        try {
            return JSON.parse(raw) as PlaylistSnapshot;
        } catch {
            return { tracks: [], currentTrackId: null };
        }
    }

    static clear(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
}
