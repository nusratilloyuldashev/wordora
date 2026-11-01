# Wordora 7.6 — shaxsiy maqsad va xavfsizroq frontend

## Bitta paketdagi yangiliklar

1. **Kunlik maqsad:** 5/10/15/20/30/40 ta yangi so'zdan birini tanlash.
   Bosh sahifada bugun birinchi marta yodlash boshlangan so'zlar bo'yicha
   progress ko'rinadi. Takrorlashlar yangi so'z o'rniga hisoblanmaydi.
2. **Qayta test talab qiladigan so'zlar:** oxirgi saqlangan test natijasi
   90% dan past va hali \`mastered\` holatiga o'tmagan so'zlarning 5 tasi.
   Odatdagi takrorlash mashqini tez ochish imkoniyati.
3. **Xavfsizlik:** Cloudflare Pages \`_headers\` orqali iframe ichiga
   joylashtirishni cheklash, MIME sniffing va ayrim brauzer ruxsatlarini
   yopish. To'liq CSP hali o'rnatilmagan, chunki Supabase CDN va
   lug'at API integratsiyalarini alohida muvofiqlik sinovi talab qiladi.
4. **Tezlik:** yangi statistika mavjud \`state.words\` va
   \`V4.memory\` ma'lumotlari bo'yicha bir marta hisoblanadi; yangi
   Supabase o'qish yoki yozish so'rovi yuborilmaydi.

## Muhim chegaralar

- Kunlik maqsad qurilmadagi \`localStorage\` da **foydalanuvchi IDsi bilan
  ajratilgan holda** saqlanadi. Hozircha boshqa qurilmalarga sinxronlanmaydi.
- So'zlar, testlar, 90% mezoni, mavjud Unitlar va offline operatsiyalar
  o'zgartirilmaydi. Yangi SQL migratsiya **kerak emas**.
- Qiyin so'zlar ro'yxati oldingi testdagi saqlangan baholarga asoslanadi.
  Ular uchun alohida savollarni filtrlash hali qo'shilmagan; tugma
  mavjud umumiy takrorlash mashqini ochadi.
- Xavfsizlik HTTP sarlavhalari RLS, rate-limiting va Supabase sozlamalari
  tekshiruvining o'rnini bosmaydi.

## Tekshiruv

1. GitHub Actions'da \`npm test\` va \`npm run build:preview\` o'tishi.
2. \`dist/_headers\`, \`dist/wordora-v76.js\` va \`dist/wordora-v76.css\`
   fayllari tayyor ekanini tekshirish.
3. Main branch'ga faqat tekshiruvdan keyin bir marta merge qilish:
   Cloudflare Pages uchun keraksiz ko'p deploy qilmang.
4. Saytda \`Ctrl+Shift+R\`; v7.6 belgisini, maqsad sozlamasini,
   qayta test talab qiladigan ro'yxatni va eski 7 kunlik reja/Unit
   kartalarini tekshirish.
5. Ikki alohida foydalanuvchi bilan maqsad ajratilganini va oldingi
   offline mashqlar ishlashini tekshirish.

**Ma'lumotlar bazasiga migratsiya yoki ma'lumot o'chirish yo'q.**
