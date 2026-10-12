import type { Track, TrackSource } from "../models/Track.js";

interface PlaylistSnapshot {
    tracks: Track[];
    currentTrackId: string | null;
    warning?: string;
}

interface StoredTrack {
    id: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    source?: TrackSource;
}

function isStoredTrack(value: unknown): value is StoredTrack {
    if (typeof value !== "object" || value === null) return false;
    return "id" in value && typeof value.id === "string"
        && "title" in value && typeof value.title === "string"
        && "artist" in value && typeof value.artist === "string"
        && "thumbnailUrl" in value && typeof value.thumbnailUrl === "string"
        && (!("source" in value) || value.source === "youtube");
}

export class PlaylistStorage {
    private static saveQueue: Promise<void> = Promise.resolve();

    static async load(email: string): Promise<PlaylistSnapshot> {
        const currentTrackId = localStorage.getItem(this.currentTrackKey(email));
        const cachedTracks = this.readCachedTracks(email);

        try {
            const response = await fetch(`/api/playlist?email=${encodeURIComponent(email)}`);
            const result: unknown = await response.json();
            if (!response.ok) {
                const message = typeof result === "object" && result !== null
                    && "error" in result && typeof result.error === "string"
                    ? result.error
                    : "Unable to load the playlist.";
                throw new Error(message);
            }
            if (!Array.isArray(result)) {
                throw new Error("The playlist response has an invalid format.");
            }

            const supportedTracks = result.filter(isStoredTrack);
            if (supportedTracks.length !== result.length) {
                console.warn("[playlist] Ignoring unsupported or invalid tracks from the server.");
            }
            const tracks = supportedTracks.map((track) => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                thumbnailUrl: track.thumbnailUrl,
                source: track.source ?? "youtube" as const,
            }));
            this.writeCachedTracks(email, tracks);
            return {
                tracks,
                currentTrackId: tracks.some((track) => track.id === currentTrackId)
                    ? currentTrackId
                    : null,
            };
        } catch (error) {
            console.warn("[playlist] Server playlist unavailable; using browser cache.", error);
            const tracks = cachedTracks ?? [];
            return {
                tracks,
                currentTrackId: tracks.some((track) => track.id === currentTrackId)
                    ? currentTrackId
                    : null,
                warning: cachedTracks
                    ? "Showing the last playlist saved in this browser."
                    : "The server playlist is unavailable. You can still search and add videos here.",
            };
        }
    }

    static save(email: string, tracks: Track[], currentTrackId: string | null): Promise<void> {
        localStorage.setItem(this.currentTrackKey(email), currentTrackId ?? "");
        this.writeCachedTracks(email, tracks);

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

    private static playlistCacheKey(email: string): string {
        return `musicpad_playlist:${email}`;
    }

    private static readCachedTracks(email: string): Track[] | null {
        const cached = localStorage.getItem(this.playlistCacheKey(email));
        if (cached === null) return null;

        try {
            const tracks: unknown = JSON.parse(cached);
            if (!Array.isArray(tracks)) {
                console.warn("[playlist] Ignoring invalid cached playlist data.");
                return null;
            }
            const supportedTracks = tracks.filter(isStoredTrack);
            if (supportedTracks.length !== tracks.length) {
                console.warn("[playlist] Ignoring unsupported or invalid cached tracks.");
            }
            const normalizedTracks = supportedTracks.map((track) => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                thumbnailUrl: track.thumbnailUrl,
                source: track.source ?? "youtube" as const,
            }));
            this.writeCachedTracks(email, normalizedTracks);
            return normalizedTracks;
        } catch (error) {
            console.warn("[playlist] Could not read the cached playlist.", error);
            return null;
        }
    }

    private static writeCachedTracks(email: string, tracks: Track[]): void {
        localStorage.setItem(this.playlistCacheKey(email), JSON.stringify(tracks));
    }
}
