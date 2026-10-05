CREATE DATABASE IF NOT EXISTS usuariosmusicpad
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE usuariosmusicpad;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email)
);

CREATE TABLE IF NOT EXISTS playlist (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_email VARCHAR(254) NOT NULL,
    track_id VARCHAR(128) NOT NULL,
    title VARCHAR(500) NOT NULL,
    artist VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(2048) NOT NULL,
    position INT UNSIGNED NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY playlist_user_track_unique (user_email, track_id),
    KEY playlist_user_position_index (user_email, position),
    CONSTRAINT playlist_user_email_fk
        FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
);
