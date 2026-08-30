const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'game.db'));

function initDb() {
    // 建立用户表
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 建立游戏存档表
    db.exec(`
        CREATE TABLE IF NOT EXISTS game_saves (
            user_id INTEGER PRIMARY KEY,
            caps INTEGER DEFAULT 100,
            level INTEGER DEFAULT 1,
            exp INTEGER DEFAULT 0,
            max_crates INTEGER DEFAULT 5,
            is_vip INTEGER DEFAULT 0,
            crates TEXT DEFAULT '[]',
            inventory TEXT DEFAULT '[]',
            equipment TEXT DEFAULT '{"weapon":null,"armor":null}',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // 兼容已有数据库：补充 level 与 exp 字段
    try {
        db.exec(`ALTER TABLE game_saves ADD COLUMN level INTEGER DEFAULT 1;`);
    } catch (e) {}
    try {
        db.exec(`ALTER TABLE game_saves ADD COLUMN exp INTEGER DEFAULT 0;`);
    } catch (e) {}

    console.log('✅ SQLite 数据库初始化成功！');
}

initDb();
module.exports = db;