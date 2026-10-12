/**
 * Represents a single song that can be placed inside the playlist.
 * The ID is the YouTube video ID for both official-audio and music-video
 * search results.
 */
export type TrackSource = "youtube";
export interface Track {
    id: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    source?: TrackSource;
}
