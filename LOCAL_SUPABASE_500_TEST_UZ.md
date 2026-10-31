# Wordora — 500 virtual o‘quvchi bilan LOCAL Supabase Auth + API sinovi

## Arxitektura

GitHub Actions har safar vaqtinchalik Supabase CLI stack yaratadi:
- **Supabase Auth (GoTrue)**: haqiqiy email/parol login va access_token/JWT.
- **Supabase REST (PostgREST)**: haqiqiy JWT bilan Wordora so‘rovlariga javob.
- **PostgreSQL**: Wordora ning `setup.sql`, `upgrade_3_0.sql`,
  `upgrade_4_0.sql`, `upgrade_5_0.sql` asl migratsiyalari.

Cloud Supabase’dagi asosiy loyiha bilan **hech qanday ulanish qilinmaydi**.
Foydalanuvchi ma’lumotlariga tegilmaydi. CLI stack ish tugagach to‘xtatiladi.

## Sinov rejasi

500 ta *vaqtinchalik* local Auth hisobi yaratiladi. 600 ta sintetik so‘z
tayyorlanadi. Ssenariy 3 marta amalga oshiriladi:
- 100 virtual o‘quvchi: ko‘pi bilan 25 faol foydalanuvchi oqimi
- 250 virtual o‘quvchi: ko‘pi bilan 40 faol foydalanuvchi oqimi
- 500 virtual o‘quvchi: ko‘pi bilan 60 faol foydalanuvchi oqimi

**Muhim:** 500 virtual o‘quvchi degani 500 ta bir paytdagi
HTTP so‘rovi yoki DB connection degani emas. Test izchil, kontrolli
ulanishlar bilan o‘tkaziladi.

Har bir hisob: haqiqiy email/parol Auth login → lug‘at/progressni
yuklash → statistika RPC → shaxsiy so‘z yaratish → Unit yaratish
→ 20 so‘zni Unitga biriktirish va qayta o‘qish → 5 ta so‘zni o‘rganish
→ 3 ta mashq RPC → 95% test orqali mastered qilish → natijani bazadan
qayta o‘qish. 90% test chegarasi va foydalanuvchilararo RLS ham tekshiriladi.

Test yakunida xizmat kaliti faqat vaqtinchalik runnerda ishlatiladi va
barcha yozuvlar soni tekshiriladi.

## Ishga tushirish

`Actions → Wordora local Supabase Auth + REST 500 VU test`.
Workflow fayli yangilanganda avtomatik boshlanadi.

Live test hisoboti GitHub Actions logida
`WORDORA_LOCAL_SUPABASE_STAGE_BEGIN` va
`WORDORA_LOCAL_SUPABASE_FINAL_BEGIN` bloklarida chiqariladi.

## Chegaralar

Bu test lokal Supabase Auth va PostgREST zanjirini, Wordora’ning haqiqiy
PostgreSQL strukturasini tekshiradi. **Supabase hosted Free/Pro rejasi,
hosting resurslari, tashqi Internet tarmog‘i, 500 mobil brauzer/PWA
sessiyasi va foydalanuvchining ekran tezligi bu testdan olinmaydi.**

Asosiy Wordora 500 o‘quvchiga kafolat berishi uchun production
bilan bir xil reja va resurslarga ega **alohida staging Supabase**
muhitida ham test kerak bo‘ladi.
