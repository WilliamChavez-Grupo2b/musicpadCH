/**
 * This is a plain multi-page site (no SPA router), so the playlist has to be
 * persisted somewhere shared between login.html, busqueda.html and
 * dashboard.html. localStorage plays that role here: every page rebuilds
 * the DoublyLinkedList from this snapshot via PlaylistManager.hydrate().
 */
const STORAGE_KEY = "musicpad_playlist";
export class PlaylistStorage {
    static save(tracks, currentTrackId) {
        const snapshot = { tracks, currentTrackId };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    }
    static load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { tracks: [], currentTrackId: null };
        }
        try {
            return JSON.parse(raw);
        }
        catch {
            return { tracks: [], currentTrackId: null };
        }
    }
    static clear() {
        localStorage.removeItem(STORAGE_KEY);
    }
}
//# sourceMappingURL=PlaylistStorage.js.map