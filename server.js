const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. 注册接口
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!/^[a-zA-Z0-9_]{4,16}$/.test(username)) {
        return res.status(400).json({ error: '用户名格式错误！须为 4-16 位字母、数字或下划线' });
    }
    if (!password || password.length < 6 || password.length > 20) {
        return res.status(400).json({ error: '密码须为 6-20 位字符' });
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const stmtUser = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const result = stmtUser.run(username, hashedPassword);
        const userId = result.lastInsertRowid;

        // 初始化存档：默认 1 级，0 经验，5 个格子
        const stmtSave = db.prepare('INSERT INTO game_saves (user_id, level, exp, max_crates) VALUES (?, 1, 0, 5)');
        stmtSave.run(userId);

        res.json({ success: true, message: '注册成功' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: '账号已存在！' });
        }
        res.status(500).json({ error: '服务器错误' });
    }
});

// 2. 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(400).json({ error: '用户名或密码不正确！' });
    }

    res.json({ success: true, userId: user.id, username: user.username });
});

// 3. 获取用户存档
app.get('/api/game-data/:userId', (req, res) => {
    const { userId } = req.params;
    const save = db.prepare('SELECT * FROM game_saves WHERE user_id = ?').get(userId);
    
    if (!save) return res.status(404).json({ error: '未找到存档' });

    res.json({
        caps: save.caps,
        level: save.level || 1,
        exp: save.exp || 0,
        maxCrates: save.max_crates || 5,
        isVip: Boolean(save.is_vip),
        crates: JSON.parse(save.crates),
        inventory: JSON.parse(save.inventory),
        equipment: JSON.parse(save.equipment)
    });
});

// 4. 保存游戏存档
app.post('/api/game-data/save', (req, res) => {
    const { userId, gameData } = req.body;
    if (!userId || !gameData) return res.status(400).json({ error: '参数缺失' });

    const stmt = db.prepare(`
        UPDATE game_saves 
        SET caps = ?, level = ?, exp = ?, max_crates = ?, is_vip = ?, crates = ?, inventory = ?, equipment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
    `);

    stmt.run(
        gameData.caps,
        gameData.level || 1,
        gameData.exp || 0,
        gameData.maxCrates,
        gameData.isVip ? 1 : 0,
        JSON.stringify(gameData.crates),
        JSON.stringify(gameData.inventory),
        JSON.stringify(gameData.equipment),
        userId
    );

    res.json({ success: true });
});

// 5. 卡密兑换接口
app.post('/api/redeem', (req, res) => {
    const { userId, cdk } = req.body;
    const cleanCdk = (cdk || '').trim().toUpperCase();

    if (cleanCdk === 'VIP666' || cleanCdk === 'VIP888') {
        const stmt = db.prepare('UPDATE game_saves SET is_vip = 1, max_crates = 999 WHERE user_id = ?');
        stmt.run(userId);
        return res.json({ success: true, message: 'VIP 卡密激活成功！' });
    }

    res.status(400).json({ error: '卡密不正确！' });
});

app.listen(PORT, () => {
    console.log(`🚀 游戏服务端已在本地启动: http://localhost:${PORT}`);
});