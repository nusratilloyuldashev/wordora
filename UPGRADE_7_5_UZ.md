# Wordora 7.5 — o‘quvchilar uchun 7 kunlik reja va Unit natijalari

## Nimalar o‘zgardi?

Bosh sahifaga ikkita yangi o‘quvchi imkoniyati qo‘shildi:

1. **Keyingi 7 kun** — yodlangan/yodlanayotgan so‘zlarning mavjud
   `word_learning.next_review_on` sanalaridan hisoblanadigan jadval.
   Bugun, ertaga va keyingi 5 kun uchun takrorlashlar sonini ko‘rsatadi.
   O‘tib ketgan sanalar «Bugun» ustuniga qo‘shiladi va alohida belgilanadi.
   «Bugungi so‘zlarni takrorlash» tugmasi mavjud amaldagi mashqni ochadi.
2. **O‘rganish xaritasi** — Unit yoki shaxsiy to‘plam bo‘yicha
   yangi / yodlanmoqda / yodlangan so‘zlar hisoblanadi.
   Unitning yodlangan foizi faqat `stage='mastered'` bilan aniqlanadi.
   Bitta Unit kartasi bosilsa, «Mening lug‘atim» bo‘limida aynan
   o‘sha Unit ko‘rinadi, eski qidiruv/filtrlar tozalanadi.

## Ma’lumotlar

Barcha hisoblar **brauzerda allaqachon yuklangan** ma’lumotlardan olinadi:
- `state.words`
- `V4.memory` (word_learning)
- `V5.collections` / `V5.itemIndex`

Yangi SQL, alohida server yoki Supabase so‘rovlari **qo‘shilmadi**.
Cloudflare Pages + Supabase + Wordora 7.4 offline arxitekturasi saqlandi.

7 kunlik reja faqat mavjud `next_review_on` sanalariga asoslanadi;
bu foydalanuvchining kelajakdagi haqiqiy mashq bajarishini bashorat
qilmaydi. Unitdagi so‘z yodlangan deb faqat ilgari 90% test mezoni
bo‘yicha `mastered` ga o‘tgan bo‘lsa hisoblanadi.

## Qanday tekshiramiz?

1. Cloudflare Pages'da so‘nggi `main` deployment muvaffaqiyatli bo‘lsin.
2. Saytni `Ctrl+Shift+R` bilan yangilang va `v7.5` belgisini tekshiring.
3. «Bosh sahifa»da «Keyingi 7 kun» jadvalini oching.
4. «O‘rganish xaritasi»dan bitta Unitni tanlang.
5. «Mening lug‘atim» sahifasida faqat tanlangan Unitdagi so‘zlar
   ko‘rsatilishini va oldingi 50 tadan sahifalash ishlashini tekshiring.
6. Test natijalari va 90% yodlash mezoni 7.4 dagidek ishlasin.
7. Internet uzib qo‘yilganda eski offline mashqlar davom etishini
   tekshiring. Yangi 7.5 dashboard serverga mustaqil so‘rov yubormaydi.

## GitHub Actions

`.github/workflows/wordora-ui-75.yml` barcha JavaScript testlarini
va preview buildni tekshiradi. `npm run build:preview` ishlab chiqarish
Supabase kalitlarini talab qilmaydi, asosiy bazaga ulana olmaydi.

## Kelajakdagi ishlar

- Unitlarda o‘quvchi qaysi mashq turlarida qiynalayotganini aniqlash
  (buni aniq o‘lchash uchun per-word mashq statistikasi kerak bo‘ladi).
- Haqiqiy o‘quvchilar bilan UI, offline va ishlab turgan Supabase
  resurslarining uzun muddatli sinovlari.
- Interaktiv reja va o‘quv maqsadlarini ehtiyotkorlik bilan qo‘shish.

**Wordora 7.5 mavjud so‘zlar va natijalarni o‘zgartirmaydi.**
