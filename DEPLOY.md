# نشر جيّة على VPS من هوستينجر (Docker + Caddy)

النتيجة: الموقع على `https://دومينك` مع HTTPS تلقائي، وقاعدة بيانات على قرص دائم، ونسخ احتياطي يومي.

## 0) ما تحتاجه
- مستودع GitHub فيه الكود (خاص يُفضَّل).
- VPS من هوستينجر (Ubuntu) وعنوان IP الخاص به.
- الدومين على هوستينجر (أو أي مزود يتيح تعديل سجلات DNS).

## 1) إنشاء/تهيئة الـ VPS
في hPanel ▸ **VPS** ▸ اختر نظام **Ubuntu 24.04** (يوجد قالب «with Docker» إن ظهر لك فاخترْه، وإلا ثبّت Docker في الخطوة 3). دوّن **عنوان IP** وكلمة مرور root أو أضف مفتاح SSH.

## 2) توجيه الدومين إلى الخادم (DNS)
hPanel ▸ **Domains** ▸ دومينك ▸ **DNS / Nameservers** ▸ **DNS Records**:

| النوع | الاسم | القيمة |
|---|---|---|
| A | `@` | عنوان IP للـ VPS |
| A | `www` | عنوان IP للـ VPS |

احذف أي سجلات A/AAAA قديمة لنفس الاسمين (كانت تشير لاستضافة ثانية). يستغرق الانتشار دقائق إلى ساعات. للتحقق من جهازك:
```
nslookup yourdomain.com
```
يجب أن يرجع IP الخادم. **لا تكمل الخطوة 5 قبل ذلك**، فـ Caddy يحتاج الدومين موجَّهًا ليصدر الشهادة.

## 3) الدخول إلى الخادم وتجهيزه
من جهازك (PowerShell):
```
ssh root@SERVER_IP
```
على الخادم:
```bash
apt update && apt upgrade -y
# إن لم يكن Docker مثبتًا (قالب Ubuntu عادي):
curl -fsSL https://get.docker.com | sh
# جدار ناري: SSH + الويب فقط
ufw allow OpenSSH && ufw allow 80 && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable
```

## 4) سحب الكود من GitHub (مستودع خاص بمفتاح Deploy)
على الخادم:
```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/gaiah_deploy
cat ~/.ssh/gaiah_deploy.pub        # انسخ الناتج
```
في GitHub ▸ المستودع ▸ **Settings ▸ Deploy keys ▸ Add deploy key** ▸ الصق المفتاح (اترك Write غير مفعّل). ثم على الخادم:
```bash
export GIT_SSH_COMMAND="ssh -i ~/.ssh/gaiah_deploy -o StrictHostKeyChecking=accept-new"
git clone git@github.com:USER/REPO.git /opt/gaiah
cd /opt/gaiah
echo 'export GIT_SSH_COMMAND="ssh -i ~/.ssh/gaiah_deploy"' >> ~/.bashrc
```

## 5) إعدادات الإنتاج وتشغيل الموقع
```bash
cd /opt/gaiah
cp .env.example .env
nano .env
```
عبّئ هذه القيم (احفظ بـ `Ctrl+O` ثم اخرج `Ctrl+X`):
```
DOMAIN=yourdomain.com            # بدون https://
SESSION_SECRET=...               # ولّده:  openssl rand -hex 32
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=...               # قوية وفريدة (12 حرفًا فأكثر)
SEED_DEMO=false
```
ثم:
```bash
docker compose up -d --build
docker compose ps                # الحاويتان gaiah و caddy يجب أن تكونا Up
docker compose logs -f caddy     # يظهر إصدار الشهادة؛ اخرج بـ Ctrl+C
```
افتح `https://yourdomain.com` ثم `/login.html?t=admin` وادخل ببيانات `.env`.

> **مهم:** حساب الإدارة يُنشأ عند أول تشغيل فقط. غيّر القيم قبل أول `up`. تغيير `ADMIN_PASSWORD` لاحقًا في `.env` لا يغيّر كلمة المرور الموجودة (لا توجد حتى الآن شاشة تغيير كلمة مرور الإدارة).

## 6) نسخ احتياطي يومي
```bash
chmod +x /opt/gaiah/scripts/backup.sh
crontab -e
# أضف السطر:
30 3 * * * cd /opt/gaiah && sh scripts/backup.sh >> /var/log/gaiah-backup.log 2>&1
```
النسخ تُحفظ داخل حجم Docker في `/data/backups` وتُحذف بعد 14 يومًا. **انسخها دوريًا خارج الخادم** (جهازك أو تخزين سحابي)، لأن فقدان الخادم يفقدها معه:
```bash
docker compose cp gaiah:/data/backups ./backups-local
```
وفعّل **Snapshots/Backups** في هوستينجر للـ VPS كطبقة إضافية.

## 7) تحديث الموقع بعد أي تعديل
على جهازك: `git push`. على الخادم:
```bash
cd /opt/gaiah && git pull && docker compose up -d --build
```
البيانات (قاعدة SQLite) في حجم Docker `gaiah-data` فلا تُمسح بالتحديث.

## 8) أوامر مفيدة
```bash
docker compose logs -f gaiah      # سجلات التطبيق
docker compose restart gaiah      # إعادة تشغيل
docker compose down               # إيقاف (البيانات تبقى)
curl -s https://yourdomain.com/api/health
```

## ما يجب مراجعته قبل فتح الموقع للجمهور
- صفحات **الخدمات** و**السحوبات** و**الباقات** وأرقام الرئيسية ما زالت **محتوى تجريبيًا ثابتًا** في ملفات `public/`؛ استبدلها أو أخفِها قبل الإطلاق.
- الدفع الإلكتروني والتحقق بالرسائل غير مفعّلين بعد (انظر آخر `README.md`).
- فعّل صفحات الشروط والخصوصية الحقيقية.
