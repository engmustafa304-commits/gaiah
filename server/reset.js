// إعادة تهيئة قاعدة البيانات (احذر: تمسح كل شيء). الاستعمال: npm run seed:reset
"use strict";
const { createApp } = require("./index");
const { seedAll, close } = createApp();
seedAll();
close();
console.log("تمت إعادة تهيئة قاعدة البيانات.");
