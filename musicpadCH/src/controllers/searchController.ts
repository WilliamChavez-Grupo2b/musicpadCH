import { AuthService } from "../services/AuthService.js";
import { YouTubeService, YouTubeSearchResult } from "../services/YouTubeService.js";
import { PlaylistManager } from "../services/PlaylistManager.js";
import { PlaylistStorage } from "../utils/PlaylistStorage.js";
import type { Track } from "../models/Track.js";

const auth = new AuthService();
if (!auth.requireSession()) {
    throw new Error("Redirecting to login...");
}

const youtube = new YouTubeService();
const playlist = new PlaylistManager();

const snapshot = PlaylistStorage.load();
playlist.hydrate(snapshot.tracks, snapshot.currentTrackId);

const searchForm = document.querySelector<HTMLFormElement>("#search-form")!;
const searchInput = document.querySelector<HTMLInputElement>("#search-input")!;
const resultsList = document.querySelector<HTMLUListElement>("#results-list")!;
const statusMessage = document.querySelector<HTMLParagraphElement>("#status-message")!;
const positionInput = document.querySelector<HTMLInputElement>("#position-input")!;

function toTrack(result: YouTubeSearchResult): Track {
    return {
        id: result.videoId,
        title: result.title,
        artist: result.channelTitle,
        thumbnailUrl: result.thumbnailUrl,
    };
}

function persist(): void {
    PlaylistStorage.save(playlist.toArray(), playlist.getCurrentTrack()?.id ?? null);
}

function addTrack(result: YouTubeSearchResult, placement: "start" | "end" | "position"): void {
    const track = toTrack(result);
    if (playlist.contains(track.id)) {
        statusMessage.textContent = `"${result.title}" has already been added to the playlist.`;
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
        statusMessage.textContent = `"${result.title}" added at position ${position}.`;
        return;
    }

    if (placement === "start") {
        playlist.addAtStart(track);
        statusMessage.textContent = `"${result.title}" added to the start of the playlist.`;
    } else {
        playlist.addAtEnd(track);
        statusMessage.textContent = `"${result.title}" added to the end of the playlist.`;
    }
    persist();
}

function renderResults(results: YouTubeSearchResult[]): void {
    resultsList.innerHTML = "";

    if (results.length === 0) {
        statusMessage.textContent = "No songs found. Try another search.";
        return;
    }

    statusMessage.textContent = `${results.length} songs found.`;

    for (const result of results) {
        const item = document.createElement("li");
        item.className = "result-item";
        item.innerHTML = `
            <img src="${result.thumbnailUrl}" alt="${result.title} thumbnail" width="60" height="45" />
            <div class="result-info">
                <p class="result-title">${result.title}</p>
                <p class="result-artist">${result.channelTitle}</p>
            </div>
            <div class="result-actions">
                <button type="button" data-action="start">Add to start</button>
                <button type="button" data-action="end">Add to end</button>
                <button type="button" data-action="position">Add at position</button>
            </div>
        `;

        item.querySelector('[data-action="start"]')!.addEventListener("click", () => {
            addTrack(result, "start");
        });

        item.querySelector('[data-action="end"]')!.addEventListener("click", () => {
            addTrack(result, "end");
        });

        item.querySelector('[data-action="position"]')!.addEventListener("click", () => {
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
        const results = await youtube.searchSongs(query);
        renderResults(results);
    } catch (error) {
        statusMessage.textContent = error instanceof Error
            ? error.message
            : "Music search failed. Please try again.";
    }
});
