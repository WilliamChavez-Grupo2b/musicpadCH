/**
 * YouTubePlayerService
 * --------------------------------------------------------------------------
 * Thin, typed wrapper around the official YouTube IFrame Player API
 * (https://developers.google.com/youtube/iframe_api_reference).
 * This is what actually plays audio in the browser — no API key required,
 * it only needs a <div id="..."></div> placeholder in the page.
 */

declare global {
    interface Window {
        YT: typeof YT;
        onYouTubeIframeAPIReady: () => void;
    }
}

declare namespace YT {
    class Player {
        constructor(elementId: string, options: PlayerOptions);
        playVideo(): void;
        pauseVideo(): void;
        loadVideoById(videoId: string): void;
        seekTo(seconds: number, allowSeekAhead: boolean): void;
        setVolume(volume: number): void;
        getCurrentTime(): number;
        getDuration(): number;
    }

    interface PlayerOptions {
        height?: string;
        width?: string;
        playerVars?: Record<string, number | string>;
        events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
        };
    }

    const PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
    };
}

export type PlayerEvent = "play" | "pause" | "ended";
export type PlayerEventListener = (event: PlayerEvent) => void;

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

export class YouTubePlayerService {
    private player: YT.Player | null = null;
    private ready = false;
    private pendingVideoId: string | null = null;
    private readonly listeners = new Set<PlayerEventListener>();

    constructor(private readonly elementId: string) {
        this.loadApi();
    }

    private loadApi(): void {
        if (window.YT && window.YT.Player) {
            this.createPlayer();
            return;
        }

        const existingScript = document.querySelector(`script[src="${IFRAME_API_SRC}"]`);
        if (!existingScript) {
            const tag = document.createElement("script");
            tag.src = IFRAME_API_SRC;
            document.body.appendChild(tag);
        }

        window.onYouTubeIframeAPIReady = () => this.createPlayer();
    }

    private createPlayer(): void {
        this.player = new YT.Player(this.elementId, {
            height: "360",
            width: "640",
            playerVars: {
                playsinline: 1,
                controls: 0,
                disablekb: 1,
                iv_load_policy: 3,
                cc_load_policy: 0,
                rel: 0,
                fs: 0,
            },
            events: {
                onReady: () => {
                    this.ready = true;
                    if (this.pendingVideoId) {
                        this.playVideo(this.pendingVideoId);
                        this.pendingVideoId = null;
                    }
                },
                onStateChange: (event) => {
                    if (event.data === YT.PlayerState.PLAYING) this.emit("play");
                    if (event.data === YT.PlayerState.PAUSED) this.emit("pause");
                    if (event.data === YT.PlayerState.ENDED) this.emit("ended");
                },
            },
        });
    }

    onEvent(listener: PlayerEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: PlayerEvent): void {
        this.listeners.forEach((listener) => listener(event));
    }

    playVideo(videoId: string): void {
        if (!this.ready || !this.player) {
            this.pendingVideoId = videoId;
            return;
        }
        this.player.loadVideoById(videoId);
    }

    pause(): void {
        this.player?.pauseVideo();
    }

    resume(): void {
        this.player?.playVideo();
    }
    forward(seconds: number): void {
        const currentTime = this.player?.getCurrentTime() || 0;
        const duration = this.player?.getDuration() || 0;
        const newTime = Math.min(currentTime + seconds, duration);
        this.player?.seekTo(newTime, true);
    }

    rewind(seconds: number): void {
        const currentTime = this.player?.getCurrentTime() || 0;
        const newTime = Math.max(currentTime - seconds, 0);
        this.player?.seekTo(newTime, true);
    }
    seekTo(seconds: number): void {
        this.player?.seekTo(seconds, true);
    }

    setVolume(volume0to1: number): void {
        this.player?.setVolume(Math.round(volume0to1 * 100));
    }

    /** Current playback position, in seconds. 0 if the player isn't ready yet. */
    getCurrentTime(): number {
        if (!this.ready || !this.player) return 0;
        return this.player.getCurrentTime();
    }

    /**
     * Total duration of the loaded video, in seconds.
     * Returns 0 right after loadVideoById() — YouTube hasn't resolved the
     * video's metadata yet at that point, so callers should keep polling
     * until this becomes > 0 instead of reading it once.
     */
    getDuration(): number {
        if (!this.ready || !this.player) return 0;
        return this.player.getDuration();
    }
}
