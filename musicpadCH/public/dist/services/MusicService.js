function isJamendoResult(value) {
    if (typeof value !== "object" || value === null)
        return false;
    return "id" in value && typeof value.id === "string"
        && "title" in value && typeof value.title === "string"
        && "artist" in value && typeof value.artist === "string"
        && "thumbnailUrl" in value && typeof value.thumbnailUrl === "string"
        && "audioUrl" in value && typeof value.audioUrl === "string"
        && value.audioUrl.startsWith("https://");
}
export class MusicService {
    async searchTracks(query) {
        const trimmed = query.trim();
        if (!trimmed)
            return [];
        const response = await fetch(`/api/music/search?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json();
        if (!response.ok) {
            const message = typeof data === "object" && data !== null && "error" in data
                && typeof data.error === "string"
                ? data.error
                : "Music search failed.";
            throw new Error(message);
        }
        if (!Array.isArray(data)) {
            throw new Error("Jamendo returned an invalid search response.");
        }
        return data.filter(isJamendoResult).map((item) => ({
            ...item,
            id: `jamendo:${item.id}`,
            source: "jamendo",
        }));
    }
}
//# sourceMappingURL=MusicService.js.map