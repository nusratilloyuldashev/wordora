# Wordora 4.0 — yangi yodlash tizimi

## Yangilanish mazmuni

1. **Yodlash**: 1–40 ta yangi so‘z tanlanadi (20 ta tavsiya). Har bir so‘z uch aylanishda takrorlanadi: obraz/talaffuz, tarjimadan yozish, tinglab yozish. Har bir bosqichda ovoz tugmasi bor. Emoji-obraz va mavzuga mos xotira ishorasi beriladi; ba’zi so‘zlarga alohida eslab qolish sahnasi bor.
2. **Yodlashni yakunlash**: kamida uch aylanish tugagach, foydalanuvchi istasa yana takrorlaydi yoki “Men tayyorman”ni bosadi. Avvalroq chiqsa mashg‘ulot brauzerda saqlanadi, lekin hali tugallanmagan so‘zlar “Yodlanmoqda”ga o‘tmaydi. Brauzer xotirasini tozalash ushbu tugallanmagan mashg‘ulotni o‘chirishi mumkin.
3. **Mashq**: faqat tanishilgan so‘zlar bilan mustahkamlash. Mashq natijasi alohida test o‘rnini bosmaydi.
4. **Test**: qaysi kuni o‘rganilgan so‘zlarni tekshirish tanlanadi. Javoblar test oxirigacha yashiriladi. **90% va yuqori** natija bo‘lsa to‘g‘ri topilgan so‘zlar “Yodlangan”ga o‘tadi, qolganlari “Yodlanmoqda”da qoladi. **90% dan past** bo‘lsa testga kirgan so‘zlar “Yodlanmoqda”da qoladi. Birinchi kelgan so‘zlar testga kirishi uchun yodlashni yakunlagan bo‘lishi kerak.
5. **Takrorlash**: yodlangan so‘zlar ham vaqti kelganida bosh sahifada qayta chiqadi. Takrorlash muddati keyingi mashqlarga qarab oshib boradi.

## GitHub / Netlify

Wordora 4.0 `main` branchga kiritilganda Netlify avtomatik deploy qiladi. Netlify'da hozirgi `SUPABASE_URL` va `SUPABASE_PUBLISHABLE_KEY` o‘zgartirilmaydi. GitHub'dagi `supabase/setup.sql`ni qayta ishlatmang.

## Supabase — bir martalik migratsiya

1. O‘zingizning **wordora** Supabase loyihangizni oching.
2. SQL Editor → **New query** ni bosing. Eski query'ni o‘chirmang.
3. `supabase/upgrade_4_0.sql` faylining to‘liq kodini joylashtiring.
4. Imkon bo‘lsa avval bazaning zaxira nusxasini oling; **Run** tugmasini bosing.
5. `Success. No rows returned` ko‘rinsa, SQL bajarilgan.
6. `https://wordora-english.netlify.app` da `Ctrl + Shift + R` bosing va **Yodlash → Mashq → Test** oqimini sinang.

**Muhim:** yangi migratsiya hali bajarilmagan bo‘lsa Wordora 3.0 ishlashda davom etishi uchun eski interfeys saqlanadi. `words`, `reviews`, `progress`, `auth.users` o‘chirilmaydi. Eski progress ma’lumotlari yangi jadvalda “Yodlanmoqda” deb ko‘riladi, chunki ilgari testdan 90% o‘tganini isbotlaydigan alohida natija yo‘q edi.

### Eslatmalar

- Ovoz — brauzerning `speechSynthesis` texnologiyasi; ovoz sifati tizimdagi inglizcha ovozlarga bog‘liq. Avtomatik ovoz o‘qilishi ba’zi mobil brauzerlarda ruxsat talab qilishi mumkin, 🔊 tugmasi mavjud.
- Tasvirlar — Unicode emoji va yengil animatsiya; har bir so‘z uchun alohida professional fotosurat bazasi hozircha mavjud emas.
- Tugallanmagan yodlash bir xil brauzerda va bir xil foydalanuvchining hisobida tiklanadi; to‘liq yakunlangan so‘zlar esa Supabase'ga saqlanadi.
- Qaysi kundagi so‘zlar bo‘yicha test o'tkazishni sana bo‘yicha tanlash mumkin. Ilgari yodlangan so‘zlarning aniq ilk kuni yozib borilmaganligi sababli migratsiya ularga eski mashq sanasini qo‘llaydi.