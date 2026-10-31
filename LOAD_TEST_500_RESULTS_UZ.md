# Wordora — 500 virtual foydalanuvchilik yuklama testi (2026-10-31)

## Qisqa xulosa

**Ikkita yuklama sinovi ham muvaffaqiyatli tugadi:**

1. **Haqiqiy Cloudflare Pages statik fayllari:** 100 → 250 → 500 virtual foydalanuvchi. 500 VU bosqichida 2 000 ta HTTP 200 va 0 ta xato.
2. **Izolyatsiyalangan PostgreSQL 16 bazasi:** 500 ta virtual o‘quvchining SQL/RLS/RPC jarayoni, 60 ta baza ulanishli pool. 500/500 tugadi; 0 xato; barcha natijalar saqlandi.

**Bu hali Wordora'ning haqiqiy Supabase Auth, PostgREST va brauzer orqali 500 ta odam bilan to‘liq ishlashini tasdiqlamaydi.** Ikkala alohida sinov turli muhitlarni sinaydi.

## 1. Haqiqiy Cloudflare statik fayllari

[GitHub Actions — tekshirilgan jonli log](https://github.com/nusratilloyuldashev/wordora/actions/runs/41234402097)

Sinov manzili: `https://wordora.pages.dev`

Yuborilgan URL: `/`, `/manifest.webmanifest`, `/wordora-v7.js`, `/wordora-v7.css`.

Har bosqich **20 soniya**, virtual foydalanuvchilar so‘rovlar orasida tanaffus qiladi.
Bu o‘quvchi akkauntiga kirmaydi, test topshirmaydi va Supabase’ga yozmaydi.

| Foydalanuvchilar | So‘rovlar | HTTP 200 | Xatolar | p50 | p95 | p99 |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 700 | 700 | 0 | 30 ms | 544 ms | 559 ms |
| 250 | 1 250 | 1 250 | 0 | 301 ms | 1 256 ms | 1 314 ms |
| **500** | **2 000** | **2 000** | **0** | **583 ms** | **2 472 ms** | **2 530 ms** |

**Jami: 3 950 ta statik so‘rov, 0 xato.**

Diqqat: 500 VU da p95 **2 472 ms** — boshlang‘ich 2 500 ms
chegaraga juda yaqin. p99 **2 530 ms** bu chegaradan oshgan.
Sinovda uzilish kuzatilmadi, lekin 250 → 500 da yuqori foizli
javob vaqtlari sezilarli oshdi. Bu signalni real foydalanuvchi
tajribasi va kengroq monitoring orqali tekshirish zarur.

## 2. Izolyatsiya qilingan PostgreSQL — 500 virtual o‘quvchi

[GitHub Actions — SQL/RLS/RPC sinovining jonli logi](https://github.com/nusratilloyuldashev/wordora/actions/runs/41234402110)

Muhit: GitHub Actions ishchisidagi vaqtinchalik PostgreSQL 16.
Wordora’ning asl SQL migratsiyalari `setup.sql` va `upgrade_3/4/5_0.sql`
ishlatilgan. `auth.uid()` uchun login konteksti emulyatsiya qilingan.

**500 ta virtual o‘quvchi bir paytda boshlagan**, ammo bitta GitHub
ishchisi ularga **60 ta faol PostgreSQL ulanishi** ajratgan.
Shu sabab **500 ta bir vaqtdagi DB ulanishi** deb talqin qilinmasin.

Har bir hisob:
- Foydalanuvchi identifikatsiyasi va RLS orqali lug‘at ko‘rish
- `wordora_stats` RPC
- Shaxsiy so‘z va Unit yaratish, 20 ta so‘zni Unitga qo‘shish
- 5 ta so‘zni yodlashga olish
- `wordora_review` RPC orqali 3 ta mashqni saqlash
- 95% test natijasini saqlash va 90% gate ishlashini tekshirish
- 6 ta namuna hisobda boshqa foydalanuvchilarning shaxsiy natijalari ko‘rinmasligini tekshirish

| Ko‘rsatkich | Natija |
|---|---:|
| Virtual foydalanuvchilar | **500** |
| Tugatgan hisoblar | **500** |
| Xatolar | **0** |
| Faol baza ulanishlari chegarasi | 60 |
| To‘liq SQL mashg‘ulot p50 | 2 678 ms |
| To‘liq SQL mashg‘ulot p95 | **4 065 ms** |
| To‘liq SQL mashg‘ulot p99 | 4 085 ms |
| Lug‘atni o‘qish p95 | 149 ms |
| Statistika RPC p95 | 171 ms |
| Mashqni yozish RPC p95 | 67 ms |

**Barcha test yozuvlari saqlangani tasdiqlandi:**
- 500 ta shaxsiy so‘z
- 500 ta Unit
- 2 500 ta o‘rganish (learning) yozuvi
- 1 500 ta mashq (reviews) yozuvi
- 10 000 ta Unit–so‘z bog‘lanishi

## 3. Muhim cheklov va keyingi qaror

**Isbotlangan:** haqiqiy Cloudflare'ning ommaviy fayllari 500 VU bilan
2 000 ta so‘rovga xatosiz javob qaytardi; alohida PostgreSQL
muhiti esa 500 virtual o‘quvchining SQL ssenariylarini 0 xato bilan
yakunladi.

**Isbotlanmagan:**
- Haqiqiy Supabase Auth'da 500 ta bir vaqtdagi email/parol login
- Hosted Supabase PostgREST va production PostgreSQL resurslari
- Frontend + haqiqiy Supabase'ning end-to-end yodlash, test va sinxronlash jarayoni
- 500 ta haqiqiy brauzer/PWA hamda mobil qurilmadagi ko‘rsatish tezligi
- Uzoq davom etuvchi (10–30 daqiqalik) mashg‘ulot va ko‘plab takroriy loginlar

**Tavsiya:** 500 kishi bilan real sinf/auditoriya sinovidan oldin
alohida Supabase staging loyihasini yaratish, real Auth/PostgREST
sinovini va resurs monitoringini o‘tkazish. Ochiq statik fayllardagi
p95 2.47 s ko‘rsatkichini ham qo‘shimcha optimallashtirish mumkin.

Production foydalanuvchilari, Unitlari va natijalariga test yozuvlari
qo‘shilmagan. GitHub Actions resurslari ishlatilgan.

**Sinov kodining GitHub commit:** [2537447](https://github.com/nusratilloyuldashev/wordora/commit/25374472ddc0f95014103893f4169796b251d8bd).
