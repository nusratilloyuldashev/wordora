# Wordora 7.9 — relizga tayyorgarlik

100, 250 va 500 virtual hisobni sinaydigan mahalliy Supabase ssenariylari bor. Ularning bir vaqtdagi faol oqim chegarasi mos ravishda 25, 40, 60. Bu 500 bir vaqtda ishlayotgan real foydalanuvchiga kafolat emas.

## Yangi tekshiruvlar

Mahalliy hisobot `scripts/release-gate.mjs` orqali baholanadi. Auth, RLS, RPC, 90% siyosati, yozuvlar yaxlitligi va har bir ssenariyning p95 davomiyligi tekshiriladi. Hisobot faqat mahalliy muhit uchun hisoblanadi.

GitHub Actions ichidagi `Wordora local Supabase Auth + REST 500 VU test` sinovi endi faqat qo‘lda ishga tushiriladi. Sinov production Supabase’ga ulanmaydi. Yakuniy ma'lumotlar GitHub Actions artifact sifatida saqlanadi.

## Ommaviy relizdan oldingi qolgan ishlar

Jonli Supabase RLS tekshiruvi, ikki haqiqiy hisob testi, zaxira va tiklash sinovi, 10–20 beta foydalanuvchi, hostdagi resurs limitlari va monitoring hali kerak. 7.9 dagi avtomatik testlar bularning o‘rnini bosmaydi.
