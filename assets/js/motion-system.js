(() => {
  if (window.__shahrokhMotionSystemInitialized) return;
  window.__shahrokhMotionSystemInitialized = true;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || typeof gsap.matchMedia !== 'function') return;

  gsap.registerPlugin(ScrollTrigger);

  const stickyOffset = () => Math.ceil(document.querySelector('[data-header]')?.getBoundingClientRect().height || 76) + 24;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionProfiles = [
    { query: '(max-width: 767px) and (prefers-reduced-motion: no-preference)', y: 10, reveal: 0.44, stagger: 0.075, scrub: 0.45, imageScale: 1.02 },
    { query: '(min-width: 768px) and (max-width: 1023px) and (prefers-reduced-motion: no-preference)', y: 14, reveal: 0.5, stagger: 0.08, scrub: 0.5, imageScale: 1.03 },
    { query: '(min-width: 1024px) and (max-width: 1199px) and (prefers-reduced-motion: no-preference)', y: 20, reveal: 0.58, stagger: 0.09, scrub: 0.58, imageScale: 1.035 },
    { query: '(min-width: 1200px) and (prefers-reduced-motion: no-preference)', y: 20, reveal: 0.58, stagger: 0.09, scrub: 0.58, imageScale: 1.035 },
  ];

  const enterOnce = (element, { trigger = element, start = 'top 72%', y = 16, duration = 0.52 } = {}) => {
    if (!element) return;
    gsap.fromTo(element,
      { autoAlpha: 0, y },
      {
        autoAlpha: 1,
        y: 0,
        duration,
        ease: 'power2.out',
        clearProps: 'opacity,visibility,transform',
        scrollTrigger: { trigger, start, once: true },
      },
    );
  };

  const revealSequence = (trigger, items, profile, start = 'top 72%') => {
    const sequence = items.filter(({ element }) => Boolean(element));
    if (!trigger || !sequence.length) return;
    const timeline = gsap.timeline({ scrollTrigger: { trigger, start, once: true } });
    sequence.forEach(({ element, y = profile.y, duration = profile.reveal, at = '>' }) => {
      timeline.fromTo(element,
        { autoAlpha: 0, y },
        { autoAlpha: 1, y: 0, duration, ease: 'power2.out', clearProps: 'opacity,visibility,transform' },
        at,
      );
    });
    return timeline;
  };

  const revealMediaOnce = (trigger, frame, image, profile, { start = 'top 78%', fromScale = 1.035, x = 0 } = {}) => {
    if (!trigger || !frame) return;
    const animatedImage = image || frame.querySelector('img, video');
    const timeline = gsap.timeline({
      scrollTrigger: { trigger, start, once: true },
    });
    timeline.fromTo(frame,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', ease: 'power2.out', duration: profile.reveal + 0.25, clearProps: 'clipPath' },
      0,
    );
    if (animatedImage) {
      timeline.fromTo(animatedImage, { scale: fromScale || profile.imageScale, x },
        { scale: 1, x: 0, ease: 'power2.out', duration: profile.reveal + 0.25, clearProps: 'transform' }, 0);
    }
    return timeline;
  };

  const staggerOnOwnViewport = (container, items, profile, { start = 'top 78%', y = 18, imageSelector = null, batchMax = 4 } = {}) => {
    if (!container || !items?.length) return;
    gsap.set(items, { autoAlpha: 0, y });
    ScrollTrigger.batch(items, {
      start,
      once: true,
      interval: 0.08,
      batchMax,
      onEnter: (batch) => {
        const images = imageSelector ? batch.map((card) => card.querySelector(imageSelector)).filter(Boolean) : [];
        const sequence = gsap.timeline();
        sequence.fromTo(batch,
          { autoAlpha: 0, y },
          { autoAlpha: 1, y: 0, duration: profile.reveal, stagger: profile.stagger, ease: 'power2.out', clearProps: 'opacity,visibility,transform' },
        );
        if (images.length) {
          sequence.fromTo(images,
            { scale: 1.035 },
            { scale: 1, duration: profile.reveal + 0.08, stagger: profile.stagger, ease: 'power2.out', clearProps: 'transform' },
            0,
          );
        }
      },
    });
  };

  const revealGroup = (container, items, profile, { start = 'top 82%', y = 12 } = {}) => {
    if (!container || !items?.length) return;
    gsap.set(items, { autoAlpha: 0, y });
    ScrollTrigger.create({
      trigger: container,
      start,
      once: true,
      onEnter: () => gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration: profile.reveal,
        stagger: profile.stagger,
        ease: 'power2.out',
        clearProps: 'opacity,visibility,transform',
      }),
    });
  };

  const setActiveItem = (items, active) => {
    items.forEach((item, index) => item.classList.toggle('is-active', index === active));
  };

  const formatStoryStep = new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });
  const updateStoryProgress = (section, name, active, progress) => {
    const count = section.querySelector(`[data-${name}-count]`);
    const fill = section.querySelector(`[data-${name}-fill]`);
    if (count) {
      const current = `${formatStoryStep.format(active + 1)} / ${formatStoryStep.format(3)}`;
      if (count.textContent !== current) count.textContent = current;
    }
    if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  };

  const buildWbg905Scene = (profile, useStickyTrack) => {
    const section = document.querySelector('[data-motion-section="wbg905-story"]');
    const stage = section?.querySelector('.wbg905-product-story__stage');
    const product = stage?.querySelector('.wbg905-product-story__image');
    const callouts = [...(stage?.querySelectorAll('.wbg905-product-story__callout') || [])];
    const benefits = [...(section?.querySelectorAll('.wbg905-product-story__benefit') || [])];
    const overview = section?.querySelector('.wbg905-product-story__overview');
    const track = section?.querySelector('[data-product-track]');

    if (section) delete section.dataset.motionReady;
    if (section && overview && stage && product && track && useStickyTrack) {
      section.dataset.motionReady = 'true';
      section.style.setProperty('--wbg905-sticky-top', `${stickyOffset()}px`);
      // Observe the CSS sticky track only; this scene intentionally has no GSAP pin.
      ScrollTrigger.create({
        trigger: track,
        start: () => `top ${stickyOffset()}px`,
        end: () => `bottom ${stickyOffset() + overview.offsetHeight}px`,
        invalidateOnRefresh: true,
        onLeave: () => section.classList.add('is-story-released'),
        onEnterBack: () => section.classList.remove('is-story-released'),
        onLeaveBack: () => section.classList.remove('is-story-released'),
        onUpdate: (self) => {
          const progress = self.progress;
          const active = progress < 0.28 ? 0 : progress < 0.56 ? 1 : 2;
          const calloutIndex = progress < 0.28 ? 0 : progress < 0.56 ? 1 : progress < 0.88 ? 2 : 3;
          setActiveItem(benefits, active);
          callouts.forEach((item, index) => item.classList.toggle('is-active', index === calloutIndex));
          updateStoryProgress(section, 'product-story', active, progress);
        },
      });
    } else if (section && stage) {
      revealMediaOnce(stage, stage, product, profile, { start: 'top 78%', fromScale: 0.98 });
      const intro = overview?.querySelector('.wbg905-product-story__intro');
      revealSequence(intro, [
        { element: intro?.querySelector('.wbg905-product-story__meta'), y: 8, duration: 0.38, at: 0 },
        { element: intro?.querySelector('.wbg905-product-story__code'), y: 18, at: 0.06 },
        { element: intro?.querySelector('.wbg905-product-story__headline'), y: 18, at: 0.14 },
        { element: intro?.querySelector('.wbg905-product-story__description'), y: 10, at: 0.24 },
        { element: intro?.querySelector('.wbg905-product-story__actions'), y: 8, at: 0.32 },
      ], profile, 'top 72%');
      if (overview) {
        const items = [...overview.querySelectorAll('.wbg905-product-story__benefit')];
        revealGroup(overview.querySelector('.wbg905-product-story__benefits'), items, profile, { start: 'top 80%' });
      }
    }

    if (!section) return;
    const heading = section.querySelector('.wbg905-product-story__details-heading');
    const featureGrid = section.querySelector('.wbg905-product-story__features');
    const features = [...(featureGrid?.querySelectorAll('.wbg905-product-story__feature') || [])];
    const final = section.querySelector('.wbg905-product-story__final');
    enterOnce(heading, { start: 'top 76%', y: profile.y, duration: profile.reveal });
    staggerOnOwnViewport(featureGrid, features, profile, { start: 'top 78%', imageSelector: 'img', batchMax: 2 });
    enterOnce(final, { start: 'top 82%', y: 12, duration: profile.reveal });
  };

  const buildCapabilitiesScene = (profile, canPin) => {
    const section = document.querySelector('[data-motion-section="capabilities"]');
    const visual = section?.querySelector('.capabilities-section__visual');
    const overlays = [...(section?.querySelectorAll('.capabilities-section__benefits li') || [])];
    const sceneRoot = section?.querySelector('.capabilities-section__scene');
    const intro = section?.querySelector('.capabilities-section__intro');

    if (section) delete section.dataset.motionReady;
    if (sceneRoot && visual && canPin) {
      section.dataset.motionReady = 'true';
      const scene = gsap.timeline({
        scrollTrigger: {
          trigger: sceneRoot,
          start: () => `top ${stickyOffset()}px`,
          end: () => `+=${Math.round(window.innerHeight * 1.4)}`,
          pin: sceneRoot,
          pinSpacing: true,
          scrub: profile.scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
        onUpdate: (self) => {
          const active = overlays.length ? Math.min(overlays.length - 1, Math.floor(self.progress * overlays.length)) : -1;
          setActiveItem(overlays, active);
          updateStoryProgress(section, 'capabilities-story', active, self.progress);
          if (self.progress > 0.07) section.classList.add('is-story-started');
        },
      });
      scene.fromTo(visual,
        { scale: 1 },
        { scale: 1.02, ease: 'none', duration: 1 },
        0,
      );
    } else if (visual) {
      enterOnce(visual, { start: 'top 78%', y: 8, duration: profile.reveal });
      const benefits = section.querySelector('.capabilities-section__benefits');
      revealGroup(benefits, overlays, profile, { start: 'top 82%', y: 8 });
    }

    if (section && !canPin) {
      revealSequence(intro, [
        { element: intro?.querySelector('.capabilities-section__eyebrow'), y: 10, duration: 0.4, at: 0 },
        { element: intro?.querySelector('h2'), y: profile.y, duration: profile.reveal, at: 0.08 },
        { element: intro?.querySelector(':scope > p:last-child'), y: 12, duration: profile.reveal, at: 0.2 },
      ], profile, 'top 74%');
      const cards = section.querySelector('.capabilities-section__cards');
      staggerOnOwnViewport(cards, [...(cards?.querySelectorAll('.capabilities-section__card') || [])], profile, { start: 'top 78%', imageSelector: 'img', batchMax: 2 });
      const process = section.querySelector('.capabilities-section__process ol');
      revealGroup(process, [...(process?.querySelectorAll(':scope > li') || [])], profile, { start: 'top 82%', y: 10 });
    }
  };

  const buildWbg901Progression = (profile) => {
    const section = document.querySelector('[data-motion-section="wbg901"]');
    const stage = section?.querySelector('.wbg901-product__stage');
    const image = stage?.querySelector('.wbg901-product__main-image');
    const features = [...(section?.querySelectorAll('.wbg901-product__features > li') || [])];
    if (!section || !stage) return;

    if (window.innerWidth >= 1024 && features.length) {
      enterOnce(stage, { start: 'top 82%', y: 8, duration: profile.reveal });
      ScrollTrigger.create({
        trigger: section.querySelector('.wbg901-product__features'),
        start: () => `top ${stickyOffset()}px`,
        end: () => `+=${Math.round(window.innerHeight * 1.05)}`,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const active = Math.min(features.length - 1, Math.floor(self.progress * features.length));
          setActiveItem(features, active);
        },
      });
    } else {
      revealMediaOnce(stage, stage, image, profile, { start: 'top 78%', fromScale: 1.025 });
      revealGroup(section.querySelector('.wbg901-product__features'), features, profile, { start: 'top 78%', y: 10 });
    }
    enterOnce(section.querySelector('.wbg901-product__intro'), { start: 'top 74%', y: profile.y, duration: profile.reveal });
    enterOnce(section.querySelector('.wbg901-product__actions'), { start: 'top 82%', y: 12, duration: profile.reveal });
  };

  const buildProfile = (profile, { desktop = false, wideDesktop = false } = {}) => {
    const about = document.querySelector('[data-motion-section="about"]');
    if (about) {
      const content = about.querySelector('.about-shahrokh__content');
      revealSequence(content, [
        { element: content.querySelector('.about-shahrokh__meta'), y: 8, duration: 0.38, at: 0 },
        { element: content.querySelector('.about-shahrokh__title'), y: 24, duration: profile.reveal, at: 0.1 },
        { element: content.querySelector('.about-shahrokh__description'), y: 12, duration: profile.reveal, at: 0.22 },
        { element: content.querySelector('.about-shahrokh__cta'), y: 8, duration: 0.42, at: 0.34 },
      ], profile, 'top 72%');
      const media = about.querySelector('.about-shahrokh__media');
      revealMediaOnce(media, media, media?.querySelector('img'), profile, { start: 'top 78%', fromScale: 1.035 });
      const benefits = [...about.querySelectorAll('.about-shahrokh__features > li')];
      revealGroup(about.querySelector('.about-shahrokh__features'), benefits, profile, { start: 'top 82%', y: 12 });
    }

    buildWbg905Scene(profile, wideDesktop);

    const solutions = document.querySelector('[data-motion-section="solutions"]');
    if (solutions) {
      const stage = solutions.querySelector('.product-range__stage');
      const image = stage?.querySelector('.product-range__showcase');
      const title = solutions.querySelector('.product-range__intro h2');
      const eyebrow = solutions.querySelector('.product-range__eyebrow');
      const lead = solutions.querySelector('.product-range__lead');
      const cta = solutions.querySelector('.product-range__all-link');
      const editorial = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 78%', once: true } });
      editorial.fromTo(stage, { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', ease: 'power2.out', duration: profile.reveal + 0.25, clearProps: 'clipPath' }, 0);
      if (image) editorial.fromTo(image, { scale: 1.04, x: 20 },
        { scale: 1, x: 0, ease: 'power2.out', duration: profile.reveal + 0.25, clearProps: 'transform' }, 0);
      editorial.fromTo([eyebrow, title, lead, cta].filter(Boolean),
        { autoAlpha: 0, y: profile.y },
        { autoAlpha: 1, y: 0, stagger: 0.08, ease: 'power2.out', duration: profile.reveal, clearProps: 'opacity,visibility,transform' }, 0.08);
      const grid = solutions.querySelector('.product-range__category-grid');
      staggerOnOwnViewport(grid, [...(grid?.querySelectorAll('.product-range__category-card') || [])], profile, { start: 'top 78%', imageSelector: 'picture img', batchMax: 2 });
      const product = solutions.querySelector('.product-range__product-card');
      enterOnce(product, { start: 'top 82%', y: 16, duration: profile.reveal });
      const values = [...solutions.querySelectorAll('.product-range__values > li')];
      revealGroup(solutions.querySelector('.product-range__values'), values, profile, { start: 'top 82%' });
    }

    buildCapabilitiesScene(profile, desktop);

    const applications = document.querySelector('[data-motion-section="applications"]');
    if (applications) {
      const hero = applications.querySelector('.industry-applications__hero');
      const heroImage = hero?.querySelector('img');
      const intro = applications.querySelector('.industry-applications__intro');
      if (desktop) {
        const entrance = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top 78%', once: true } });
        entrance.fromTo(hero, { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: profile.reveal + 0.25, ease: 'power2.out', clearProps: 'clipPath' }, 0);
        if (heroImage) entrance.fromTo(heroImage, { scale: 1.035 },
          { scale: 1, duration: profile.reveal + 0.25, ease: 'power2.out', clearProps: 'transform' }, 0);
        const introItems = [
          { element: intro?.querySelector('.industry-applications__eyebrow'), y: 8, duration: 0.38, at: 0.06 },
          { element: intro?.querySelector('h2'), y: profile.y, at: 0.14 },
          { element: intro?.querySelector(':scope > p'), y: 10, at: 0.24 },
        ];
        introItems.forEach(({ element, y = profile.y, duration = profile.reveal, at }) => {
          if (!element) return;
          entrance.fromTo(element, { autoAlpha: 0, y },
            { autoAlpha: 1, y: 0, duration, ease: 'power2.out', clearProps: 'opacity,visibility,transform' }, at);
        });
      } else {
          revealSequence(intro, [
            { element: intro?.querySelector('.industry-applications__eyebrow'), y: 8, duration: 0.38, at: 0 },
            { element: intro?.querySelector('h2'), y: profile.y, at: 0.08 },
            { element: intro?.querySelector(':scope > p'), y: 10, at: 0.2 },
        ], profile, 'top 72%');
          revealMediaOnce(hero, hero, heroImage, profile, { start: 'top 78%', fromScale: 1.035 });
      }
      const cards = applications.querySelector('.industry-applications__cards');
      staggerOnOwnViewport(cards, [...(cards?.querySelectorAll('.industry-applications__card') || [])], profile, { start: 'top 78%', y: 16, imageSelector: 'img', batchMax: 4 });
      const lower = applications.querySelector('.industry-applications__benefits');
      revealSequence(lower, [
        { element: lower?.querySelector('.industry-applications__benefit-intro'), y: 12, at: 0 },
      ], profile, 'top 82%');
      revealGroup(lower, [...(lower?.querySelectorAll('.industry-applications__benefit-list > li') || [])], profile, { start: 'top 82%', y: 10 });
    }

    buildWbg901Progression(profile);

    const brand = document.querySelector('[data-motion-section="brand"]');
    if (brand) {
      const intro = brand.querySelector('.brand-trust-about__intro');
      revealSequence(intro, [
        { element: intro.querySelector('.brand-trust-about__eyebrow'), y: 8, duration: 0.38, at: 0 },
        { element: intro.querySelector('h2'), y: 22, at: 0.1 },
        { element: intro.querySelector('.brand-trust-about__description'), y: 12, at: 0.22 },
        { element: brand.querySelector('.brand-trust-about__actions'), y: 8, at: 0.36 },
      ].filter(({ element }) => Boolean(element)), profile, 'top 72%');
      const media = brand.querySelector('.brand-trust-about__media');
      revealMediaOnce(media, media, media?.querySelector('img'), profile, { start: 'top 78%', fromScale: 1.035 });
      const values = [...brand.querySelectorAll('.brand-trust-about__values > li')];
      revealGroup(brand.querySelector('.brand-trust-about__values'), values, profile, { start: 'top 82%', y: 12 });
    }

    const footer = document.querySelector('[data-motion-section="footer"]');
    if (footer) {
      enterOnce(footer.querySelector('.site-footer__banner'), { start: 'top 84%', y: 14, duration: 0.48 });
      const columns = [...footer.querySelectorAll('.site-footer__columns > .site-footer__column')];
      revealGroup(footer.querySelector('.site-footer__columns'), columns, profile, { start: 'top 86%', y: 8 });
    }
  };

  const matchMedia = gsap.matchMedia();
  motionProfiles.forEach((profile) => {
    matchMedia.add(profile.query, () => {
      const width = window.innerWidth;
      buildProfile(profile, { desktop: width >= 1024, wideDesktop: width >= 1200 });
      return () => {
        document.querySelectorAll('[data-motion-section][data-motion-ready="true"]').forEach((section) => {
          delete section.dataset.motionReady;
        });
        document.querySelectorAll('[data-motion-section="wbg905-story"] .is-active, [data-motion-section="capabilities"] .is-active, [data-motion-section="wbg901"] .is-active').forEach((item) => {
          item.classList.remove('is-active');
        });
        document.querySelector('[data-motion-section="wbg905-story"]')?.classList.remove('is-story-released');
      };
    });
  });

  const refreshAfterLayout = () => ScrollTrigger.refresh();
  window.addEventListener('load', refreshAfterLayout, { once: true });
  if (document.fonts?.ready) document.fonts.ready.then(refreshAfterLayout).catch(() => {});

  // Loading may begin near the viewport; playback is governed by a separate
  // zero-margin observer so no visible motion starts while media is offscreen.
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const videoHosts = [...document.querySelectorAll('[data-motion-video][data-video-src]')];
  if (!videoHosts.length) return;

  const playbackObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target: host, isIntersecting, intersectionRatio }) => {
      const video = host.__motionVideo;
      if (!video) return;
      const active = isIntersecting && intersectionRatio >= 0.55;
      host.dataset.videoActive = String(active);
      if (active) video.play().then(() => host.classList.add('has-motion-video')).catch(() => {});
      else video.pause();
    });
  }, { rootMargin: '0px', threshold: [0, 0.1, 0.55, 0.75] });

  const preloadObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ target: host, isIntersecting }) => {
      const source = host.dataset.videoSrc?.trim();
      if (!isIntersecting || !source || host.__motionVideo || host.dataset.videoFailed === 'true') return;
      const video = document.createElement('video');
      video.className = 'motion-video';
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.autoplay = false;
      video.preload = 'metadata';
      video.loop = host.dataset.videoLoop === 'true';
      const poster = host.dataset.videoPoster || host.querySelector('img')?.currentSrc || host.querySelector('img')?.src;
      if (poster) video.poster = poster;
      video.addEventListener('error', () => {
        host.classList.remove('has-motion-video');
        host.dataset.videoFailed = 'true';
        host.__motionVideo = null;
        video.remove();
      }, { once: true });
      host.__motionVideo = video;
      host.append(video);
      video.src = source;
      video.load();
      playbackObserver.observe(host);
    });
  }, { rootMargin: '400px 0px', threshold: 0 });

  videoHosts.forEach((host) => preloadObserver.observe(host));
})();
