# Wordora — 500 virtual o‘quvchi bilan Supabase Auth + REST + PostgreSQL sinovi

**Sana:** 2026-10-31 (UTC). **Status:** PASS — GitHub Actions barcha bosqichlari muvaffaqiyatli.

**Manba:** [GitHub Actions — muvaffaqiyatli yakunlangan sinov](https://github.com/nusratilloyuldashev/wordora/actions/runs/41236350348).

## Qanday muhit?

Rasmiy Supabase CLI GitHub Actions'da lokal Docker xizmatlarini ishga tushirdi:
- GoTrue Auth: haqiqiy parol bilan login va JWT token olish
- PostgREST: autentifikatsiyalangan REST so‘rovlari
- PostgreSQL: Wordora’ning asl SQL migratsiyalari, RLS, RPC va 90% mastery cheklovi

**Bu local ephemeral muhit, production Supabase loyihasi emas.**
Asosiy Wordora hisoblari yoki mavjud natijalariga tegilmadi.
Yangi Supabase Cloud loyihasi yaratilmadi, uning bepul limiti ishlatilmadi.

## Autentifikatsiyalangan o‘quvchi jarayonlari

Avval 500 ta vaqtinchalik **haqiqiy local Auth** akkaunti yaratildi.
600 ta sintetik lug‘at so‘zi qo‘shildi. Har bir test o‘quvchisi:
1. Email/parol bilan Auth login qilib, JWT oldi
2. JWT asosida lug‘at + progress va `wordora_stats` RPC'ni yukladi
3. Shaxsiy so‘z va Essential Unit yaratdi
4. Unitga 20 ta so‘z biriktirdi va REST orqali qayta o‘qidi
5. 5 ta so‘z yodlash yozuvini saqladi
6. 3 ta `wordora_review` RPC mashq natijasini yozdi
7. 95% test balli bilan 5 ta so‘zni `mastered` ga o‘tkazdi
8. Saqlangan natijani REST orqali qayta o‘qib tasdiqladi

Shuningdek, `90%` test cheklovi va boshqa akkaunt yozuvlariga
kirishning RLS orqali bloklanishi bosqichlar yakunida tekshirildi.

## O‘lchangan natijalar

| Virtual foydalanuvchilar | Eng ko‘p faol oqim | Tugatgan | Xato | Bir o‘quvchi jarayoni p50 | p95 | p99 | Bosqich davomiyligi |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 25 | 100 | 0 | 713 ms | **944 ms** | 1 097 ms | 3 650 ms |
| 250 | 40 | 250 | 0 | 740 ms | **1 311 ms** | 1 348 ms | 7 600 ms |
| **500** | **60** | **500** | **0** | **942 ms** | **2 295 ms** | **2 425 ms** | **14 606 ms** |

500 kishilik bosqichda alohida:
- **Auth login p95:** 1 162 ms
- **Lug‘at/progress yuklash p95:** 437 ms
- **Mashq RPC p95:** 58 ms

**Tushuntirish:** 500 virtual o‘quvchi testda qatnashgan, ammo
bir vaqtning o‘zida eng ko‘pi **60 faol o‘quvchi jarayoni** ishlagan.
Bu *500 ta parallel HTTP so‘rovi* yoki *500 parallel DB connection*
sinovidan farq qiladi.

## 100% saqlanish tekshiruvi

Bosqichlar 100 → 250 → 500 ko‘rinishida bajarilgan.
Oldingi hisoblar keyingi bosqichlarda ham qatnashgani sababli
jami 850 marta to‘liq o‘quvchi jarayoni bajarildi.

| Jadvaldagi ma’lumot | Kutilgan | Haqiqiy |
|---|---:|---:|
| Shaxsiy so‘zlar | 850 | **850** |
| Unitlar | 850 | **850** |
| Unit–so‘z bog‘lanishlari | 17 000 | **17 000** |
| Mashq natijalari (`reviews`) | 2 550 | **2 550** |
| Yodlash natijalari (`word_learning`) | 2 500 | **2 500** |

**Data integrity: PASS** — barcha yozuvlar soni to‘g‘ri.
**Auth + API flow: PASS** — har bir bosqichda 0 ta xato.
**RLS/90% test constraint: PASS** — testdagi tekshiruvlar muvaffaqiyatli.

## Chegaralar va real quvvat xulosasi

Bu testda haqiqiy lokal Supabase Auth + API bo‘lganligi sababli,
oddiy PostgreSQL-only testiga qaraganda to‘liqroq.

Lekin **production Supabase'da 500 nafar haqiqiy o‘quvchi bir vaqtda
bemalol ishlashi kafolatlanmaydi**:
- GitHub Actions runner resurslari Supabase Free resurslari bilan bir xil emas.
- Tashqi tarmoq, production xizmat kvotalari, real Auth rate limit
  konfiguratsiyasi, browser/UI/PWA rendering bu testga kirmagan.
- 60 ta maksimal faol jarayon bilan cheklangan yuklama qo‘llangan.
- 10–30 daqiqali uzluksiz 500 kishilik sinov o‘tkazilmagan.

Haqiqiy hosting quvvatini tasdiqlash uchun production bilan bir xil
resursga ega, alohida Supabase staging muhitida uzoqroq Auth+API testi kerak.

**Bajarilgan ish:** Wordora’ning Auth, API, SQL, RLS va 90% mastery
mantiqi lokal Supabase sharoitida 500 virtual o‘quvchi bilan
barqaror ishlagani, natijalarni to‘g‘ri saqlagani tasdiqlandi.

## Tekshiruv fayllari

- `scripts/wordora-local-supabase-500.mjs`
- `.github/workflows/wordora-supabase-local-500.yml`
- `supabase/config.toml`
- `LOCAL_SUPABASE_500_TEST_UZ.md`

Production Wordora manzili va ma’lumotlari o‘zgartirilmadi.
