DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lưu trữ dữ liệu đồng bộ (Key-Value Store)
DROP TABLE IF EXISTS user_data;
CREATE TABLE user_data (
  user_id INTEGER,
  key TEXT,       -- Ví dụ: 'vocab_list', 'settings'
  value TEXT,     -- Dữ liệu JSON
  updated_at INTEGER,
  PRIMARY KEY (user_id, key)
);