# Wordora 7.7 — xavfsizlik va offline ma'lumot ishonchliligi

## Bajarilgan yangilanishlar
1. Eski hisobning kechikkan API natijalari yangi hisobning IndexedDB
   nusxasiga yozilib qolishidan himoya. So'rov boshlangandagi hisob IDsi
   saqlanadi va saqlash/qaytarishdan oldin qayta tekshiriladi.
2. \`word_learning\` va Unit yuklashida hisob o'zgargan bo'lsa, kechikkan
   natija xotiraga qo'llanmaydi.
3. **Offline nusxalarni tozalash**: faqat joriy hisobning mahalliy nusxalari.
   Yuborilmagan mashq/test bo'lsa, butun operatsiya bekor qilinadi.
   Supabase serverdagi so'z va natijalar o'zgarmaydi.
4. Tarmoq aloqasi qayta tiklanib, server foydalanuvchini tasdiqlagan
   holatda navbat bo'sh bo'lsa ham offline xato bayrog'i tozalanadi.
5. CSP \`object-src 'none'\`, \`base-uri 'self'\`, \`form-action 'self'\`
   bilan kuchaytirildi (mavjud xizmatlar bloklanmaydi).
6. \`supabase/security_audit_7_7.sql\` faqat o'qiydigan hisobot.
   Migratsiya va ma'lumotlar bazasini qayta yaratish kerak emas.

## Jonli Supabase tekshiruvi — relizdan keyingi qo'lda bajariladigan ish
Supabase Dashboard > SQL Editor bo'limida
\`supabase/security_audit_7_7.sql\` ni oching va ishga tushiring.
Bu skript faqat katalog va ruxsat ma'lumotlarini o'qiydi.
Natijalarni tekshiring:
- \`rls_enabled = true\` barcha mavjud tegishli jadvallar uchun.
- \`anon_can_select/insert/update/delete = false\`.
- \`wordora_review_v2\`, \`wordora_save_exam_v74\` da
  \`anon_can_execute = false\` va qat'iy \`search_path\`.
- \`wordora_test_mastery_gate\` cheklovi mavjud.

Muhim: mavjud \`word_learning\` jadvalida authenticated to'g'ridan
INSERT/UPDATE imtiyozlari bor; brauzer o'z test ballini yuborishi mumkin.
Shu sabab 90% qoidasi mustaqil sertifikat uchun himoyalangan imtihon
emas. Keyingi xavfsizlik ishida server-side validatsiyani kuchaytirish kerak.

## Shaxsiy ma'lumotlarni tozalash
Wordora'ga kiring > yuqoridagi offline panel > "Offline nusxalarni
tozalash" > tasdiqlang. Yuborilmagan natija bo'lsa, avval sinxronlang.
Tugallanmagan lokal mashg'ulot ham o'chadi; serverdagi o'quv
tarixi qoladi. Umumiy kompyuterda so'ngra hisobdan ham chiqing.
Bu tugma Supabase sessiyasi yoki boshqa qurilmalardagi ma'lumotlarni
o'chirmaydi.

## Zaxira va tiklash
Supabase hostingdagi avtomatik backup mavjudligini billing/backup
sozlamalaridan tekshiring: rejangizda avtomatik backup bo'lmasligi mumkin.
Ma'lumotlar uchun nazoratli zaxira oling, uni shifrlangan holda saqlang
va TIKLASHNI AVVAL alohida sinov loyihasida tekshiring.
\`pg_dump\` uchun parollarni GitHub'ga yozmang.
Bu reliz ishlab turgan Supabase ma'lumotlar bazasida backup
olganini yoki tiklash sinovini o'tkazganini da'vo qilmaydi.

## CI, foydalanishga chiqarish
\`npm test\`, \`npm run build:preview\` va \`dist/_headers\`
tekshiruvi CI'da o'tishi shart. Barcha o'zgarishlar bitta PR orqali
\`main\` ga bir marta chiqariladi, Cloudflare deploy limitini tejaydi.
Telefon va ikki haqiqiy hisob bilan qo'lda sinov 8.0 relizidan oldin shart.
