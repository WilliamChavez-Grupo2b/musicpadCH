import { PlaylistManager } from "./PlaylistManager.js";
import { YouTubePlayerService } from "./YouTubePlayerService.js";
import type { Track } from "../models/Track.js";

export type TrackChangeListener = (track: Track) => void;

/**
 * PlayerController
 * --------------------------------------------------------------------------
 * The sync point between the playlist (doubly linked list) and the official
 * YouTube player. UI controllers should only ever call methods here.
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
    private consecutiveErrors = 0;

    constructor(
        private readonly playlist: PlaylistManager,
        private readonly ytPlayer: YouTubePlayerService,
    ) {
        this.ytPlayer.onEvent((event) => {
            if (event === "ended") this.next();
            if (event === "play") this.consecutiveErrors = 0;
            if (event === "error") this.handlePlaybackError();
        });
    }

    private handlePlaybackError(): void {
        this.consecutiveErrors++;
        if (this.consecutiveErrors < this.playlist.size) {
            this.next();
        } else {
            this.ytPlayer.pause();
        }
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

    playCurrent(): void { this.loadTrack(this.playlist.getCurrentTrack()); }
    next(): void { this.loadTrack(this.playlist.playNext()); }
    previous(): void { this.loadTrack(this.playlist.playPrevious()); }
    playTrackById(trackId: string): void { this.loadTrack(this.playlist.setCurrentById(trackId)); }

    pause(): void {
        this.ytPlayer.pause();
    }

    resume(): void {
        this.ytPlayer.resume();
    }

    fastForward(seconds: number): void {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        const target = Math.min(
            this.ytPlayer.getCurrentTime() + seconds,
            this.ytPlayer.getDuration(),
        );
        this.ytPlayer.seekTo(target);
    }

    rewind(seconds: number): void {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        this.ytPlayer.seekTo(Math.max(this.ytPlayer.getCurrentTime() - seconds, 0));
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

    setVolume(volume0to1: number): void {
        this.ytPlayer.setVolume(volume0to1);
    }
}
