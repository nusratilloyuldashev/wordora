# Wordora 7.3 — Natijalarni xavfsiz saqlash va takroriy yozuvni bloklash

## O‘zgargan joylar

- Har bir mashq natijasiga **kriptografik tasodifiy UUID** biriktiriladi.
- Foydalanuvchi online bo‘lsa ham, mashq natijasi avval **IndexedDB outbox**ga
  mustahkam saqlanadi, so‘ng serverga yuboriladi.
- Server tasdiqlagandan keyingina navbatdagi yozuv o‘chiriladi.
- Internet javobi uzilib qolsa, keyingi sinxronlashda **o‘sha UUID**
  bilan yuboriladi; yangi mashq kabi hisoblanmaydi.
- Offline oldingi versiyalarda yig‘ilgan navbat yozuvlariga ham bir marta
  UUID beriladi va **so‘rovdan oldin** saqlab qo‘yiladi.
- Supabase `wordora_review_v2` bitta foydalanuvchi+UUID ni faqat
  **bir marta** qabul qiladi; bir xil UUID va mazmun bilan qayta yuborish
  eski natijani qaytaradi, statistika va `reviews`ga yana yozmaydi.
- Bir xil UUID bilan **boshqa** so‘z, mashq turi yoki sifat balli yuborilsa,
  xavfsizlik uchun xato qaytariladi.
- O‘quvchi mavjud so‘zlari, Unitlari, test va yodlash tarixi
  o‘chirilmaydi. 90% test chegarasi o‘zgarmadi.

## 1 ta majburiy Supabase qadam (v2 himoyasini yoqish uchun)

**Faqat asli Wordora Supabase loyihasida**:
1. [Supabase Dashboard](https://supabase.com/dashboard) → Wordora → SQL Editor.
2. [`supabase/upgrade_7_3.sql`](https://github.com/nusratilloyuldashev/wordora/blob/main/supabase/upgrade_7_3.sql)
   faylining to‘liq kodini yangi queryga qo‘ying va **Run** bosing.
3. `Success. No rows returned.` chiqishi kerak.
4. Wordora saytini `Ctrl+Shift+R` bilan yangilang va bitta mashq qiling.
5. F12 → Console da quyidagini tekshiring:
   `await window.WordoraDiagnostics.status()`
   Natijadagi `reviewProtocol` **idempotent-v2** bo‘lishi kerak.

**SQL bajarilmaguncha** sayt eski `wordora_review` ga qaytadi,
unda ehtimoliy takroriy yuborish muammosi saqlanadi.
Bu holat dasturda `legacy-migration-required` deb ko‘rsatiladi.
Shuning uchun **faqat GitHub deploy bilan** yangi himoya aktiv bo‘lmaydi.

Migration `CREATE TABLE IF NOT EXISTS` va yangi funksiyadan iborat.
Eski jadvallarni o‘chirmaydi, o‘zgartirmaydi va eski RPC'ni olib tashlamaydi.
Takror bajarish hozirgi ma’lumotlarni o‘chirmaydi.

## Vaqtinchalik GitHub Actions integratsiya sinovi

`.github/workflows/wordora-supabase-local-500.yml` Wordora 7.3 SQL'ini
**alohida lokal** Supabase loyihasiga qo‘llaydi. 100 → 250 → 500
o‘quvchi login, mashq va test oqimida yangilangan RPC'ni ishlatadi.
Har o‘quvchining birinchi mashqi ataylab qayta yuboriladi;
`deduplicated=true` natijasi va jami `reviews` yozuvlari soni
tekshiriladi. Bir xil UUID bilan boshqa sifat ballini yuborish ham rad
qilinishi kerak. Production bazaga test yozuvlari yuborilmaydi.

## Monitoring

Brauzer konsolida:
`await window.WordoraDiagnostics.status()`

Natijada faqat ushbu brauzerning so‘nggi yuklash ko‘rsatkichlari,
jo‘natilmagan navbat soni va v2 faol yoki eskiligi ko‘rsatiladi.
Tashqi analitika xizmati, maxfiy foydalanuvchi identifikatori yoki token
yuborilmaydi.

## Nimalar hali 100% kafolatlanmaydi?

- Brauzer IndexedDB ma’lumotlarini foydalanuvchi o‘chirsa yoki qurilma
  butunlay ishdan chiqsa, faqat lokal saqlangan natijalar yo‘qolishi mumkin.
- Eski mijozlar `wordora_review` RPC orqali UUIDsiz yuborsa,
  ular v2 himoyasidan foydalanmaydi.
- Offline **test** va `word_learning` yozuvlari hozirgi upsert bilan
  sinxronlanadi. Bu o‘zgarish aynan mashq natijasining ikki marta
  hisoblanmasligiga qaratilgan; boshqa qurilmadan bir vaqtda
  kiritiladigan eski/yangi testlar konflikti alohida muammo.
- Production Supabase'dagi 500 nafar to‘liq faol o‘quvchi uchun oldingi
  staging/yuklama cheklovlari saqlanadi.

## Keyingi versiya

Wordora 7.4 uchun: test natijalarini konfliktlarga chidamli yozish,
foydalanuvchiga oxirgi sinxronlangan vaqtni ko‘rsatish,
Supabase p95/error rate monitoringi va kuzatilgan real yuklama.
