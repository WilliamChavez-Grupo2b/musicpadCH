/**
 * Represents a single song that can be placed inside the playlist.
 * `id` is the YouTube videoId, which doubles as a unique identifier
 * and as the value used to load the video in the player.
 */
export interface Track {
    id: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
}
