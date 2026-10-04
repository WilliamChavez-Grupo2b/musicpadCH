/**
 * YouTubeService
 * --------------------------------------------------------------------------
 * Searches for songs using the server-side YouTube Data API v3 endpoint.
 *
 * Note: there is no public, official "YouTube Music API". The supported,
 * documented way to search YouTube from a browser app is the YouTube Data
 * API v3 (https://developers.google.com/youtube/v3), filtered to the Music
 * category. Playback is then handled by the official YouTube IFrame Player
 * API (see YouTubePlayerService.ts), which needs no API key.
 *
 * Configure YOUTUBE_API_KEY in the server's .env file.
 */
export class YouTubeService {
    async searchSongs(query, maxResults = 10) {
        const trimmed = query.trim();
        if (!trimmed)
            return [];
        const params = new URLSearchParams({
            q: trimmed,
            maxResults: String(maxResults),
        });
        const response = await fetch(`/api/youtube/search?${params.toString()}`);
        if (!response.ok) {
            const result = (await response.json());
            throw new Error(result.error ?? `YouTube search failed: ${response.status}`);
        }
        return (await response.json());
    }
}
//# sourceMappingURL=YouTubeService.js.map