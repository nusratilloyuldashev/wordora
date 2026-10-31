# WORDORA 7.0 — tezlik va ko‘p foydalanuvchiga tayyorgarlik

## Maqsad

Wordora’ni hozirgi **Cloudflare Pages + Supabase + PWA** arxitekturasida
ortiqcha so‘rov va ekran yukini kamaytirib, bosqichma-bosqich yuklama sinoviga tayyorlash.

Bu yangilanish **100/500/1000 kishi bir paytda bemalol ishlashi isbotlandi**
degan ma’noni bermaydi. Bunday sonlar faqat haqiqiy sinovdan keyin tasdiqlanadi.

## Nimalar o‘zgardi

1. Boshlang‘ich ma’lumotlarning so‘rovlari optimallashtirildi:
   lug‘at va statistikalar parallel yuklanadi; ulardan keyin bir-biridan
   mustaqil o‘rganish natijalari va Unit/to‘plamlar bir vaqtda yuklanadi.
   Ilgari V4 va V5 yuklanishi ketma-ket bo‘lgan.
2. Bir foydalanuvchining ayni paytdagi takroriy `loadCore()` so‘rovlari
   bitta aktiv so‘rovga birlashtirildi (*single-flight*).
3. Muvaffaqiyatli yuklangan ma’lumotlarning shu brauzer sahifasidagi
   nusxasiga 45 soniyalik TTL berildi. Bu **umumiy CDN keshi emas**:
   foydalanuvchilararo shaxsiy ma’lumot aralashmaydi.
4. Yangi so‘z yaratish, tahrirlash, o‘chirish, yodlash yakuni,
   mashg‘ulot/test yakuni va offline sinxronlashdan so‘ng kesh bekor qilinadi.
5. Lug‘at filtrlangan natijaning hammasini hisoblaydi, ammo ekranga
   bir vaqtda **50 ta qator** chiqaradi. Oldingi/Keyingi tugmalari
   va barcha so‘zlar soni saqlangan.
6. 2 daqiqadan ko‘p vaqt boshqa tabda bo‘lgandan keyin bosh sahifa,
   mashqlar tanlovi yoki lug‘atga qaytilsa, ma’lumot bir marta yangilanadi.
   Faol test yoki yodlash ekranini o‘rtada buzmaydi.
7. PWA service worker keshi 7.0.0 versiyasiga o‘tdi, yangi JavaScript
   va CSS fayllar offline dastur paketiga ham qo‘shildi.

## Nimaga tegilmadi

- Wordora 6.0 offline saqlash va navbat orqali sinxronlash.
- Supabase hisoblari, so‘zlar, mavjud Essential Unitlar va shaxsiy lug‘at.
- Yodlash algoritmi: bitta so‘zni tanishish + to‘rt usulda eslash.
- Testga kirish qoidalari, **90% mastery** mezoni va RLS.

**Yangi SQL migratsiya shart emas.** Cloudflare build komandasi
`npm run build`, chiqarish papkasi `dist` o‘zgarishsiz qoladi.

## Qo‘lda tezkor tekshirish

1. Cloudflare Pages → wordora → Deployments da yangi commit muvaffaqiyatli
   nashr etilganini tekshiring.
2. Saytni oching va biror Essential Unitni tanlang.
3. «Mening lug‘atim» → «Hammasi»ga kiring. So‘zlar 50 tadan,
   Oldingi/Keyingi orqali o‘tishi kerak. Qidirish Unit va turkum filtri
   umumiy natijani to‘g‘ri hisoblashda davom etishi kerak.
4. So‘z yodlang, mashq bajaring, test topshiring. Natijalar
   “Yodlanmoqda” va 90% test tartibida o‘tishini tekshiring.
5. «Offline uchun yuklash»ni bosing; internetni o‘chirib ilovani oching,
   mashq qiling; internet qaytganda navbat natijalarini tekshiring.
6. Boshqa foydalanuvchi bilan kirsangiz, avvalgi hisobning shaxsiy
   so‘zlari va natijalari ko‘rinmasligini tekshiring.

## Yuklama sinovi — alohida bosqich

Repozitoriyga ixtiyoriy `scripts/load-test.k6.js` qo‘shilgan.
U **faqat ommaviy statik fayllarni** sinaydi, Supabase’ga foydalanuvchi
hisoblaridan yuklama bermaydi. Bu sinov butun Wordora quvvatini
isbotlamaydi. k6 o‘rnatilgan kompyuterda:

```bash
k6 run -e BASE_URL=https://wordora.pages.dev scripts/load-test.k6.js
```

Dastlab 10 foydalanuvchi bilan, keyin 30 bilan ehtiyotkor sinang.
Natijada HTTP xatolari, median/p95 tezlik va server holatini kuzating.
Supabase’ning **Database Reports / Query Performance / Auth logs** bo‘limlarini
parallel tekshiring. Keyingi bosqichda haqiqiy test hisoblari bilan
alohida izolyatsiyalangan test muhitida 50 → 100 → 250 → 500 faol
foydalanuvchini sinash kerak. Production bazaga sun’iy test yozuvlarini
ko‘p miqdorda yubormang.

## Keyingi optimallashtirishlar

- Katta lug‘at uchun Unitga qarab so‘zlarni talab bo‘yicha yuklash,
  jadvaldagi public va shaxsiy ma’lumotni samaraliroq ajratish.
- Bazadagi haqiqiy query plan va indekslarni o‘lchab, keraklisini
  migratsiya orqali qo‘shish (hozircha indekslar ko‘r-ko‘rona yaratilmaydi).
- Offline review so‘rovlarini idempotent qilish (takroriy yuborishning
  ikki marta hisoblanish xavfini bartaraf etish).
- Kuzatuv/monitoring: p95 javob vaqti, error rate, Supabase Auth
  va PostgreSQL resurslari.
- Ommaviy ro‘yxatdan o‘tishdan avval emailni tasdiqlash va spamdan
  himoyalash mexanizmini qayta ko‘rib chiqish.
