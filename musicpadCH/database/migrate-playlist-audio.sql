ALTER TABLE playlist
    ADD COLUMN source ENUM('youtube', 'jamendo') NOT NULL DEFAULT 'youtube' AFTER track_id,
    ADD COLUMN audio_url VARCHAR(2048) NULL AFTER thumbnail_url;
