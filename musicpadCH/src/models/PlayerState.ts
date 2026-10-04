import type { Track } from "./Track.js";

export type PlaybackStatus = "playing" | "paused" | "idle";

export interface PlayerState {
    readonly currentTrack: Track | null;
    readonly status: PlaybackStatus;
}
