import { AuthService } from "../services/AuthService.js";
import { YouTubeService } from "../services/YouTubeService.js";
import { PlaylistManager } from "../services/PlaylistManager.js";
import { PlaylistStorage } from "../utils/PlaylistStorage.js";
const auth = new AuthService();
const session = auth.requireSession();
if (!session) {
    throw new Error("Redirecting to login...");
}
const searchModeSelect = document.querySelector("#search-mode");
const accountEmail = session.email;
const youtube = new YouTubeService();
const playlist = new PlaylistManager();
const statusMessage = document.querySelector("#status-message");
try {
    const snapshot = await PlaylistStorage.load(accountEmail);
    playlist.hydrate(snapshot.tracks, snapshot.currentTrackId);
}
catch (error) {
    statusMessage.textContent = error instanceof Error
        ? `Playlist unavailable: ${error.message}`
        : "Playlist unavailable. Please try again.";
    throw error;
}
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const resultsList = document.querySelector("#results-list");
const positionInput = document.querySelector("#position-input");
function toTrack(result) {
    return {
        id: result.videoId,
        title: result.title,
        artist: result.channelTitle,
        thumbnailUrl: result.thumbnailUrl,
        source: "youtube",
    };
}
function persist() {
    void PlaylistStorage.save(accountEmail, playlist.toArray(), playlist.getCurrentTrack()?.id ?? null).catch((error) => {
        statusMessage.textContent = error instanceof Error
            ? `Playlist save failed: ${error.message}`
            : "Playlist save failed. Please try again.";
    });
}
function addTrack(track, placement) {
    if (playlist.contains(track.id)) {
        statusMessage.textContent = `"${track.title}" has already been added to the playlist.`;
        return;
    }
    if (placement === "position") {
        const position = Number(positionInput.value);
        if (!Number.isInteger(position) || position < 1) {
            statusMessage.textContent = "Enter a valid position (1, 2, 3, ...) first.";
            return;
        }
        playlist.addAtPosition(position, track);
        persist();
        statusMessage.textContent = `"${track.title}" added at position ${position}.`;
        return;
    }
    if (placement === "start") {
        playlist.addAtStart(track);
        statusMessage.textContent = `"${track.title}" added to the start of the playlist.`;
    }
    else {
        playlist.addAtEnd(track);
        statusMessage.textContent = `"${track.title}" added to the end of the playlist.`;
    }
    persist();
}
function renderResults(results) {
    resultsList.innerHTML = "";
    if (results.length === 0) {
        statusMessage.textContent = "No songs found. Try another search.";
        return;
    }
    statusMessage.textContent = `${results.length} songs found.`;
    for (const result of results) {
        const item = document.createElement("li");
        item.className = "result-item";
        const thumbnail = document.createElement("img");
        thumbnail.src = result.thumbnailUrl;
        thumbnail.alt = `${result.title} thumbnail`;
        thumbnail.width = 60;
        thumbnail.height = 45;
        const info = document.createElement("div");
        info.className = "result-info";
        const title = document.createElement("p");
        title.className = "result-title";
        title.textContent = result.title;
        const artist = document.createElement("p");
        artist.className = "result-artist";
        artist.textContent = result.artist;
        info.append(title, artist);
        const actions = document.createElement("div");
        actions.className = "result-actions";
        const startButton = document.createElement("button");
        startButton.type = "button";
        startButton.dataset.action = "start";
        startButton.textContent = "Add to start";
        const endButton = document.createElement("button");
        endButton.type = "button";
        endButton.dataset.action = "end";
        endButton.textContent = "Add to end";
        const positionButton = document.createElement("button");
        positionButton.type = "button";
        positionButton.dataset.action = "position";
        positionButton.textContent = "Add at position";
        actions.append(startButton, endButton, positionButton);
        item.append(thumbnail, info, actions);
        item.querySelector('[data-action="start"]').addEventListener("click", () => {
            addTrack(result, "start");
        });
        item.querySelector('[data-action="end"]').addEventListener("click", () => {
            addTrack(result, "end");
        });
        item.querySelector('[data-action="position"]').addEventListener("click", () => {
            addTrack(result, "position");
        });
        resultsList.appendChild(item);
    }
}
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
        statusMessage.textContent = "Type something to search.";
        return;
    }
    statusMessage.textContent = "Searching...";
    try {
        const selectedMode = searchModeSelect.value;
        if (selectedMode !== "audio" && selectedMode !== "video") {
            throw new Error("Select a valid YouTube search mode.");
        }
        const mode = selectedMode;
        const results = (await youtube.searchSongs(query, 10, mode)).map(toTrack);
        renderResults(results);
    }
    catch (error) {
        statusMessage.textContent = error instanceof Error
            ? error.message
            : "Music search failed. Please try again.";
    }
});
//# sourceMappingURL=searchController.js.map