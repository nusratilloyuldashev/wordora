# Wordora: 100 virtual foydalanuvchi bilan yuklama testi

## Nima uchun ikkita alohida sinov?

**A. Haqiqiy Cloudflare Pages uchun ommaviy statik yuklama**
- `scripts/wordora-smoke-load.mjs` haqiqiy `https://wordora.pages.dev`
  saytining bosh sahifasi, manifest, JavaScript va CSS fayllarini so'raydi.
- Ketma-ket 10, 30 va 100 virtual foydalanuvchi, har biri 20 soniyadan.
- Bu sinovda **Supabase login va mashqlar bajarilmaydi**.
- Hisobot `WORDORA_LOAD_REPORT_BEGIN` orasida GitHub Actions logida chiqadi.

**B. Izolyatsiya qilingan Wordora SQL/RLS/RPC bazasi uchun 100 foydalanuvchi**
- `scripts/wordora-db-100-vus.mjs` Github Actions'ning vaqtinchalik,
  faqat ichki `127.0.0.1` manzilidagi PostgreSQL xizmatida ishlaydi.
- `supabase/setup.sql` va `upgrade_3_0.sql`, `upgrade_4_0.sql`,
  `upgrade_5_0.sql` asl migratsiyalarini ishga tushiradi.
- 600 ta sun'iy so'z va 100 ta **faqat test uchun yaratilgan** hisob.
- Har bir foydalanuvchi bir vaqtda quyidagilarni bajaradi:
  hisob identifikatsiyasi (auth.uid ni testda emulyatsiya qilish),
  lug'atni ko'rish, statistika RPC, shaxsiy so'z yaratish,
  Unit yaratish, 20 so'z biriktirish, 5 ta so'zni yodlash,
  uchta mashq natijasini RPC bilan saqlash, 95% test orqali 5 ta
  so'zni yodlangan qilish va 90% chegarani tekshirish.
- 4 ta alohida test hisobida boshqa foydalanuvchilarning shaxsiy
  so'zlari, Unitlari, mashqlari ko'rinmasligi tekshiriladi.
- Hisobot `WORDORA_DB_100_REPORT_BEGIN` orasida chiqadi.

## Chegaralar (muhim)

B sinovida haqiqiy Supabase Auth (GoTrue), PostgREST, Cloudflare
frontend, brauzer PWA va tashqi Supabase tarmog'i tekshirilmaydi:
**PostgreSQL'da Supabase JWT konteksti emulyatsiya qilinadi**.

Shuning uchun ikkala test muvaffaqiyatli bo'lsa ham,
**100 ta odam real Wordora'da bir vaqtda barcha amallarni bajara oladi**
degan kafolat bermaydi. To'liq kafolat uchun alohida Supabase staging
loyihasi, autentifikatsiyalangan test akkauntlari va yuklama testlari
hamda Supabase real resurslari ustida monitoring zarur.

## Qanday ishga tushadi?

Ikkita GitHub workflow:
- `.github/workflows/wordora-smoke-load.yml`
- `.github/workflows/wordora-db-100.yml`

Workflowlar faqat tegishli workflow fayli o'zgarganda yoki GitHub Actions
ichida qo'lda ishga tushirilganda bajariladi. Prod Supabase'ga
sun'iy yozuvlar yuborilmaydi. GitHub Actions limiti sarflanishi mumkin.

## Natijalarni qanday talqin qilish kerak?

- `failedRequests` 0, `HTTP 200` va `p95` past:
  **statik fayllar** yuklamaga chidagan.
- `failedUsers` 0 va `RLSIsolationAccounts` to'liq:
  **izolyatsiya qilingan PostgreSQL** yuz o'quvchining SQL
  amallarini muvaffaqiyatli bajargan.
- Natijalar faqat sinov o'tkazilgan qurilma va sharoitga tegishli.
  Haqiqiy Supabase Free rejimining trafik, ulanish, hisob va
  resurs cheklovlari boshqacha bo'lishi mumkin.

Mavjud Essential Unitlar, production auth akkauntlari, yodlash
natijalari va haqiqiy Wordora foydalanuvchilari o'zgartirilmaydi.
