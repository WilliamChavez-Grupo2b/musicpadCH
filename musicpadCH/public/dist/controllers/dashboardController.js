import { AuthService } from "../services/AuthService.js";
import { PlaylistManager } from "../services/PlaylistManager.js";
import { YouTubePlayerService } from "../services/YouTubePlayerService.js";
import { PlayerController } from "../services/PlayerController.js";
import { PlaylistStorage } from "../utils/PlaylistStorage.js";
import { LyricsService, findActiveLyricIndex } from "../services/LyricsService.js";
const auth = new AuthService();
const session = auth.requireSession();
if (!session) {
    throw new Error("Redirecting to login...");
}
const usernameLabel = document.querySelector("#email-label");
usernameLabel.textContent = session.email;
const playlist = new PlaylistManager();
const ytPlayer = new YouTubePlayerService("youtube-player");
const player = new PlayerController(playlist, ytPlayer);
const lyricsService = new LyricsService();
const snapshot = PlaylistStorage.load();
playlist.hydrate(snapshot.tracks, snapshot.currentTrackId);
const playlistList = document.querySelector("#playlist-list");
const emptyState = document.querySelector("#empty-state");
const nowPlayingTitle = document.querySelector("#now-playing-title");
const nowPlayingArtist = document.querySelector("#now-playing-artist");
const nowPlayingThumb = document.querySelector("#now-playing-thumb");
const playPauseButton = document.querySelector("#play-pause-button");
const nextButton = document.querySelector("#next-button");
const previousButton = document.querySelector("#previous-button");
const volumeInput = document.querySelector("#volume-input");
const logoutButton = document.querySelector("#logout-button");
const fastForwardButton = document.querySelector("#fast-forward");
const rewindButton = document.querySelector("#rewind-button");
const progressBar = document.querySelector("#progress-bar");
const currentTimeLabel = document.querySelector("#current-time");
const durationLabel = document.querySelector("#duration");
const lyricsPanel = document.querySelector("#lyrics-panel");
const lyricsTabButton = document.querySelector("#lyrics-tab-button");
let isPlaying = false;
let videoLoaded = false;
let isDraggingProgress = false;
let currentLyrics = [];
let activeLyricIndex = -1;
let lyricsRequestToken = 0; // avoids a slow, stale lyrics fetch overwriting a newer one
// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
function formatTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0)
        return "0:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
// ---------------------------------------------------------------------------
// Playlist rendering (doubly linked list -> DOM)
// ---------------------------------------------------------------------------
function persist(tracks, current) {
    PlaylistStorage.save(tracks, current?.id ?? null);
}
function renderPlaylist(tracks, current) {
    playlistList.innerHTML = "";
    emptyState.hidden = tracks.length > 0;
    tracks.forEach((track, index) => {
        const item = document.createElement("li");
        item.className = "playlist-item" + (track.id === current?.id ? " is-current" : "");
        item.draggable = true;
        item.dataset.trackId = track.id;
        item.setAttribute("aria-label", `${track.title} by ${track.artist}. Drag to reorder.`);
        const connector = index === 0 ? "" : "↔";
        item.innerHTML = `
            <span class="connector">${connector}</span>
            <img src="${track.thumbnailUrl}" alt="${track.title} thumbnail" width="40" height="30" />
            <div class="playlist-info">
                <p class="playlist-title">${track.title}</p>
                <p class="playlist-artist">${track.artist}</p>
            </div>
            <button type="button" class="play-button" data-id="${track.id}">▶</button>
            <button type="button" class="remove-button" data-id="${track.id}">✕</button>
        `;
        item.querySelector(".play-button").addEventListener("click", () => {
            player.playTrackById(track.id);
            isPlaying = true;
            updatePlayPauseLabel();
        });
        item.querySelector(".remove-button").addEventListener("click", () => {
            const wasPlaying = playlist.getCurrentTrack()?.id === track.id;
            playlist.removeById(track.id);
            if (wasPlaying) {
                const next = playlist.getCurrentTrack();
                if (next) {
                    player.playTrackById(next.id);
                }
                else {
                    player.pause();
                    isPlaying = false;
                    updatePlayPauseLabel();
                }
            }
        });
        item.addEventListener("dragstart", (event) => {
            if (!event.dataTransfer)
                return;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", track.id);
            item.classList.add("is-dragging");
        });
        item.addEventListener("dragend", () => {
            item.classList.remove("is-dragging");
            playlistList.querySelectorAll(".is-drop-target").forEach((target) => {
                target.classList.remove("is-drop-target");
            });
        });
        item.addEventListener("dragover", (event) => {
            event.preventDefault();
            if (event.dataTransfer)
                event.dataTransfer.dropEffect = "move";
            item.classList.add("is-drop-target");
        });
        item.addEventListener("dragleave", (event) => {
            if (!item.contains(event.relatedTarget)) {
                item.classList.remove("is-drop-target");
            }
        });
        item.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            item.classList.remove("is-drop-target");
            const draggedId = event.dataTransfer?.getData("text/plain");
            if (!draggedId || draggedId === track.id)
                return;
            const insertAfter = event.clientY > item.getBoundingClientRect().top + item.offsetHeight / 2;
            const insertionIndex = index + (insertAfter ? 1 : 0);
            const draggedIndex = tracks.findIndex((candidate) => candidate.id === draggedId);
            const targetIndex = insertionIndex - (draggedIndex < insertionIndex ? 1 : 0);
            playlist.moveToPosition(draggedId, targetIndex);
        });
        playlistList.appendChild(item);
    });
    playlistList.ondragover = (event) => {
        event.preventDefault();
        if (event.dataTransfer)
            event.dataTransfer.dropEffect = "move";
    };
    playlistList.ondrop = (event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer?.getData("text/plain");
        if (!draggedId)
            return;
        const target = event.target instanceof Element
            ? event.target
            : event.target instanceof Node
                ? event.target.parentElement
                : null;
        if (!target)
            return;
        if (target !== playlistList && target.closest(".playlist-item"))
            return;
        playlist.moveToPosition(draggedId, tracks.length - 1);
    };
    renderNowPlaying(current);
}
function renderNowPlaying(current) {
    if (!current) {
        nowPlayingTitle.textContent = "No song selected";
        nowPlayingArtist.textContent = "Add a song from the search page to start.";
        nowPlayingThumb.src = "";
        nowPlayingThumb.hidden = true;
        return;
    }
    nowPlayingThumb.hidden = false;
    nowPlayingThumb.src = current.thumbnailUrl;
    nowPlayingTitle.textContent = current.title;
    nowPlayingArtist.textContent = current.artist;
}
function updatePlayPauseLabel() {
    playPauseButton.textContent = isPlaying ? "⏸ Pause" : "▶ Play";
}
function setPlaybackState(playing) {
    isPlaying = playing;
    updatePlayPauseLabel();
}
function updateTransportControls(duration = player.getDuration()) {
    const hasCurrentTrack = playlist.getCurrentTrack() !== null;
    previousButton.disabled = !hasCurrentTrack || !playlist.hasPrevious();
    nextButton.disabled = !hasCurrentTrack || !playlist.hasNext();
    rewindButton.disabled = !hasCurrentTrack || duration <= 0;
    fastForwardButton.disabled = !hasCurrentTrack || duration <= 0;
    progressBar.disabled = !hasCurrentTrack || duration <= 0;
}
playlist.onChange((tracks, current) => {
    renderPlaylist(tracks, current);
    persist(tracks, current);
    updateTransportControls();
});
// ---------------------------------------------------------------------------
// Progress bar — synced to whatever video is actually loaded right now
// ---------------------------------------------------------------------------
function resetProgressUI() {
    progressBar.value = "0";
    progressBar.max = "0";
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";
    updateTransportControls(0);
}
// Runs continuously; reads the REAL state of the YouTube player every tick.
// This is the only reliable way to track progress — the IFrame API has no
// "time update" event, unlike the native <video> element.
setInterval(() => {
    const duration = player.getDuration();
    updateTransportControls(duration);
    if (!isPlaying || isDraggingProgress)
        return;
    const current = player.getCurrentTime();
    if (duration > 0) {
        progressBar.max = String(duration);
        progressBar.value = String(Math.min(current, duration));
        currentTimeLabel.textContent = formatTime(current);
        durationLabel.textContent = formatTime(duration);
    }
    updateActiveLyric(current);
}, 500);
// Live preview while dragging (doesn't seek yet).
progressBar.addEventListener("input", () => {
    isDraggingProgress = true;
    const duration = player.getDuration();
    if (duration > 0) {
        currentTimeLabel.textContent = formatTime(Number(progressBar.value));
    }
});
// Fires when the user releases the handle (mouse up / touch end / arrow key
// commit) — this is when we actually jump the video to that position.
progressBar.addEventListener("change", () => {
    const duration = player.getDuration();
    if (duration > 0) {
        const seekSeconds = Math.min(Math.max(Number(progressBar.value), 0), duration);
        player.seekTo(seekSeconds);
    }
    isDraggingProgress = false;
});
// ---------------------------------------------------------------------------
// Lyrics panel — Spotify-style, synced to the current playback time
// ---------------------------------------------------------------------------
function renderLyricsPanel() {
    if (currentLyrics.length === 0) {
        lyricsPanel.innerHTML = `<p class="lyrics-empty">No synced lyrics found for this song.</p>`;
        return;
    }
    lyricsPanel.innerHTML = currentLyrics
        .map((line, index) => `<p class="lyric-line" data-index="${index}">${line.text || "♪"}</p>`)
        .join("");
}
function updateActiveLyric(currentTime) {
    if (currentLyrics.length === 0)
        return;
    const newIndex = findActiveLyricIndex(currentLyrics, currentTime);
    if (newIndex === activeLyricIndex)
        return;
    const previousEl = lyricsPanel.querySelector(`[data-index="${activeLyricIndex}"]`);
    previousEl?.classList.remove("is-active");
    activeLyricIndex = newIndex;
    const activeEl = lyricsPanel.querySelector(`[data-index="${activeLyricIndex}"]`);
    if (activeEl) {
        activeEl.classList.add("is-active");
        activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
    }
}
async function loadLyricsFor(track) {
    const requestToken = ++lyricsRequestToken;
    currentLyrics = [];
    activeLyricIndex = -1;
    lyricsPanel.innerHTML = `<p class="lyrics-empty">Loading lyrics...</p>`;
    const lines = await lyricsService.fetchSyncedLyrics(track.title, track.artist);
    // A newer track change happened while this request was in flight — discard.
    if (requestToken !== lyricsRequestToken)
        return;
    currentLyrics = lines ?? [];
    renderLyricsPanel();
}
// ---------------------------------------------------------------------------
// Transport controls
// ---------------------------------------------------------------------------
// Fires every time a NEW video actually starts loading (next/previous/pick a
// song/auto-advance) — this is the correct place to reset the progress bar
// and fetch lyrics, as opposed to playlist.onChange, which also fires for
// unrelated edits like adding or removing a song.
player.onTrackChange((track) => {
    videoLoaded = true;
    setPlaybackState(true);
    resetProgressUI();
    void loadLyricsFor(track);
});
playPauseButton.addEventListener("click", () => {
    if (!playlist.getCurrentTrack())
        return;
    if (isPlaying) {
        player.pause();
        setPlaybackState(false);
    }
    else if (videoLoaded) {
        player.resume();
        setPlaybackState(true);
    }
    else {
        player.playCurrent();
    }
});
nextButton.addEventListener("click", () => {
    player.next();
});
previousButton.addEventListener("click", () => {
    player.previous();
});
fastForwardButton.addEventListener("click", () => {
    player.fastForward(10); // Fast forward by 10 seconds
});
rewindButton.addEventListener("click", () => {
    player.rewind(10); // Rewind by 10 seconds
});
volumeInput.addEventListener("input", () => {
    player.setVolume(Number(volumeInput.value) / 100);
});
logoutButton.addEventListener("click", () => {
    auth.logout();
    window.location.href = "login.html";
});
lyricsTabButton.addEventListener("click", () => {
    const isExpanded = Boolean(lyricsPanel.hidden);
    lyricsPanel.hidden = !isExpanded;
    lyricsTabButton.setAttribute("aria-expanded", String(isExpanded));
    lyricsTabButton.textContent = isExpanded ? "Hide Lyrics" : "Show Lyrics";
    lyricsTabButton.classList.toggle("is-active", isExpanded);
});
updatePlayPauseLabel();
resetProgressUI();
updateTransportControls();
renderLyricsPanel();
//# sourceMappingURL=dashboardController.js.map