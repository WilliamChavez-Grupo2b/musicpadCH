DELETE FROM playlist
WHERE source = 'jamendo';

ALTER TABLE playlist
    MODIFY COLUMN source ENUM('youtube') NOT NULL DEFAULT 'youtube',
    DROP COLUMN audio_url;
