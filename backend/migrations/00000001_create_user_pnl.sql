-- SQL untuk membuat tabel User dan PnL (Profit and Loss)
CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE);
CREATE TABLE pnl_logs (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL, created_at DATETIME);
