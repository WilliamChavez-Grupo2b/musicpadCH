/**
 * Represents a single song that can be placed inside the playlist.
 * `id` is the source-specific identifier: a YouTube video ID or a prefixed
 * Jamendo track ID. Jamendo tracks also include their direct audio URL.
 */
export type TrackSource = "youtube" | "jamendo";
export interface Track {
    id: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    source?: TrackSource;
    audioUrl?: string;
}
