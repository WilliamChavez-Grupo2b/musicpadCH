# musicpadCH
A Spotify-style music player built with **TypeScript**, vanilla HTML/CSS and a small **Express + MySQL** backend. The playlist is modeled as a **doubly linked list** (not an array). Search is available through YouTube Data API v3 and Jamendo; YouTube tracks play through the official IFrame Player API, while Jamendo tracks play through the browser audio player.

## Environment configuration

The server reads its configuration from `.env` using `dotenv`. Start the server from this project directory so that the file is found.

1. Copy `.env.example` to `.env` with `Copy-Item .env.example .env` in PowerShell.
2. Set the values in `.env` for your local database, YouTube Data API v3 key, and Jamendo client ID.
3. Install dependencies and start the app:

   ```powershell
   npm install
   npm start
   ```

| Variable | Purpose | Local default |
| --- | --- | --- |
| `PORT` | HTTP port for the Express server. | `8000` |
| `DB_HOST` | MySQL server hostname. | `private` |
| `DB_PORT` | MySQL server port. | `3306` |
| `DB_USER` | MySQL username. | `root` |
| `DB_PASSWORD` | MySQL password. Leave empty for the included local Docker database. | private |
| `DB_NAME` | Database used for accounts and playlists. | `private` |
| `YOUTUBE_API_KEY` | Server-side YouTube Data API v3 key used for music search. | private |
| `JAMENDO_CLIENT_ID` | Server-side Jamendo API client ID used for Jamendo search. | unset |

For the included local MySQL setup, run `docker compose up -d db`; the database service allows an empty root password and initializes the `usuariosmusicpad` schema. Set `YOUTUBE_API_KEY` and `JAMENDO_CLIENT_ID` to enable each search provider. Both credentials stay on the server and are not sent to the browser.

## Playlist database

Each account's playlist is loaded from and saved to the `playlist` table in the configured `DB_NAME` database. Run `database/init.sql` to create the required table and indexes. For an existing playlist table, run `database/migrate-playlist-audio.sql` once to add the `source` and `audio_url` columns. The table must have `id`, `user_email`, `track_id`, `source`, `title`, `artist`, `thumbnail_url`, `audio_url`, `position`, `added_at`, and `modified_at`. The `(user_email, track_id)` pair must be unique so playlist edits update existing rows instead of adding duplicates. Track order is stored in `position`; timestamps are maintained by MySQL. The currently selected track remains a browser preference for each account.

Never put real credentials in `.env.example` or commit `.env`. The example contains placeholders and is safe to share; `.env` is excluded by Git.
