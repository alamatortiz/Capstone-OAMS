-- One-off migration for an already-running database.
-- Fresh installs already get this table from oams_db.sql's CREATE TABLE;
-- this file only exists to bring an existing database up to date.
--   mysql --host=<host> --port=<port> -u <user> -p --ssl-ca=ca.pem <db> < server/db/add_push_tokens.sql

CREATE TABLE push_tokens (
    push_token_id   INT          AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY uq_push_tokens_token (expo_push_token)
);
