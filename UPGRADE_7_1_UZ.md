# Wordora 7.1 — Unit indekslari va ma'lumotlar bazasi diagnostikasi

## Nima yangilandi?

- `V5.items` uchun qurilma xotirasida ikkita tezkor indeks quriladi:
  `byWord` (so'z → qaysi Unitlar) va `byCollection` (Unit → so'zlar).
- Unitga biriktirilgan so'zni, Unitdagi so'zlar sonini va lug'atdagi Unit
  belgilarini hisoblashda har bir so'z uchun butun ro'yxat qayta qidirilmaydi.
- Indekslar har bir hisobda alohida tuziladi. Online hamda PWA offline
  saqlangan Unitlar yuklanganda qayta yaratiladi.
- Supabase uchun ma'lumotlarni o'zgartirmaydigan diagnostika SQL fayli
  qo'shildi: `supabase/performance_7_1_diagnostics.sql`.
- PWA kesh versiyasi 7.1.0 ga yangilandi.
- Yodlash, 90% test va offline sinxronlash qoidalariga tegilmadi.

## Supabase'da nima qilish kerak?

Hozircha **hech qanday migratsiya bajarish shart emas**.
Mavjud 3/4/5.0 SQL fayllarida `words.owner_id`, `word_learning.user_id`
va takrorlash sanalari, Unit bog'lanishlari uchun tegishli indekslar bor.

Istasangiz real ma'lumotlarni tekshirish uchun Supabase SQL Editor'da
`performance_7_1_diagnostics.sql` faylini ishga tushiring.
U faqat statistikani va indekslarni ko'rsatadi; mavjud so'zlar va
o'quvchilarning natijalarini o'zgartirmaydi.

`seq_scan` yuqori ko'rinishi har doim yomon emas; haqiqiy hajm
va sekin so'rovlarni ko'rib, keyin qaror qilinadi.

## Sinov

1. Cloudflare Pages'da `wordora` deployment muvaffaqiyatli bo'lsin.
2. Saytni yangilab, yuqorida `v7.1` chiqqanini tekshiring.
3. Mening lug'atim > Hammasi: 50 tadan sahifalash, +Unit, Unitdagi so'zlar
   soni va qidiruv ishlashini tekshiring.
4. Essential 1 Unitdan yodlashni davom ettiring; testdagi 90% mezon
   avvalgidek ishlasin.
5. Offline uchun yuklashni tekshiring, internetni uzib Unit tanlang,
   qayta ulang va sinxronlashni kuzating.
6. Boshqa hisobga o'tganda shaxsiy to'plamlar aralashmasin.

## Keyingi bosqich

Alohida test hisoblari bilan yuklama testi: avval 10/30, keyin 50/100.
Supabase Database Reports, Query Performance va Cloudflare Analytics
statistikalariga qarab yangi indeks, pullik tarif yoki backend
o'zgarishi kerakmi-yo'qmi hal qilinadi.

**Wordora 7.1 100+ bir vaqtdagi foydalanuvchiga kafolat bermaydi.**
Bunday natija faqat haqiqiy yuklama testi bilan tasdiqlanadi.
