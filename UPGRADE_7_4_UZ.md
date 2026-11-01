# Wordora 7.4 — Offline test konflikti, oxirgi sinxronlash va diagnostika

## Asosiy yangilanish

Wordora 7.4 test natijalarini saqlashda `wordora_save_exam_v74` yangi server RPC'sidan
foydalanadi. Ilgari ikki qurilmada bajarilgan testlar serverdagi yangiroq testni
oddiy `upsert` orqali almashtirishi mumkin edi.

Yangi funksiya har bir so'zning **test topshirishdan oldingi `tested_at`**
qiymatini serverdagi hozirgi qiymat bilan atomar tekshiradi.

- Biror so'zga boshqa qurilmada yangi test topshirilgan bo'lsa,
  **butun eski testning hech bir qatori yozilmaydi** (konflikt).
- Bir necha marta yuborilgan bir xil test `request_id` orqali bir marta
  bajariladi. O'zgartirilgan mazmunda bir xil ID yuborilsa xato.
- Offline testlar internetga chiqishdan oldin IndexedDB navbatida saqlanadi.
- Konflikt natijasi avtomatik o'chmaydi, navbatda saqlanadi. Foydalanuvchi
  serverdagi yangi natijani qoldirishni tanlasa, eski test lokal arxivlanadi.
- Yuqoridagi offline bannerda **Oxirgi sinxronlash vaqti** va konflikt soni
  ko'rsatiladi. Sana foydalanuvchining brauzer vaqt zonasida aks etadi.
- `await window.WordoraDiagnostics.status()` kesh, navbat, konflikt,
  so'nggi muvaffaqiyatli yuborish va qisqa xato kodini ko'rsatadi.
  **Maxfiy tokenlar yoki email ma'lumotlari tashqi monitoringga yuborilmaydi.**
- PWA kesh versiyasi `wordora-pwa-7.4.0` ga o'tdi.

## Production Supabase uchun bir martalik majburiy qadam

**Wordora 7.4 kodi GitHub’da tayyor, ammo asosiy Supabase’da migratsiya
bajarilmaguncha offline testlar sinxronlana olmaydi.**

1. <https://supabase.com/dashboard> → asl **Wordora** loyihasini oching.
2. SQL Editor → New query.
3. <https://github.com/nusratilloyuldashev/wordora/blob/main/supabase/upgrade_7_4.sql>
   faylni to'liq ko'chirib, **Run** bosing.
4. `Success. No rows returned.` chiqishi kerak.
5. Cloudflare Pages'da yangilanish muvaffaqiyatli chiqqanini tekshirib,
   <https://wordora.pages.dev> sahifasini `Ctrl+Shift+R` bilan yangilang.

**SQL fayl ADDITIVE:** yangi `wordora_exam_requests` jadvali va
`wordora_save_exam_v74` funksiyasini yaratadi. Eski jadvallar,
o'quvchilar, Unitlar va natijalarni o'chirmaydi.

## Sinov

GitHub Actions ishchi kompyuterida LOCAL Supabase Auth + PostgREST +
PostgreSQL ishga tushadi. Test flow 100 → 250 → 500 virtual o'quvchida:
- Email/parol bilan Auth login va REST yuklash
- Unit yaratish, mashq review idempotency
- `wordora_save_exam_v74` bilan 95% test natijasini yozish
- **Ayni UUID bilan qayta yuborish**, ikki marta yozilmaganini tekshirish
- **Yangi UUID bilan eskirgan oldingi timestamp** yuborish va
  hech qanday natija yangilanmaganini tekshirish
- So'zlar, Unitlar, reviews va learning umumiy sonining to'g'riligini tekshirish

Testda 500 virtual o'quvchi bo'lsa ham eng ko'pi 60 faol jarayon.
Hosted Supabase serverining 500 simultaneous-session quvvati tasdiqlanmaydi.

## Qolgan cheklovlar

- Konflikt aniqlash **test natijasining oxirgi `tested_at` qiymatiga**
  asoslanadi. Boshqa qurilmaning faqat testga aloqasiz `word_learning`
  maydonlarini o'zgartirishini to'liq bloklamaydi.
- Eski brauzer versiyalari to'g'ridan-to'g'ri `word_learning.upsert`
  bilan yozishi mumkin. Ularni yangi 7.4 ga o'tkazish kerak.
- Eski offline testlarda `expected_tested_at` bo'lmasa, xavfsizlik
  uchun serverda avvalgi test mavjud bo'lganda konflikt chiqariladi.
  Shunda eski natija o'chmaydi, qurilmadagi navbatda qoladi.
- Brauzer ma'lumotlari qo'lda o'chirilsa yoki qurilma butunlay buzilsa,
  serverga yuborilmagan natijani tiklash kafolatlanmaydi.
- Real Supabase Free/Pro resurslari uchun to'liq staging testi hali kerak.
