# musicpadCH
A Spotify-style music player built with **TypeScript**, vanilla HTML/CSS and a small **Express + MySQL** backend. The playlist is modeled as a **doubly linked list** (not an array), songs are played through the official YouTube IFrame Player API, and search uses the YouTube Data API v3 through the server (so the API key never reaches the browser). 
