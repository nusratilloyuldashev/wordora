# Wordora 8.0 — ommaviy relizga ruxsat berish hisoboti
**Audit sanasi:** 2026-11-01  
**Asosiy tarmoq:** Wordora 7.9.0 (`main`)  
**Holat:** **NO-GO ommaviy reliz**; nazoratli beta uchun tayyorgarlik davom etadi.

## 1. Tasdiqlangan natijalar

- 7.9 versiyaning GitHub CI tekshiruvlari: **95/95 test muvaffaqiyatli**, preview build muvaffaqiyatli.
  Dalil: https://github.com/nusratilloyuldashev/wordora/actions/runs/41310041472
- Mahalliy va alohida Supabase Auth, REST, PostgreSQL, RLS, RPC yuklama sinovi **2026-11-01** sanasida
  muvaffaqiyatli tugagan. Dalil:
  https://github.com/nusratilloyuldashev/wordora/actions/runs/41279055544
- O‘sha mahalliy sinovda 100/250/500 virtual hisoblar uchun oqimlar:
  
  | Virtual hisoblar | Bir paytda faol oqimlar | Bajarildi | Xatolar | To‘liq oqim p95 |
  |---:|---:|---:|---:|---:|
  | 100 | 25 | 100 | 0 | 1323 ms |
  | 250 | 40 | 250 | 0 | 2107 ms |
  | 500 | 60 | 500 | 0 | 2976 ms |

- Mahalliy bazadagi yakuniy yozuvlar yaxlitligi: **PASS**.
  Kutilgan va qayd etilgan qiymatlar:
  `personalWords=850`, `units=850`, `learning=2500`,
  `reviews=2550`, `unitItems=17000`.
- Testda har bir hisobga tegishli ma’lumotlarni ajratish bo‘yicha RLS
  tekshiruvlari ham o‘tdi. Bu **mahalliy test bazasi** uchun dalil.

## 2. Test nimani isbotlamaydi?

- 500 **virtual hisob** bir paytda 500 **faol foydalanuvchi** degani emas;
  tekshirilgan eng yuqori faol ish oqimi **60**.
- Ishlab turgan Supabase rejasining kvotasi, API cheklovlari,
  tarmoq kechikishi, Cloudflare live deployment va foydalanuvchilarning
  haqiqiy brauzer/smartfon ishlashi **shu sinovga kirmagan**.
- Natijalar bir sinov ishga tushirilishidan olingan; uzoq davomli
  stress/soak test va xavfli holatlardan tiklash sinovi emas.

## 3. Ommaviy relizga to‘sqinlik qilayotgan shartlar

- [ ] **LIVE-RLS:** haqiqiy Wordora Supabase loyihasida
      `supabase/security_audit_7_7.sql` ni o‘qish rejimida bajarish;
      ikki mustaqil sinov akkaunti yordamida boshqa odamning
      shaxsiy so‘zlari, Unitlari va progressiga kirish urinishlarini
      rad etish.
- [ ] **BACKUP/RESTORE:** zaxira nusxa yaratish mavjudligini
      tarifga mos tekshirish; alohida sinov loyihasiga tiklash,
      yozuvlar va kirishni solishtirish.
- [ ] **LIVE-PWA:** Wordora sahifasida 7.9 versiya yuklanganini,
      offline qaydlar va qayta sinxronlashni kamida ikki haqiqiy
      qurilmada tekshirish.
- [ ] **BETA:** 10–20 nafar ixtiyoriy foydalanuvchi bilan
      real ro‘yxatdan o‘tish, Unit, so‘z yodlash, mashq va test
      jarayonlarini baholash. Og‘ir yuklama sinovini ularning
      real hisoblari yoki production bazasiga yo‘naltirmaslik.
- [ ] **LIMITS/MONITORING:** Supabase Auth/database va Cloudflare
      limitlari, kuzatuv, xatoliklarning ko‘rinishi, rollback
      va javobgar shaxs rejasi tayyor bo‘lishi.
- [ ] **MASTERED-TRUST:** foydalanuvchi yuboradigan test natijasining
      serverda ishonchli tekshirilishi masalasi alohida baholanishi.
      Hozirgi 90% CHECK faqat yuborilgan ball va holatning
      mosligini tekshiradi; javoblarning o‘zi serverda
      mustaqil tasdiqlanmaydi. Shuning uchun hozir natijalar
      sertifikat sifatida emas, shaxsiy o‘quv ko‘rsatkichi.

## 4. Ruxsat berish mezoni

Beta uchun: kritik login/data-loss/RLS xatosi bo‘lmasligi va
shaxsiy test ma’lumotlarining saqlanishini amalda tekshirish.

Ommaviy 8.0 uchun: yuqoridagi barcha bloklovchi punktlar
tasdiqlangan dalil bilan yopilgan bo‘lishi kerak.
Biror sinov muvaffaqiyatsiz tugasa, release **NO-GO** qoladi.

## 5. Talab qilinmaydigan amallar

- Ushbu hisobot hech qanday SQL migratsiyasi yoki production
  foydalanuvchi ma’lumotlarini o‘zgartirmaydi.
- Cloudflare deploy uchun faqat hujjatli commitlar kerak bo‘lmasa
  kod versiyasini 8.0 ga majburan oshirmaslik kerak.
- To‘liq 500 parallel production foydalanuvchini kafolatlaydigan
  dalil qo‘lga kirmaguncha bunday va’da berilmasin.
