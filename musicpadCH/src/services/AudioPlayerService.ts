export type AudioPlayerEvent = "play" | "pause" | "ended" | "error";
export type AudioPlayerEventListener = (event: AudioPlayerEvent) => void;

export class AudioPlayerService {
    private readonly audio = new Audio();
    private readonly listeners = new Set<AudioPlayerEventListener>();

    constructor() {
        this.audio.addEventListener("play", () => this.emit("play"));
        this.audio.addEventListener("pause", () => this.emit("pause"));
        this.audio.addEventListener("ended", () => this.emit("ended"));
        this.audio.addEventListener("error", () => {
            this.emit("error");
        });
    }

    onEvent(listener: AudioPlayerEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit(event: AudioPlayerEvent): void {
        this.listeners.forEach((listener) => listener(event));
    }

    play(audioUrl: string): void {
        if (this.audio.src !== audioUrl) {
            this.audio.src = audioUrl;
        }

        void this.audio.play().catch((error: unknown) => {
            console.error("[audio] Unable to start playback:", error);
        });
    }

    pause(): void {
        this.audio.pause();
    }

    resume(): void {
        this.play(this.audio.src);
    }

    seekTo(seconds: number): void {
        if (!Number.isFinite(seconds)) return;
        this.audio.currentTime = Math.max(0, Math.min(seconds, this.getDuration()));
    }

    setVolume(volume0to1: number): void {
        if (!Number.isFinite(volume0to1)) return;
        this.audio.volume = Math.max(0, Math.min(volume0to1, 1));
    }

    getCurrentTime(): number {
        return Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    }

    getDuration(): number {
        return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    }
}
