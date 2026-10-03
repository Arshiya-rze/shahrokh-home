# شاهرخ — صفحه‌ی اصلی تعاملی

نمونه‌ی استاتیک و قابل‌ادغام برای صفحه‌ی اصلی شاهرخ، با HTML5، CSS مدرن، JavaScript خام و GSAP/ScrollTrigger.

## اجرا

پروژه را با VS Code Live Server یا هر HTTP server ساده اجرا کنید:

```bash
python3 -m http.server 8080
```

سپس `http://localhost:8080` را باز کنید.

## دارایی‌های برند

- رنگ‌های اصلی از Brand Book 2022 استخراج شده‌اند: قرمز برند، مشکی و خاکستری؛ سفید به‌عنوان مکمل.
- لوگوی استفاده‌شده از صفحه‌ی لوگوتایپ برندبوک استخراج شده و در `assets/images/brand/` قرار دارد.
- فونت برند `B Nazanin` در ابتدای stack قرار دارد و `Vazirmatn` fallback وب آن است تا جایگزینی بعدی ساده باشد.
- فایل مدل واقعی `WBG905.STEP` در `assets/models/` نگهداری می‌شود.

## ساختار

- `index.html` — صفحه‌ی کامل فارسی و RTL
- `assets/css/` — reset، توکن‌ها، layout، سکشن‌ها و responsive mobile-first
- `assets/js/animations.js` — انیمیشن‌های GSAP و سناریوی pinned برای WBG905
- `assets/js/main.js` — منوی موبایل و media slotها
- `assets/images/brand/` — لوگوی روشن و تیره‌ی استخراج‌شده از برندبوک
- `assets/videos/` — محل ویدئوهای نهایی
- `assets/models/WBG905.STEP` — مدل واقعی محصول

## ویدئوهای مورد نیاز برای مرحله‌ی بعد

سه فایل نهایی لازم است:

1. `assets/videos/wbg905-hero.webm` یا `.mp4` برای Hero
2. `assets/videos/workspace-story.webm` یا `.mp4` برای داستان میانی
3. `assets/videos/detail-story.webm` یا `.mp4` برای داستان پایانی

محل درج هر ویدئو در `index.html` با کامنت مشخص شده است. تا زمان تحویل رندر یا ویدئوی واقعی، جایگاه‌ها عمداً placeholder هستند و محصول ساختگی نمایش داده نمی‌شود.
