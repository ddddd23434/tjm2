const express = require("express");
const path = require("path");
const { Pool } = require("pg"); // Импортируем pg

const app = express();
const PORT = process.env.PORT || 3000; // Используем порт Render

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Загружаем URL из Render
  ssl: { rejectUnauthorized: false } // Нужно для удалённого PostgreSQL
});

// Проверяем подключение
pool.connect()
  .then(() => console.log("✅ Успешное подключение к PostgreSQL"))
  .catch(err => console.error("❌ Ошибка подключения:", err));

// Даем доступ к статическим файлам
app.use(express.static(path.join(__dirname, "public")));

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Пример API-запроса: получить данные из БД
app.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users"); // SQL-запрос
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

// Запускаем сервер на 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
