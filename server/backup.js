// نسخة احتياطية متسقة لقاعدة SQLite (آمنة أثناء التشغيل). الاستعمال: node server/backup.js <ملف-الهدف>
"use strict";
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const target = path.resolve(process.argv[2] || path.join(dataDir, "backups", "gaiah-" + new Date().toISOString().slice(0, 10) + ".db"));
fs.mkdirSync(path.dirname(target), { recursive: true });
if (fs.existsSync(target)) fs.unlinkSync(target);
const db = new DatabaseSync(path.join(dataDir, "gaiah.db"));
db.exec("VACUUM INTO '" + target.replace(/'/g, "''") + "'");
db.close();
console.log("تم إنشاء النسخة:", target, (fs.statSync(target).size / 1024).toFixed(0) + " KB");