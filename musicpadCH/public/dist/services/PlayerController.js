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
    constructor(playlist, ytPlayer) {
        this.playlist = playlist;
        this.ytPlayer = ytPlayer;
        this.trackChangeListeners = new Set();
        this.consecutiveErrors = 0;
        this.ytPlayer.onEvent((event) => {
            if (event === "ended")
                this.next();
            if (event === "play")
                this.consecutiveErrors = 0;
            if (event === "error")
                this.handlePlaybackError();
        });
    }
    handlePlaybackError() {
        this.consecutiveErrors++;
        if (this.consecutiveErrors < this.playlist.size) {
            this.next();
        }
        else {
            this.ytPlayer.pause();
        }
    }
    /** Subscribes to "a new track just started loading". Returns an unsubscribe function. */
    onTrackChange(listener) {
        this.trackChangeListeners.add(listener);
        return () => this.trackChangeListeners.delete(listener);
    }
    loadTrack(track) {
        if (!track)
            return;
        this.ytPlayer.playVideo(track.id);
        this.trackChangeListeners.forEach((listener) => listener(track));
    }
    playCurrent() { this.loadTrack(this.playlist.getCurrentTrack()); }
    next() { this.loadTrack(this.playlist.playNext()); }
    previous() { this.loadTrack(this.playlist.playPrevious()); }
    playTrackById(trackId) { this.loadTrack(this.playlist.setCurrentById(trackId)); }
    pause() {
        this.ytPlayer.pause();
    }
    resume() {
        this.ytPlayer.resume();
    }
    fastForward(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0)
            return;
        const target = Math.min(this.ytPlayer.getCurrentTime() + seconds, this.ytPlayer.getDuration());
        this.ytPlayer.seekTo(target);
    }
    rewind(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0)
            return;
        this.ytPlayer.seekTo(Math.max(this.ytPlayer.getCurrentTime() - seconds, 0));
    }
    seekTo(seconds) {
        this.ytPlayer.seekTo(seconds);
    }
    getCurrentTime() {
        return this.ytPlayer.getCurrentTime();
    }
    getDuration() {
        return this.ytPlayer.getDuration();
    }
    setVolume(volume0to1) {
        this.ytPlayer.setVolume(volume0to1);
    }
}
//# sourceMappingURL=PlayerController.js.map