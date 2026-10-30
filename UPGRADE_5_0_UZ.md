# Wordora 5.0 — inglizcha so‘z tekshirish va Essential Unit to‘plamlari

## Nimalar qo‘shildi?

- To‘g‘ri javobdan keyin yodlashning 2- va 3-aylanishida **1 soniya ichida avtomatik keyingi so‘zga o‘tish**. Xohlovchilar belgilash katagini o‘chirishi mumkin.
- So‘z kiritishda bepul inglizcha lug‘at API yordamida tekshirish; topilmagan so‘z qo‘shilmaydi va o‘xshash imlo taklif etiladi. Masalan, `bigg` → `big`. Lug‘at cheklangan: noma’lum texnik termin yoki kam uchraydigan iboralar mavjud bo‘lishi mumkin, shuning uchun API javobi mutlaq haqiqat emas.
- Tekshirilgan so‘z uchun **so‘z turkumi** (ot, fe’l, sifat va hokazo) lug‘at ma’lumotlariga qarab taklif etiladi. Ayrim so‘zlar bir nechta turkumga ega, shuning uchun maydon foydalanuvchiga ochiq qoladi.
- **Asosiy mavzu** (sport, kiyim, ob-havo…) ma’lum so‘zlar ro‘yxati asosida taxmin qilinadi. Noma’lum so‘z avtomatik noto‘g‘ri mavzuga kiritilmaydi: “Boshqa mavzu” turadi, foydalanuvchi tanlaydi.
- **Kitob/Unit/shaxsiy to‘plam** yangi mustaqil qatlam. Masalan, `Essential 1 — Unit 1`, `Essential 1 — Unit 2`, `Imtihon so‘zlari`. Bir xil so‘z bir nechta to‘plamda bo‘lishi mumkin, ammo bir marta umumiy bazada saqlanadi. So‘zning turkumi va mavzu belgilari o‘zgarmaydi.
- Lug‘atda mavjud so‘zlarni har qanday to‘plamga biriktirish, to‘plamni yaratish, nomini o‘zgartirish va o‘chirish. To‘plam o‘chsa so‘zlarning o‘zi va avvalgi yodlash/test natijalari saqlanadi.
- **Yodlash, Mashq, Test, Lug‘at** sahifalarida kitob/Unit filtiri mavjud; mavzu va turkumlar bilan birgalikda ishlaydi.
- Kichik ekranlarda lug‘at jadvali kartalarga ajratildi.

## Joylashtirish

1. GitHub `main` branchdagi kodni Netlify avtomatik build qilayotganini tekshiring.
2. Supabase Dashboard → **Wordora** → SQL Editor → **New query**.
3. Faqat `supabase/upgrade_5_0.sql` faylining **to‘liq** kodini qo‘ying. `setup.sql`ni va oldingi yangilanishlarni qayta ishga tushirmang.
4. Imkon bo‘lsa, bazaning zaxira nusxasini oling va `Run` bosing. Natija odatda `Success. No rows returned`.
5. Saytni `Ctrl + Shift + R` bilan yangilang. Mening lug‘atim → So‘z qo‘shish orqali tekshiring.

**Muhim:** Wordora 5.0 uchun Supabase migratsiyasi amalga oshirilmaguncha tizimning oldingi 4.0 lug‘at qo‘shish oynasi ishlaydi va yangi Unit funksiyasi faollashmaydi. Avvalgi foydalanuvchilar, so‘zlar, yodlash va test ma’lumotlari o‘chirilmaydi.

## Cheklovlar

- Lug‘at tekshiruvi brauzerda amalga oshadi; bu server darajasida kafolatlangan tekshiruv emas. Oflayn holatda yangi so‘z kiritish vaqtincha bloklanadi, mavjud so‘zlar bilan yodlash davom etadi.
- Inglizcha so‘zga **mavzuni** avtomatik belgilash konservativ lug‘atga tayanadi, 100% aniqlikni va’da qilmaydi.
- Universal inglizcha lug‘at API yangi texnik so‘zlar va iboralarni topmasligi mumkin.
- To‘plam nomlari foydalanuvchiga xos; ko‘p foydalanuvchili bazada RLS har birining to‘plamini himoya qiladi.