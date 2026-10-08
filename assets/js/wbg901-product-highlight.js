(async () => {
  const section = document.querySelector('.wbg901-product');
  if (!section) return;

  const mainImage = section.querySelector('[data-wbg901-main-media]');
  const fallback = section.querySelector('[data-wbg901-media-fallback]');
  const gallery = section.querySelector('[data-wbg901-gallery]');
  const videoPanel = section.querySelector('[data-wbg901-video-panel]');
  const video = section.querySelector('[data-wbg901-video]');
  const playButton = section.querySelector('[data-wbg901-play]');
  const specsPanel = section.querySelector('[data-wbg901-specs]');

  const mainMedia = 'assets/images/products/wbg901/wbg901-main.webp';
  const detailMedia = [
    { src: 'assets/images/products/wbg901/wbg901-worktop.webp', label: 'سطح کار', alt: 'نمای نزدیک سطح کار ایستگاه WBG901' },
    { src: 'assets/images/products/wbg901/wbg901-storage.webp', label: 'فضای ذخیره‌سازی', alt: 'نمای نزدیک فضای ذخیره‌سازی ایستگاه WBG901' },
    { src: 'assets/images/products/wbg901/wbg901-tool-panel.webp', label: 'پنل ابزار', alt: 'نمای نزدیک پنل ابزار ایستگاه WBG901' },
    { src: 'assets/images/products/wbg901/wbg901-base.webp', label: 'پایه و ساختار', alt: 'نمای نزدیک پایه و ساختار ایستگاه WBG901' },
  ];
  // Keep empty until verified WBG901 values are supplied by the client.
  const verifiedSpecs = [];

  const assetExists = async (src, mediaType) => {
    try {
      const response = await fetch(src, { method: 'HEAD', cache: 'no-store' });
      return response.ok && response.headers.get('content-type')?.startsWith(`${mediaType}/`);
    } catch {
      return false;
    }
  };

  const availableDetails = (await Promise.all(detailMedia.map(async (item) =>
    await assetExists(item.src, 'image') ? item : null,
  ))).filter(Boolean);

  if (await assetExists(mainMedia, 'image')) {
    mainImage.src = mainMedia;
    mainImage.hidden = false;
    fallback.hidden = true;
    section.classList.add('has-main-media');
  }

  if (availableDetails.length >= 2) {
    gallery.setAttribute('role', 'listbox');
    availableDetails.forEach((item, index) => {
      const button = document.createElement('button');
      const image = document.createElement('img');
      button.type = 'button';
      button.className = 'wbg901-product__detail';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', 'false');
      button.setAttribute('aria-label', `نمایش ${item.label} در تصویر اصلی`);
      image.src = item.src;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      const label = document.createElement('span');
      label.textContent = item.label;
      button.append(image, label);
      button.addEventListener('click', () => {
        mainImage.src = item.src;
        mainImage.alt = item.alt;
        mainImage.hidden = false;
        fallback.hidden = true;
        section.classList.add('has-main-media');
        gallery.querySelectorAll('[role="option"]').forEach((option) => option.setAttribute('aria-selected', String(option === button)));
      });
      button.addEventListener('keydown', (event) => {
        const options = [...gallery.querySelectorAll('[role="option"]')];
        const current = options.indexOf(button);
        const next = event.key === 'ArrowLeft' ? (current + 1) % options.length
          : event.key === 'ArrowRight' ? (current - 1 + options.length) % options.length
            : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : -1;
        if (next >= 0) {
          event.preventDefault();
          options[next].focus();
          options[next].click();
        }
      });
      if (index === 0 && mainImage.hidden) {
        mainImage.src = item.src;
        mainImage.alt = item.alt;
        mainImage.hidden = false;
        fallback.hidden = true;
        section.classList.add('has-main-media');
        button.setAttribute('aria-selected', 'true');
      }
      gallery.append(button);
    });
    gallery.hidden = false;
    section.classList.add('has-gallery');
  }

  const videoSrc = 'assets/videos/wbg901-intro.mp4';
  if (await assetExists(videoSrc, 'video')) {
    video.src = videoSrc;
    videoPanel.hidden = false;
    section.classList.add('has-video');
    playButton.addEventListener('click', async () => {
      video.hidden = false;
      playButton.hidden = true;
      try { await video.play(); } catch { playButton.hidden = false; }
    });
  }

  // Populate only with verified specs; absent data intentionally hides the component.
  if (verifiedSpecs.length) {
    verifiedSpecs.forEach(({ label: termText, value }) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = termText;
      description.textContent = value;
      row.append(term, description);
      specsPanel.append(row);
    });
    specsPanel.hidden = false;
    section.classList.add('has-specs');
  }

  if (window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.gsap.fromTo(section.querySelectorAll('[data-wbg901-reveal]:not([hidden])'), { autoAlpha: 0, y: 12 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.06,
      ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 82%', once: true },
    });
  }
})();
