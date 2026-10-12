export class AudioPlayerService {
    constructor() {
        this.audio = new Audio();
        this.listeners = new Set();
        this.audio.addEventListener("play", () => this.emit("play"));
        this.audio.addEventListener("pause", () => this.emit("pause"));
        this.audio.addEventListener("ended", () => this.emit("ended"));
        this.audio.addEventListener("error", () => {
            this.emit("error");
        });
    }
    onEvent(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    emit(event) {
        this.listeners.forEach((listener) => listener(event));
    }
    play(audioUrl) {
        if (this.audio.src !== audioUrl) {
            this.audio.src = audioUrl;
        }
        void this.audio.play().catch((error) => {
            console.error("[audio] Unable to start playback:", error);
        });
    }
    pause() {
        this.audio.pause();
    }
    resume() {
        this.play(this.audio.src);
    }
    seekTo(seconds) {
        if (!Number.isFinite(seconds))
            return;
        this.audio.currentTime = Math.max(0, Math.min(seconds, this.getDuration()));
    }
    setVolume(volume0to1) {
        if (!Number.isFinite(volume0to1))
            return;
        this.audio.volume = Math.max(0, Math.min(volume0to1, 1));
    }
    getCurrentTime() {
        return Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    }
    getDuration() {
        return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    }
}
//# sourceMappingURL=AudioPlayerService.js.map