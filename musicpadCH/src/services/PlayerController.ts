import { PlaylistManager } from "./PlaylistManager.js";
import { YouTubePlayerService } from "./YouTubePlayerService.js";
import type { Track } from "../models/Track.js";

export type TrackChangeListener = (track: Track) => void;

/**
 * PlayerController
 * --------------------------------------------------------------------------
 * The sync point between the playlist (doubly linked list) and the actual
 * YouTube player. UI controllers should only ever call methods here —
 * never talk to YouTubePlayerService directly — so playback and playlist
 * state can never drift apart.
 *
 * It also emits a "track change" event every time a *new* video is loaded
 * (next/previous/clicking a song/auto-advance on end). This is what the UI
 * should listen to in order to reset the progress bar and re-fetch lyrics —
 * relying on `onChange` from PlaylistManager is not enough, because that
 * also fires for unrelated playlist edits (adding/removing a song) and
 * doesn't tell you a new video actually started loading.
 */
export class PlayerController {
    private readonly trackChangeListeners = new Set<TrackChangeListener>();

    constructor(
        private readonly playlist: PlaylistManager,
        private readonly ytPlayer: YouTubePlayerService
    ) {
        this.ytPlayer.onEvent((event) => {
            if (event === "ended") this.next();
        });
    }

    /** Subscribes to "a new track just started loading". Returns an unsubscribe function. */
    onTrackChange(listener: TrackChangeListener): () => void {
        this.trackChangeListeners.add(listener);
        return () => this.trackChangeListeners.delete(listener);
    }

    private loadTrack(track: Track | null): void {
        if (!track) return;
        this.ytPlayer.playVideo(track.id);
        this.trackChangeListeners.forEach((listener) => listener(track));
    }

    playCurrent(): void {
        this.loadTrack(this.playlist.getCurrentTrack());
    }

    pause(): void {
        this.ytPlayer.pause();
    }

    resume(): void {
        this.ytPlayer.resume();
    }

    next(): void {
        this.loadTrack(this.playlist.playNext());
    }

    previous(): void {
        this.loadTrack(this.playlist.playPrevious());
    }

    playTrackById(trackId: string): void {
        this.loadTrack(this.playlist.setCurrentById(trackId));
    }
    fastForward(seconds: number): void {
        const currentTime = this.ytPlayer.getCurrentTime();
        const duration = this.ytPlayer.getDuration();
        const newTime = Math.min(currentTime + seconds, duration);
        this.ytPlayer.seekTo(newTime);
    }
    
    rewind(seconds: number): void {
        const currentTime = this.ytPlayer.getCurrentTime();
        const newTime = Math.max(currentTime - seconds, 0);
        this.ytPlayer.seekTo(newTime);
    }

    setVolume(volume0to1: number): void {
        this.ytPlayer.setVolume(volume0to1);
    }

    seekTo(seconds: number): void {
        this.ytPlayer.seekTo(seconds);
    }

    getCurrentTime(): number {
        return this.ytPlayer.getCurrentTime();
    }

    getDuration(): number {
        return this.ytPlayer.getDuration();
    }
}
