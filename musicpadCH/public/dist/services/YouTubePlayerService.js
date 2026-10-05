/**
 * YouTubePlayerService
 * --------------------------------------------------------------------------
 * Thin, typed wrapper around the official YouTube IFrame Player API
 * (https://developers.google.com/youtube/iframe_api_reference).
 * This is what actually plays audio in the browser — no API key required,
 * it only needs a <div id="..."></div> placeholder in the page.
 */
const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
export class YouTubePlayerService {
    constructor(elementId) {
        this.elementId = elementId;
        this.player = null;
        this.ready = false;
        this.pendingVideoId = null;
        this.listeners = new Set();
        this.loadApi();
    }
    loadApi() {
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
    createPlayer() {
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
                    if (event.data === YT.PlayerState.PLAYING)
                        this.emit("play");
                    if (event.data === YT.PlayerState.PAUSED)
                        this.emit("pause");
                    if (event.data === YT.PlayerState.ENDED)
                        this.emit("ended");
                },
            },
        });
    }
    onEvent(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    emit(event) {
        this.listeners.forEach((listener) => listener(event));
    }
    playVideo(videoId) {
        if (!this.ready || !this.player) {
            this.pendingVideoId = videoId;
            return;
        }
        this.player.loadVideoById(videoId);
    }
    pause() {
        this.player?.pauseVideo();
    }
    resume() {
        this.player?.playVideo();
    }
    forward(seconds) {
        const currentTime = this.player?.getCurrentTime() || 0;
        const duration = this.player?.getDuration() || 0;
        const newTime = Math.min(currentTime + seconds, duration);
        this.player?.seekTo(newTime, true);
    }
    rewind(seconds) {
        const currentTime = this.player?.getCurrentTime() || 0;
        const newTime = Math.max(currentTime - seconds, 0);
        this.player?.seekTo(newTime, true);
    }
    seekTo(seconds) {
        this.player?.seekTo(seconds, true);
    }
    setVolume(volume0to1) {
        this.player?.setVolume(Math.round(volume0to1 * 100));
    }
    /** Current playback position, in seconds. 0 if the player isn't ready yet. */
    getCurrentTime() {
        if (!this.ready || !this.player)
            return 0;
        return this.player.getCurrentTime();
    }
    /**
     * Total duration of the loaded video, in seconds.
     * Returns 0 right after loadVideoById() — YouTube hasn't resolved the
     * video's metadata yet at that point, so callers should keep polling
     * until this becomes > 0 instead of reading it once.
     */
    getDuration() {
        if (!this.ready || !this.player)
            return 0;
        return this.player.getDuration();
    }
}
//# sourceMappingURL=YouTubePlayerService.js.map