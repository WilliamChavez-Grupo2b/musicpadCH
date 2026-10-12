import type { Track } from "../models/Track.js";

interface JamendoResult {
    id: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    audioUrl: string;
}

function isJamendoResult(value: unknown): value is JamendoResult {
    if (typeof value !== "object" || value === null) return false;
    return "id" in value && typeof value.id === "string"
        && "title" in value && typeof value.title === "string"
        && "artist" in value && typeof value.artist === "string"
        && "thumbnailUrl" in value && typeof value.thumbnailUrl === "string"
        && "audioUrl" in value && typeof value.audioUrl === "string"
        && value.audioUrl.startsWith("https://");
}

export class MusicService {
    async searchTracks(query: string): Promise<Track[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const response = await fetch(`/api/music/search?q=${encodeURIComponent(trimmed)}`);
        const data: unknown = await response.json();
        if (!response.ok) {
            const message = typeof data === "object" && data !== null && "error" in data
                && typeof data.error === "string"
                ? data.error
                : "Music search failed.";
            throw new Error(message);
        }
        if (!Array.isArray(data)) {
            throw new Error("Jamendo returned an invalid search response.");
        }

        return data.filter(isJamendoResult).map((item) => ({
            ...item,
            id: `jamendo:${item.id}`,
            source: "jamendo" as const,
        }));
    }
}