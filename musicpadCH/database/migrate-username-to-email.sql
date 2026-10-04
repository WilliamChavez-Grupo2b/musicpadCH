ALTER TABLE users
    CHANGE COLUMN username email VARCHAR(254) NOT NULL;

ALTER TABLE users
    DROP INDEX users_username_unique,
    ADD UNIQUE KEY users_email_unique (email);
