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
