# Wordora 3.0 — yangilanish

## Nima yangilandi?

- Yodlash (kartochka) mashqlardan alohida bo‘limga ko‘chirildi.
- So‘z qo‘shishda **mavzu** (kiyim, ob-havo, texnologiya va hokazo) va **so‘z turkumi** (ot, fe‘l, sifat, ravish, modal fe‘l va boshqalar) tanlanadi.
- Mavzu, turkum, manba va holat bo‘yicha lug‘at filtrlari qo‘shildi.
- Yangi, yodlanayotgan, yodlangan va takrorlash vaqti kelgan so‘zlar alohida ko‘rsatiladi.
- Yodlangan so‘zlar o‘chmaydi, due_on kelganda qayta takrorlashga chiqadi.
- Mavjud Supabase autentifikatsiyasi va progress ma’lumotlari saqlanadi.

## Muhim: Supabase migratsiyasi kerak

**Oldin** loyiha ma’lumotlarining zaxirasini olish tavsiya etiladi.

1. Supabase Dashboard → to‘g‘ri **wordora** loyihasi → SQL Editor.
2. `supabase/upgrade_3_0.sql` faylini oching.
3. Barcha SQL kodini qo‘ying va **Run** bosing.
4. `Success. No rows returned` yoki muvaffaqiyatli javob chiqqanini tekshiring.
5. Netlify dagi Wordora sahifasini `Ctrl+Shift+R` bilan yangilang.

`setup.sql` ni qayta ishga tushirish kerak emas! Ushbu migratsiya jadvallarni o‘chirmaydi va mavjud `reviews`/`progress` saqlanadi. Migratsiyadan oldin eski lug‘at va mashq funksiyalari ishlaydi. Yangi so‘zlarni ham qo‘shish mumkin, biroq mavzu va so‘z turkumi teglari migratsiyagacha saqlanmaydi; keyin ularni tahrirlash mumkin.

## Saytni joylashtirish

Netlify GitHub `main` branchga ulangan bo‘lsa, unga qo‘shilgan kod avtomatik deploy bo‘ladi. Environment variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) o‘zgarmaydi.