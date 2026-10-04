/**
 * LyricsService
 * --------------------------------------------------------------------------
 * Fetches time-synced lyrics (LRC format) from lrclib.net — a free, public,
 * no-API-key-needed lyrics database built specifically for this use case
 * (music players that want a Spotify-style scrolling lyrics view).
 *
 * YouTube itself does not expose synced lyrics through any public API, so
 * this is a separate source, matched by track title + artist name. Matches
 * are best-effort: obscure songs, remixes, or titles that don't match
 * cleanly may return nothing.
 *
 * Docs: https://lrclib.net/docs
 */

export interface LyricLine {
    time: number; // seconds, with decimals
    text: string;
}

interface LrcLibResult {
    trackName: string;
    artistName: string;
    syncedLyrics: string | null;
    plainLyrics: string | null;
}

const SEARCH_ENDPOINT = "https://lrclib.net/api/search";
const TIME_TAG = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

export class LyricsService {
    /**
     * Returns parsed, time-synced lines, or null if no synced lyrics were
     * found for this song (the caller should fall back to "no lyrics
     * available" rather than treat this as an error).
     */
    async fetchSyncedLyrics(title: string, artist: string): Promise<LyricLine[] | null> {
        const params = new URLSearchParams({
            track_name: title,
            artist_name: artist,
        });

        let results: LrcLibResult[];
        try {
            const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`);
            if (!response.ok) return null;
            results = (await response.json()) as LrcLibResult[];
        } catch {
            // Network hiccup or lrclib.net unreachable — degrade silently,
            // lyrics are a nice-to-have, not core playback.
            return null;
        }

        const match = results.find((result) => Boolean(result.syncedLyrics));
        if (!match?.syncedLyrics) return null;

        return parseLrc(match.syncedLyrics);
    }
}

function parseLrc(lrc: string): LyricLine[] {
    const lines: LyricLine[] = [];

    for (const rawLine of lrc.split("\n")) {
        const timeMatches = [...rawLine.matchAll(TIME_TAG)];
        if (timeMatches.length === 0) continue;

        const text = rawLine.replace(TIME_TAG, "").trim();

        for (const match of timeMatches) {
            const minutes = Number(match[1]);
            const seconds = Number(match[2]);
            const fraction = Number(match[3].padEnd(3, "0")) / 1000;
            lines.push({ time: minutes * 60 + seconds + fraction, text });
        }
    }

    return lines.sort((a, b) => a.time - b.time);
}

/**
 * Returns the index of the lyric line that should be highlighted for a
 * given playback time: the last line whose timestamp has already passed.
 * Returns -1 if we're before the first line.
 */
export function findActiveLyricIndex(lines: LyricLine[], currentTime: number): number {
    let activeIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].time <= currentTime) {
            activeIndex = i;
        } else {
            break;
        }
    }
    return activeIndex;
}
