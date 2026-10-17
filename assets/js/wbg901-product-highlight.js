(() => {
  const section = document.querySelector('.wbg901-product');
  if (!section) return;

  const stage = section.querySelector('.wbg901-product__stage');
  const mainImage = section.querySelector('[data-wbg901-main-media]');
  const frameCounter = section.querySelector('[data-wbg901-frame-count]');
  const frameCount = 24;
  const initialFrame = 10;
  const basePath = 'assets/images/products/wbg901';
  const frameUrls = Array.from({ length: frameCount }, (_, index) =>
    `${basePath}/0_${index}.webp`
  );
  const cachedFrames = new Set([initialFrame]);
  const loadingFrames = new Map();
  const numberFormat = new Intl.NumberFormat('fa-IR');
  let selectedFrame = initialFrame;
  let requestedFrame = initialFrame;
  let scrollFrame = 0;

  section.classList.add('has-main-media', 'has-frame-sequence');

  const showFrame = (index) => {
    requestedFrame = index;
    if (!cachedFrames.has(index)) {
      loadFrame(index);
      return;
    }

    if (selectedFrame !== index) {
      mainImage.src = frameUrls[index];
      selectedFrame = index;
    }
    frameCounter.textContent = `${numberFormat.format(index + 1)} / ${numberFormat.format(frameCount)}`;
  };

  const loadFrame = (index) => {
    if (cachedFrames.has(index) || loadingFrames.has(index)) return;

    const image = new Image();
    image.decoding = 'async';
    loadingFrames.set(index, image);
    image.onload = async () => {
      try { await image.decode(); } catch { /* onload already confirms the frame is usable */ }
      cachedFrames.add(index);
      loadingFrames.delete(index);
      if (requestedFrame === index) showFrame(index);
    };
    image.onerror = () => loadingFrames.delete(index);
    image.src = frameUrls[index];
  };

  const updateFromScroll = () => {
    scrollFrame = 0;
    const viewportHeight = window.innerHeight;
    const bounds = stage.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1,
      (viewportHeight - bounds.top) / (viewportHeight + bounds.height)
    ));
    const offset = Math.round(progress * frameCount);
    showFrame((initialFrame + offset) % frameCount);
  };

  const scheduleScrollUpdate = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateFromScroll);
  };

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', scheduleScrollUpdate, { passive: true });
    updateFromScroll();
  }

  // Warm adjacent views first; load the rest in small idle-time batches.
  [9, 11, 8, 12].forEach(loadFrame);
  const remainingFrames = Array.from({ length: frameCount }, (_, index) => index)
    .filter((index) => ![initialFrame, 9, 11, 8, 12].includes(index));
  const preloadBatch = (deadline) => {
    let loaded = 0;
    while (remainingFrames.length && loaded < 4 && (deadline.didTimeout || deadline.timeRemaining() > 4)) {
      loadFrame(remainingFrames.shift());
      loaded += 1;
    }
    if (remainingFrames.length) scheduleIdlePreload();
  };
  const scheduleIdlePreload = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(preloadBatch, { timeout: 1200 });
    else window.setTimeout(() => preloadBatch({ didTimeout: true, timeRemaining: () => 0 }), 120);
  };
  scheduleIdlePreload();

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
