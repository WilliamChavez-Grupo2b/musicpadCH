import type { Track } from "../models/Track.js";

interface PlaylistSnapshot {
    tracks: Track[];
    currentTrackId: string | null;
}

interface StoredTrack {
    id: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
}

export class PlaylistStorage {
    private static saveQueue: Promise<void> = Promise.resolve();

    static async load(email: string): Promise<PlaylistSnapshot> {
        const response = await fetch(`/api/playlist?email=${encodeURIComponent(email)}`);
        const result = await response.json() as StoredTrack[] | { error?: string };

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

    static save(email: string, tracks: Track[], currentTrackId: string | null): Promise<void> {
        localStorage.setItem(this.currentTrackKey(email), currentTrackId ?? "");

        const save = async (): Promise<void> => {
            const response = await fetch("/api/playlist", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, tracks }),
            });
            const result = await response.json() as { error?: string };

            if (!response.ok) {
                throw new Error(result.error ?? "Unable to save the playlist.");
            }
        };

        const operation = this.saveQueue.then(save, save);
        this.saveQueue = operation.then(() => undefined, () => undefined);
        return operation;
    }

    static clear(email: string): void {
        localStorage.removeItem(this.currentTrackKey(email));
    }

    private static currentTrackKey(email: string): string {
        return `musicpad_current_track:${email}`;
    }
}
