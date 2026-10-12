import { PlaylistManager } from "./PlaylistManager.js";
import { YouTubePlayerService } from "./YouTubePlayerService.js";
import { AudioPlayerService } from "./AudioPlayerService.js";
import type { Track, TrackSource } from "../models/Track.js";

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
    private activeSource: TrackSource | null = null;
    private consecutiveErrors = 0;

    constructor(
        private readonly playlist: PlaylistManager,
        private readonly ytPlayer: YouTubePlayerService,
        private readonly audioPlayer: AudioPlayerService
    ) {
        this.ytPlayer.onEvent((event) => {
            if (this.activeSource !== "youtube") return;
            if (event === "ended") this.next();
            if (event === "play") this.consecutiveErrors = 0;
            if (event === "error") this.handlePlaybackError("youtube");
        });
        this.audioPlayer.onEvent((event) => {
            if (this.activeSource !== "jamendo") return;
            if (event === "ended") this.next();
            if (event === "play") this.consecutiveErrors = 0;
            if (event === "error") this.handlePlaybackError("jamendo");
        });
    }

    private handlePlaybackError(source: TrackSource): void {
        if (this.activeSource !== source) return;
        this.consecutiveErrors++;
        if (this.consecutiveErrors < this.playlist.size) {
            this.next();
        } else {
            this.activePlayer.pause();
        }
    }

    /** Subscribes to "a new track just started loading". Returns an unsubscribe function. */
    onTrackChange(listener: TrackChangeListener): () => void {
        this.trackChangeListeners.add(listener);
        return () => this.trackChangeListeners.delete(listener);
    }

    private loadTrack(track: Track | null): void {
        if (!track) return;
        const source = track.source ?? (track.audioUrl ? "jamendo" : "youtube");
        if (source === "jamendo") {
            if (!track.audioUrl) {
                console.error(`[player] Jamendo track "${track.title}" has no audio URL.`);
                return;
            }
            this.activeSource = source;
            this.ytPlayer.pause();
            this.audioPlayer.play(track.audioUrl);
        } else {
            this.activeSource = source;
            this.audioPlayer.pause();
            this.ytPlayer.playVideo(track.id);
        }
        this.trackChangeListeners.forEach((listener) => listener(track));
    }

    private get activePlayer(): YouTubePlayerService | AudioPlayerService {
        return this.activeSource === "jamendo" ? this.audioPlayer : this.ytPlayer;
    }

    playCurrent(): void { this.loadTrack(this.playlist.getCurrentTrack()); }
    next(): void { this.loadTrack(this.playlist.playNext()); }
    previous(): void { this.loadTrack(this.playlist.playPrevious()); }
    playTrackById(trackId: string): void { this.loadTrack(this.playlist.setCurrentById(trackId)); }

    pause(): void {
        this.activePlayer.pause();
    }

    resume(): void {
        this.activePlayer.resume();
    }

    fastForward(seconds: number): void {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        const target = Math.min(
            this.activePlayer.getCurrentTime() + seconds,
            this.activePlayer.getDuration(),
        );
        this.activePlayer.seekTo(target);
    }

    rewind(seconds: number): void {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        this.activePlayer.seekTo(Math.max(this.activePlayer.getCurrentTime() - seconds, 0));
    }

    seekTo(seconds: number): void {
        this.activePlayer.seekTo(seconds);
    }

    getCurrentTime(): number {
        return this.activePlayer.getCurrentTime();
    }

    getDuration(): number {
        return this.activePlayer.getDuration();
    }

    setVolume(volume0to1: number): void {
        this.ytPlayer.setVolume(volume0to1);
        this.audioPlayer.setVolume(volume0to1);
    }
}
