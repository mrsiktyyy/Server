const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');

// Загрузка БД
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        return { users: {} };
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return { users: {} };
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Инициализация
if (!fs.existsSync(DB_FILE)) {
    saveDB({ users: {} });
}

// Регистрация
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    if (username.length > 20 || password.length > 20) {
        return res.status(400).json({ error: 'Max 20 characters' });
    }
    const db = loadDB();
    if (db.users[username]) {
        return res.status(400).json({ error: 'User already exists' });
    }
    db.users[username] = {
        password,
        bestWave: 0,
        gamesPlayed: 0,
        totalTimeMinutes: 0
    };
    saveDB(db);
    res.json({ success: true });
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = loadDB();
    const user = db.users[username];
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ success: true });
});

// Получить статистику игрока
app.get('/api/user/:username', (req, res) => {
    const db = loadDB();
    const user = db.users[req.params.username];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...stats } = user;
    res.json(stats);
});

// Обновить статистику
app.post('/api/update', (req, res) => {
    const { username, bestWave, gamesPlayed, totalTimeMinutes } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }
    const db = loadDB();
    const user = db.users[username];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (bestWave !== undefined) user.bestWave = Math.max(user.bestWave || 0, bestWave);
    if (gamesPlayed !== undefined) user.gamesPlayed = gamesPlayed;
    if (totalTimeMinutes !== undefined) user.totalTimeMinutes = totalTimeMinutes;
    saveDB(db);
    res.json({ success: true });
});

// Таблица лидеров (топ-10)
app.get('/api/leaderboard', (req, res) => {
    const db = loadDB();
    const entries = Object.entries(db.users).map(([name, data]) => ({
        name,
        bestWave: data.bestWave || 0
    }));
    entries.sort((a, b) => b.bestWave - a.bestWave);
    res.json(entries.slice(0, 10));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`MSB server running on port ${PORT}`);
});