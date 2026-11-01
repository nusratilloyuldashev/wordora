# Wordora 7.8 — qulay Unit paneli va mobil foydalanish

## Qo‘shilgan imkoniyatlar
- "Mening lug‘atim"da har bir Unit uchun yangi/yodlanayotgan/yodlangan/
  bugun takrorlash kerak bo‘lgan so‘zlar hisoblagichi.
- Unitdan to‘g‘ridan-to‘g‘ri **So‘zlarni ko‘rish**, **Yodlash**, **Mashq**
  va **Test** bo‘limlariga o‘tish.
- Yodlashda Unit tanlanganda oldingi mavzu/turkum filtrlari tozalanadi.
- Mobil ekranda yirikroq tugmalar, ekran o‘lchamiga mos kartalar,
  aniq klaviatura fokus ko‘rinishi, kamaytirilgan harakatni qo‘llab-quvvatlash.
- 8 tadan ortiq Unit mavjud bo‘lsa dastlab sakkiztasi ko‘rinadi;
  barcha Unitlarni bir tugma bilan ko‘rsatish mumkin.

## Chegaralar va xavfsizlik
- Faqat avval yuklangan \`state.words\`, \`V4.memory\`, \`V5.collections\`,
  \`V5.itemIndex\` ma’lumotlari ishlatiladi; yangi Supabase so‘rovi yo‘q.
- Mashq va test faqat oldin o‘rganilgan so‘zlar uchun faollashadi.
- 90% test qoidasi, offline navbat va foydalanuvchi natijalari o‘zgarmaydi.
- SQL migratsiyasi yoki ma’lumot ko‘chirish talab qilinmaydi.
- UI ishlashi haqiqiy foydalanuvchilar bilan alohida sinovdan o‘tishi kerak.

## Tekshiruv
1. \`npm test\` va \`npm run build:preview\` muvaffaqiyatli.
2. \`dist/wordora-v78.js\`, \`dist/wordora-v78.css\` mavjud.
3. Mobil telefonda Unit tanlang, Yodlashni oching va orqaga qayting.
4. Mashq va Test aynan tanlangan Unit bo‘yicha ishlashini tekshiring.
5. Profil almashtirilganda barcha eski natijalar boshqa hisobga o‘tmasin.
6. Offline mashqlar saqlanishi va keyin sinxronlash tekshirilsin.

**7.8 — beta foydalanish uchun nomzod.** Ommaviy ishga tushirishdan
oldin real Supabase RLS auditi va 7.9 yuklama/barqarorlik testlari kerak.
