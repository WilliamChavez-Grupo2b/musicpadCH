export class PlaylistStorage {
    static async load(email) {
        const response = await fetch(`/api/playlist?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        if (!response.ok || !Array.isArray(result)) {
            const message = !Array.isArray(result) ? result.error : undefined;
            throw new Error(message ?? "Unable to load the playlist.");
        }
        const tracks = result.map((track) => ({
            id: track.id,
            title: track.title,
            artist: track.artist,
            thumbnailUrl: track.thumbnailUrl,
        }));
        const currentTrackId = localStorage.getItem(this.currentTrackKey(email));
        return {
            tracks,
            currentTrackId: tracks.some((track) => track.id === currentTrackId)
                ? currentTrackId
                : null,
        };
    }
    static save(email, tracks, currentTrackId) {
        localStorage.setItem(this.currentTrackKey(email), currentTrackId ?? "");
        const save = async () => {
            const response = await fetch("/api/playlist", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, tracks }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error ?? "Unable to save the playlist.");
            }
        };
        const operation = this.saveQueue.then(save, save);
        this.saveQueue = operation.then(() => undefined, () => undefined);
        return operation;
    }
    static clear(email) {
        localStorage.removeItem(this.currentTrackKey(email));
    }
    static currentTrackKey(email) {
        return `musicpad_current_track:${email}`;
    }
}
PlaylistStorage.saveQueue = Promise.resolve();
//# sourceMappingURL=PlaylistStorage.js.map