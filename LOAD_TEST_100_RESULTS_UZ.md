# Wordora — 100 foydalanuvchilik yuklama sinovi hisoboti

**Sinov vaqti:** 2026-10-31, UTC.
**Repo:** `nusratilloyuldashev/wordora`.
**Sinov kodi:** [commit 85f8486](https://github.com/nusratilloyuldashev/wordora/commit/85f848642e46dea0a3a587dccac01818f89223a8).
**Muhim:** bu hisobot **butun production tizimida 100 o‘quvchi bir vaqtda ishlashi isbotlandi** degani emas.

## 1. Haqiqiy Cloudflare — faqat statik fayllar

Manba: [GitHub Actions natijasi](https://github.com/nusratilloyuldashev/wordora/actions/runs/41233558062).
Manzil: `https://wordora.pages.dev`.
Ochiq so‘rovlar: `/`, `/manifest.webmanifest`, `/wordora-v7.js`, `/wordora-v7.css`.

| Virtual foydalanuvchilar | So‘rovlar | HTTP 200 | Xatolar | p50 (ms) | p95 (ms) | p99 (ms) |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 130 | 130 | 0 | 44 | 239 | 254 |
| 30 | 391 | 391 | 0 | 37 | 124 | 145 |
| **100** | **800** | **800** | **0** | **32** | **316** | **331** |

Har bosqichning belgilangan davomiyligi 20 soniya. 100 foydalanuvchilik
bosqichda har virtual foydalanuvchi taxminan 2.5 soniya tanaffus qilgan.
Bu production **Supabase Auth/PostgREST/SQL**ga so‘rov yubormadi.

## 2. Vaqtinchalik PostgreSQL — 100 virtual o‘quvchi ma’lumotlar amallari

Manba: [GitHub Actions natijasi](https://github.com/nusratilloyuldashev/wordora/actions/runs/41233558091).
Yangi, izolyatsiya qilingan PostgreSQL 16 konteyneriga haqiqiy
`setup.sql`, `upgrade_3_0.sql`, `upgrade_4_0.sql`,
`upgrade_5_0.sql` fayllari o‘rnatildi.

Test hajmi: 686 ta so‘z, 100 ta test hisobi (real Wordora hisoblari emas).

Har bir test hisobi uchun:
1. PostgreSQL `auth.uid()` konteksti o‘rnatildi (**GoTrue login emulyatsiyasi**).
2. RLS orqali lug‘at va `wordora_stats` o‘qildi.
3. Shaxsiy so‘z hamda Essential Unit yaratildi.
4. 20 ta so‘z Unitga biriktirildi; 5 ta so‘z yodlashga olindi.
5. `wordora_review` RPC orqali uchta mashq saqlandi.
6. Testning 95% balli bilan 5 ta so‘z `mastered` bo‘ldi.
7. 80% ball bilan `mastered` yozuvi bazada rad etilishi tekshirildi.
8. Qo‘shimcha ravishda 4 ta test hisobida begona foydalanuvchi yozuvlari
   ko‘rinmasligi tekshirildi.

| Ko‘rsatkich | O‘lchangan natija |
|---|---:|
| Bir vaqtdagi virtual o‘quvchilar | **100** |
| Jarayonni tugatgan hisoblar | **100** |
| Xatoga uchragan hisoblar | **0** |
| To‘liq SQL ssenariysi p50 | 1 651 ms |
| To‘liq SQL ssenariysi p95 | **1 795 ms** |
| To‘liq SQL ssenariysi p99 | 1 797 ms |
| Alohida `wordora_stats` p95 | 572 ms |
| Alohida so‘zlarni o‘qish p95 | 249 ms |
| RLS tekshirilgan test hisoblari | 0, 1, 50, 99 |

Natijalar GitHub Actions ishchi kompyuteridagi PostgreSQL konteyneri
uchun o‘lchangan. Real Supabase rejasi aynan shu resursga ega emas.

## 3. Qaysi qism hali tekshirilmagan?

- Hosted Supabase Auth (GoTrue): email/parol bilan haqiqiy login.
- Hosted Supabase PostgREST va Supabase loyihasining resurs limitlari.
- 100 ta bir vaqtdagi browser/PWA sessiyasi (render, test interaktivligi).
- Frontend → real Supabase → real natija saqlash to‘liq zanjiri.
- 10 daqiqa yoki undan ko‘proq davom etuvchi uzluksiz real mashg‘ulot.
- Haqiqiy production so‘zlar soni, foydalanuvchilar soni va resurs holati.

## 4. To‘g‘ri xulosa

**Tasdiqlandi:** real Cloudflare statik fayllarining 100 VU/800 so‘rov testi;
Wordora’ning SQL/RLS/RPC qoidalarining alohida PostgreSQL'da 100
bir-vaqtdagi sinov amallari. Ikkalasida 0 xato.

**Hali tasdiqlanmadi:** production Supabase + Auth + browser bilan
100 ta to‘liq faol o‘quvchi. Bunga aniq kafolat berish uchun
alohida Supabase staging loyihasida haqiqiy Auth/PostgREST testini
o‘tkazish va o‘sha loyiha resurslarini production tarif/resurslari
bilan taqqoslash kerak.

Production hisoblari va ma’lumotlariga sun’iy test yozuvlari qo‘shilmadi.

## 5. Keyingi to‘liq test uchun zarur shart

Alohida **Supabase staging** loyihasi, unda Wordora migratsiyalari,
sinov uchun 100 ta akkaunt va cheklangan yuklama ruxsatlari.
Production anon/publishable kaliti test muhitini yaratmaydi;
**service_role kalitini frontend yoki GitHub kodiga yozish qat’iyan mumkin emas**.

Staging sozlangach sinov: 10 → 30 → 50 → 100 virtual foydalanuvchi,
har birida real Auth login, Unit va so‘zlarni REST orqali olish,
mashq RPC, natija saqlash, 90% test va begona hisobga kirish imkonsizligi.
To‘liq testning pass mezoni: 0 ta ma’lumot yo‘qolishi, RLS buzilishi 0,
HTTP xatolar kam, p95 javob vaqti belgilangan SLO ichida.
