const path = require("node:path");
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT ?? 8000);

const pool = mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "usuariosmusicpad",
    waitForConnections: true,
    connectionLimit: 10,
});

// Tracks whether the last DB check succeeded, so auth routes can fail fast
// with a clear message instead of hanging/timing out when MySQL is down.
let databaseAvailable = false;

async function checkDatabase() {
    try {
        await pool.query("SELECT 1");
        if (!databaseAvailable) {
            console.log("[db] Connected to MySQL.");
        }
        databaseAvailable = true;
    } catch (error) {
        if (databaseAvailable) {
            console.warn("[db] Lost connection to MySQL:", error.message);
        }
        databaseAvailable = false;
    }
    return databaseAvailable;
}

app.use(express.json({ limit: "10kb" }));

function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Auth routes (require MySQL)
// ---------------------------------------------------------------------------

app.post("/api/auth/register", async (request, response) => {
    if (!(await checkDatabase())) {
        response.status(503).json({
            error: "The database is not available right now. Start MySQL (see README) and try again.",
        });
        return;
    }

    const email = normalizeEmail(request.body?.email);
    const password = typeof request.body?.password === "string" ? request.body.password : "";

    if (!isValidEmail(email)) {
        response.status(400).json({ error: "Enter a valid email address." });
        return;
    }
    if (password.length < 8) {
        response.status(400).json({ error: "Password must be at least 8 characters." });
        return;
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        await pool.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            [email, passwordHash],
        );
        response.status(201).json({ email });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            response.status(409).json({ error: "That email is already registered." });
            return;
        }
        console.error("[auth] Registration request failed:", error);
        response.status(500).json({ error: "Unable to create account." });
    }
});

app.post("/api/auth/login", async (request, response) => {
    if (!(await checkDatabase())) {
        response.status(503).json({
            error: "The database is not available right now. Start MySQL (see README) and try again.",
        });
        return;
    }

    const email = normalizeEmail(request.body?.email);
    const password = typeof request.body?.password === "string" ? request.body.password : "";

    if (!isValidEmail(email) || !password) {
        response.status(400).json({ error: "A valid email and password are required." });
        return;
    }

    try {
        const [rows] = await pool.execute(
            "SELECT email, password_hash FROM users WHERE email = ? LIMIT 1",
            [email],
        );
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            response.status(401).json({ error: "Invalid email or password." });
            return;
        }

        response.json({ email: user.email });
    } catch (error) {
        console.error("[auth] Login request failed:", error);
        response.status(500).json({ error: "Login service is unavailable." });
    }
});

// ---------------------------------------------------------------------------
// YouTube search (does NOT require MySQL — works even if the DB is down)
// ---------------------------------------------------------------------------

app.get("/api/youtube/search", async (request, response) => {
    const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const requestedResults = Number(request.query.maxResults ?? 10);

    if (!query || query.length > 200) {
        response.status(400).json({ error: "Search query must be between 1 and 200 characters." });
        return;
    }
    if (!Number.isInteger(requestedResults) || requestedResults < 1 || requestedResults > 25) {
        response.status(400).json({ error: "maxResults must be an integer between 1 and 25." });
        return;
    }
    if (!process.env.YOUTUBE_API_KEY) {
        response.status(503).json({ error: "Set YOUTUBE_API_KEY in the server .env file to enable music search." });
        return;
    }

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        videoCategoryId: "10",
        maxResults: String(requestedResults),
        key: process.env.YOUTUBE_API_KEY,
    }).toString();

    try {
        const youtubeResponse = await fetch(url);
        const data = await youtubeResponse.json();

        if (!youtubeResponse.ok) {
            // Log the real reason from Google to the server console (API key
            // restrictions, quota exceeded, disabled API, etc.) without
            // leaking the key itself to the browser.
            const reason = data?.error?.message ?? `HTTP ${youtubeResponse.status}`;
            console.error("[youtube] Search failed:", reason);

            response.status(502).json({
                error:
                    "YouTube music search failed. Check the server console for the exact reason " +
                    "(common causes: the API key is restricted to a different site/IP, the " +
                    "YouTube Data API v3 isn't enabled on the project, or the daily quota was used up).",
            });
            return;
        }

        const results = (data.items ?? []).map((item) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.medium?.url
                ?? item.snippet.thumbnails.default?.url
                ?? "",
        }));
        response.json(results);
    } catch (error) {
        console.error("[youtube] Search request failed:", error);
        response.status(502).json({ error: "YouTube music search is temporarily unavailable." });
    }
});

// ---------------------------------------------------------------------------
// Health check — quick way to see what's working without digging through logs
// ---------------------------------------------------------------------------

app.get("/api/health", async (_request, response) => {
    response.json({
        server: "ok",
        database: (await checkDatabase()) ? "connected" : "unavailable",
        youtubeApiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY),
    });
});

// ---------------------------------------------------------------------------
// Static frontend
// Only the public/ folder is served — .env, database/, node_modules and
// server.cjs itself are never reachable from the browser.
// ---------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, "public"), { index: "inicio.html" }));

async function start() {
    const dbOk = await checkDatabase();
    if (!dbOk) {
        console.warn(
            "[db] Could not connect to MySQL. The site will still start — search and playback " +
            "work without it — but login/register will return an error until the database is " +
            "running (see README: 'Setting up the database')."
        );
    }

    app.listen(port, () => {
        console.log(`MusicPad is available at http://localhost:${port}`);
    });
}

void start();
