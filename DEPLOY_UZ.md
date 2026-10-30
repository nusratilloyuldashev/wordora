# Wordora: GitHub + Supabase + Netlify'ga chiqarish

**Xohlasangiz, faqat brauzer orqali qilasiz.** Kodga o‘zgartirish kiritish shart emas. Jarayon taxminan 3 hisobdan iborat: GitHub (kod), Supabase (foydalanuvchilar va baza), Netlify (veb-sayt).

## 1. Supabase loyihasini yarating

1. https://supabase.com/dashboard ga kiring → **New project**.
2. Loyiha uchun nom tanlang (masalan, `wordora`), kuchli database password o‘rnating. **Database passwordni GitHub/Netlify'ga joylamang.**
3. Loyiha yaratilgach **SQL Editor → New query** ni oching.
4. Arxivdagi `supabase/setup.sql` faylini ochib, uning **hamma matnini** SQL Editor'ga joylang → **Run**.
5. `Success` chiqqanini va Table Editor'da `words`, `progress`, `reviews` jadvallari mavjudligini tekshiring. `words`da 86 ta umumiy so‘z bo‘lishi kerak.
6. **Authentication → Providers → Email**: email/password sign-in yoqilganligiga ishonch hosil qiling. Confirm email faol bo‘lsa, foydalanuvchi xatdagi havolani bosgandan keyingina tizimga kiradi.

> `setup.sql`ni takror ishga tushirish mavjud foydalanuvchilarning natijalarini o‘chirmaydi. SQL'da RLS va o‘zgarishlarni yangilovchi funksiyalar mavjud.

## 2. Supabase URL va public key'ni oling

Supabase **Project Settings → API / API Keys** (yoki `Connect`) oynasidan oling:

- **Project URL**: `https://abcxyz.supabase.co` ko‘rinishida.
- **Publishable key**: `sb_publishable_...` ko‘rinishida. Eski loyihada `anon/public` JWT key ham ishlaydi.

**MUHIM:** `service_role`, `sb_secret_...`, JWT secret yoki database passwordni umuman frontendga qo‘ymang! Ochiq publishable key bilan xavfsizlik `auth.uid()` va RLS siyosatlari orqali ta’minlanadi.

## 3. GitHub repository oching

1. https://github.com/new ga kiring.
2. `wordora` kabi yangi repository yarating.
3. ZIP'ni kompyuterga oching. GitHub repository'sida **Add file → Upload files** orqali ZIP ichidagi `src`, `supabase`, `scripts`, `tests` papkalari hamda `netlify.toml`, `package.json`, `README.md`, `DEPLOY_UZ.md`, `.env.example`, `.gitignore` fayllarini yuklang.
4. **ZIP'ning o‘zini yagona fayl sifatida yuklamang**; Netlify kod fayllarini repository ildizida ko‘rishi kerak.
5. **Commit changes** tugmasini bosing. `.env` (haqiqiy kalitlari bor fayl) yoki eski `wordora.db`ni yuklamang.

## 4. Netlify'ga joylang

1. https://app.netlify.com/ ni oching → **Add new project/site** → **Import an existing project** → **GitHub**.
2. Yangi `wordora` repositorysini tanlang.
3. Build sozlamalari `netlify.toml` orqali berilgan:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Base directory:** bo‘sh (repo ildizi)
4. Site configuration / **Environment variables** qismiga quyidagilarni qo‘shing:
   - `SUPABASE_URL` = Supabase Project URL
   - `SUPABASE_PUBLISHABLE_KEY` = Supabase publishable key (`sb_publishable_...`)

   Eski `anon` JWT bilan ishlatsangiz ikkinchisining o‘rniga `SUPABASE_ANON_KEY` yozishingiz mumkin.

5. **Deploy** tugmasini bosing. Script `dist/config.js`ni build vaqtida yaratadi. Agar env variables kiritilmagan bo‘lsa, build ataylab xato bilan to‘xtaydi va kerakli sozlama nomini aytadi.
6. Netlify `https://<sizning-saytingiz>.netlify.app/` manzilini beradi.

Keyingi GitHub commitlari Netlify'da avtomatik build/deployni ishga tushiradi.

## 5. Email havolalari uchun URL sozlang (juda muhim)

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://<sizning-saytingiz>.netlify.app/`
- **Redirect URLs**: `https://<sizning-saytingiz>.netlify.app/**`
- Lokal test uchun ixtiyoriy: `http://localhost:5173/**`

Shunda ro‘yxatdan o‘tishni tasdiqlash va parolni tiklash emailidagi havolalar Wordora sahifasiga qaytadi. Domenni keyinroq almashtirsangiz, Supabase'dagi URLlarni ham yangilang.

## 6. Tekshirish

1. Saytni yangi **incognito** oynasida oching.
2. Email/parol orqali ro‘yxatdan o‘ting. Email confirmation yoqilgan bo‘lsa, tasdiqlash xatini kuting va havolani bosing.
3. Kirib, `Kundalik hayot` mavzusida kartochka mashqini bajaring.
4. `Tarjimani top`, `Yozib top`, `Tinglab yoz` mashqlarini sinang (ovoz uchun brauzerda English voice bo‘lishi mumkin).
5. `Mening lug‘atim`ga so‘z qo‘shing, sahifani refresh qiling. So‘z va natija saqlanishi kerak.
6. Boshqa email bilan alohida akkaunt yaratib ko‘ring: birinchi hisobning shaxsiy so‘zlari va natijalari ko‘rinmasligi kerak.
7. Parolni tiklashni ham sinang.

## Eng ko‘p uchraydigan xatolar

- **Build failed / missing SUPABASE_URL:** Netlify Environment Variables’ni kiriting va Deploys → Trigger deploy → Deploy site.
- **Wordora sozlanmagan:** Publishable key yoki URL yo‘q/yaroqsiz. `config.js` avtomatik yaratiladi, uni GitHub'da qo‘lda yozmang.
- **relation `words` does not exist / function `wordora_stats` does not exist:** `supabase/setup.sql` to‘liq bajarilmagan yoki boshqa Supabase loyihasining URL/key'lari yozilgan.
- **permission denied / 42501:** RLS siyosatlari yoki role grant'lari o‘rnatilmagan; `setup.sql`ni SQL Editor'da yana tekshiring.
- **Email kelmadi:** Supabase Email provider, spam papka, SMTP/restrictions va Supabase Auth → Logs ni tekshiring. Katta miqyos uchun maxsus SMTP kerak bo‘lishi mumkin.
- **Email havolasi noto‘g‘ri saytga yo‘naltiradi:** Authentication → URL Configuration ni tekshiring.
- **Supabase kutubxonasi yuklanmayapti:** Brauzer jsDelivr CDN'ga chiqolmayapti. Internet yoki bloklashni tekshiring; kerak bo‘lsa keyingi versiyada npm bundle'ga o‘tish mumkin.

## Texnik eslatma

Statik frontend faqat Supabase **anon/publishable** key bilan ishlaydi. Baza RLS bilan himoyalangan. `wordora_review` RPC'si faqat `auth.uid()`dagi foydalanuvchining ko‘rinadigan so‘zlari uchun progress yozadi; boshqa foydalanuvchining IDsi mijozdan qabul qilinmaydi. Bu himoya o‘quv progressini boshqa hisobga yozishga yo‘l qo‘ymaydi, lekin foydalanuvchining o‘z natijasini manipulyatsiya qilishini to‘liq oldini olmaydi.

**Oldingi FastAPI + SQLite akkauntlari va ularning parollari avtomatik import qilinmaydi.** Bu versiyada yangi Supabase Auth hisobi talab qilinadi.
