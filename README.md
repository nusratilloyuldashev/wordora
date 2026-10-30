# Wordora 2.0 — GitHub + Netlify + Supabase

**Inglizcha so‘zlarni o‘zbekcha interfeys orqali o‘rganish uchun shaxsiy veb-platforma.**

Bu loyiha avvalgi Wordora (FastAPI + SQLite) dizaynini saqlagan holda, **Netlify'da alohida Python serverisiz** ishlashi uchun moslashtirilgan. Sayt oddiy HTML, CSS va JavaScript, autentifikatsiya va ma’lumotlar uchun Supabase Auth + PostgreSQL ishlatadi.

**Eng tez boshlash:** [DEPLOY_UZ.md](DEPLOY_UZ.md) — o‘zbek tilida, bosqichma-bosqich qo‘llanma.

## Imkoniyatlari

- Email + parol bilan ro‘yxatdan o‘tish, kirish, chiqish va parol tiklash.
- Dastlabki **86 ta** so‘z, 8 mavzu, misol jumlalar va tarjimalar.
- 4 mashq: kartochka, variantli test, yozib topish, tinglab yozish.
- SM-2-ga o‘xshash takrorlash: xatolar va natijalarga qarab keyingi takrorlash kuni belgilanadi.
- Kunlik reja (15 ta javob), 7 kunlik faollik, uzluksiz kunlar, qayta ko‘rish navbati.
- Shaxsiy so‘z qo‘shish va o‘chirish (bitta hisobda 5000 tagacha).
- Kompyuter va mobil ekranlar uchun mos dizayn.
- Barcha natijalar Supabase PostgreSQL'da saqlanadi; boshqa qurilmada kirganda ham mavjud bo‘ladi.
- RLS: har bir foydalanuvchi faqat **o‘z** so‘zlari va natijalarini ko‘radi. Standart 86 ta so‘z ro‘yxatdan o‘tgan hamma uchun umumiy.

## Fayllar

```text
wordora-netlify-supabase/
├── src/                     # Netlify'da chiqadigan brauzer kodi
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── supabase-api.js
│   └── favicon.svg
├── supabase/
│   └── setup.sql           # RLS, jadvallar, xavfsiz RPC, 86 ta so‘z
├── scripts/
│   └── build.mjs           # dist/ generatsiyasi va ochiq config
├── tests/
│   └── project.test.mjs
├── netlify.toml            # Build va publish: dist
├── .env.example
├── package.json            # External npm packages kerak emas
└── DEPLOY_UZ.md            # Joylash yo‘riqnomasi
```

## Ishlash tamoyili

`npm run build` `src/` fayllarni `dist/` ga nusxalaydi va `SUPABASE_URL` hamda `SUPABASE_PUBLISHABLE_KEY` muhiti orqali `dist/config.js` yaratadi. Bu ikkala qiymat *brauzer uchun mo‘ljallangan ochiq koordinatalar*; maxfiy kalit emas. **`sb_secret_...`, `service_role` yoki database passwordni Netlify frontend environment'iga kiritmang.**

Brauzer Supabase JS 2.x kutubxonasini pinned CDN orqali oladi. U Auth sessiyasini boshqaradi va foydalanuvchi JWT yordamida PostgreSQL API'ga so‘rov yuboradi. Qo‘shimcha FastAPI, Render yoki Netlify Function talab qilinmaydi.

## Lokal ishga tushirish

Node.js 20.11+ yoki Python 3 uchun oddiy statik server yetarli, ammo Netlify build scripti uchun Node kerak:

```bash
cp .env.example .env
# .env'dagi SUPABASE_URL va SUPABASE_PUBLISHABLE_KEY ni to‘ldiring.
npm run build
python3 -m http.server 5173 --directory dist
# http://localhost:5173
```

Supabase Auth → URL Configuration → Redirect URLs ga `http://localhost:5173/**` qo‘shing, agar lokal email linklar bilan ishlasangiz.

Tekshirish:

```bash
npm test
node --check src/app.js
node --check src/supabase-api.js
```

## Muhim cheklovlar

- Bu tayyor **deploy qilinadigan MVP**, ammo sizning Supabase/Netlify hisobingizda joylanmaguncha jonli xizmat deb ayta olmaymiz. Ulanish uchun shaxsiy loyiha URL/key va `setup.sql`ni ishga tushirish **zarur**.
- Sayt email/parol bilan ishlaydi; avvalgi lokal SQLite'dagi akkauntlar/parollar avtomatik ko‘chmaydi. Alohida migratsiya talab etiladi.
- Eshitish mashqi brauzerning `speechSynthesis` qo‘llab-quvvatlashiga bog‘liq.
- Kartochkada o‘z-o‘zini baholash, qolgan mashqlarda javob to‘g‘riligini aniqlash brauzerda sodir bo‘ladi. Bu shaxsiy o‘rganish ilovasi, imtihon uchun firibgarlikdan himoyalangan baholash tizimi emas.
- Suhbatdagi / eski serverdagi `wordora.db` **GitHub’ga yuklanmaydi**.
- Keng miqyosli xizmatdan oldin email jo‘natish limitlari, abuse/rate limiting, monitoring, backup va qo‘shimcha SQL RLS testlari muhim.

Rasmiy manbalar:
- [Supabase JS](https://supabase.com/docs/reference/javascript/installing)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Netlify environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/)
- [Netlify deploy with Git](https://docs.netlify.com/start/overview/)
