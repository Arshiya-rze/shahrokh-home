(() => {
  if (window.__shahrokhMotionSystemInitialized) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || typeof gsap.matchMedia !== 'function') return;
  window.__shahrokhMotionSystemInitialized = true;

  gsap.registerPlugin(ScrollTrigger);
  // Let GSAP handle viewport changes with its built-in debounce, but avoid a
  // separate late `load` refresh after these scenes have already been measured.
  ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,resize' });

  const stickyOffset = () => Math.ceil(document.querySelector('[data-header]')?.getBoundingClientRect().height || 76) + 24;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionMatchMedia;
  let preloadObserver;
  let playbackObserver;
  const mobileRevealObservers = new Map();
  const mobileStateWatchers = new Set();
  let mobileStateFrame = 0;
  let mobileRevealFrame = 0;
  const transientAnimations = new Set();
  const trackTransientAnimation = (animation) => {
    if (!animation) return animation;
    transientAnimations.add(animation);
    animation.eventCallback('onComplete', () => transientAnimations.delete(animation));
    return animation;
  };
  const killTransientAnimations = () => {
    transientAnimations.forEach((animation) => animation.kill());
    transientAnimations.clear();
  };
  const disconnectMobileObservers = () => {
    mobileRevealObservers.forEach(({ observer }) => observer.disconnect());
    mobileRevealObservers.clear();
    mobileStateWatchers.clear();
    if (mobileStateFrame) window.cancelAnimationFrame(mobileStateFrame);
    if (mobileRevealFrame) window.cancelAnimationFrame(mobileRevealFrame);
    mobileStateFrame = 0;
    mobileRevealFrame = 0;
  };
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
        const sequence = trackTransientAnimation(gsap.timeline());
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
      onEnter: () => trackTransientAnimation(gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration: profile.reveal,
        stagger: profile.stagger,
        ease: 'power2.out',
        clearProps: 'opacity,visibility,transform',
      })),
    });
  };

  const observeMobileEnter = (element, callback, visibleRatio = 0.18) => {
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      ScrollTrigger.create({ trigger: element, start: `top ${(1 - visibleRatio) * 100}%`, once: true, onEnter: callback });
      return;
    }
    const key = Math.round(visibleRatio * 100);
    let observerState = mobileRevealObservers.get(key);
    if (!observerState) {
      const targets = new Map();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const enter = targets.get(entry.target);
          if (!enter) return;
          targets.delete(entry.target);
          observer.unobserve(entry.target);
          enter();
        });
      }, { rootMargin: `0px 0px -${Math.round(window.innerHeight * (1 - visibleRatio))}px 0px`, threshold: 0 });
      observerState = { observer, targets, visibleRatio };
      mobileRevealObservers.set(key, observerState);
    }
    observerState.targets.set(element, callback);
    observerState.observer.observe(element);
  };

  const flushPassedMobileReveals = () => {
    mobileRevealFrame = 0;
    mobileRevealObservers.forEach(({ observer, targets, visibleRatio }) => {
      const revealLine = window.innerHeight * visibleRatio;
      targets.forEach((callback, element) => {
        if (element.getBoundingClientRect().top > revealLine) return;
        targets.delete(element);
        observer.unobserve(element);
        callback();
      });
    });
  };

  const flushMobileStateWatchers = () => {
    mobileStateFrame = 0;
    mobileStateWatchers.forEach((update) => update());
  };

  window.addEventListener('scroll', () => {
    if (mobileRevealObservers.size && !mobileRevealFrame) {
      mobileRevealFrame = window.requestAnimationFrame(flushPassedMobileReveals);
    }
    if (mobileStateWatchers.size && !mobileStateFrame) {
      mobileStateFrame = window.requestAnimationFrame(flushMobileStateWatchers);
    }
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (mobileStateWatchers.size && !mobileStateFrame) {
      mobileStateFrame = window.requestAnimationFrame(flushMobileStateWatchers);
    }
  }, { passive: true });

  const mobileRevealSequence = (trigger, items, profile, start = 'top 82%') => {
    const sequence = items.filter(({ element }) => Boolean(element));
    if (!trigger || !sequence.length) return;
    const visibleRatio = Number.parseFloat(start.match(/[\d.]+(?=%)/)?.[0] || '82') / 100;
    observeMobileEnter(trigger, () => {
      const timeline = trackTransientAnimation(gsap.timeline());
      sequence.forEach(({ element, y = 16, duration = Math.max(profile.reveal, 0.5), at }) => {
        timeline.fromTo(element,
          { autoAlpha: 0, y },
          { autoAlpha: 1, y: 0, duration, ease: 'power2.out', clearProps: 'opacity,visibility,transform' },
          at,
        );
      });
    });
  };

  const mobileRevealMedia = (trigger, frame, image, { start = 'top 82%', end = 'top 48%', fromScale = 1.035 } = {}) => {
    if (!trigger || !frame) return;
    const animatedImage = image || frame.querySelector('img, video');
    let reachedEnd = false;
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub: 0.45,
        invalidateOnRefresh: true,
        onUpdate: (self) => { if (self.progress >= 1) reachedEnd = true; },
        onLeaveBack: (self) => {
          if (!reachedEnd) return;
          self.animation?.progress(1).pause();
          self.kill();
        },
      },
    });
    timeline.fromTo(frame,
      { clipPath: 'inset(0 0 100% 0)' },
      { clipPath: 'inset(0 0 0% 0)', ease: 'none', duration: 1 },
      0,
    );
    if (animatedImage) timeline.fromTo(animatedImage,
      { scale: fromScale },
      { scale: 1, ease: 'none', duration: 1 },
      0,
    );
    return timeline;
  };

  const mobileStagger = (container, items, profile, { start = 'top 84%', y = 14, imageSelector = null, batchMax = 2 } = {}) => {
    if (!container || !items?.length) return;
    const rows = [];
    items.forEach((item) => {
      const top = item.getBoundingClientRect().top;
      let row = rows.find((candidate) => Math.abs(candidate.top - top) < 6);
      if (!row) {
        row = { top, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    });
    gsap.set(items, { autoAlpha: 0, y });
    const visibleRatio = Number.parseFloat(start.match(/[\d.]+(?=%)/)?.[0] || '84') / 100;
    rows.forEach(({ items: rowItems }) => {
      observeMobileEnter(rowItems[0], () => {
        const images = imageSelector ? rowItems.map((item) => item.querySelector(imageSelector)).filter(Boolean) : [];
        const sequence = trackTransientAnimation(gsap.timeline());
        sequence.fromTo(rowItems,
          { autoAlpha: 0, y },
          { autoAlpha: 1, y: 0, duration: Math.max(profile.reveal, 0.5), stagger: 0.08, ease: 'power2.out', clearProps: 'opacity,visibility,transform' },
        );
        if (images.length) sequence.fromTo(images,
          { scale: 1.02 },
          { scale: 1, duration: Math.max(profile.reveal, 0.5), stagger: 0.08, ease: 'power2.out', clearProps: 'transform' },
          0,
        );
      }, visibleRatio);
    });
  };

  const mobileActivateOnCenter = (items, { start = 'center 58%', onActive = null } = {}) => {
    if (!items?.length) return;
    const activate = (index) => {
      setActiveItem(items, index);
      items.forEach((item, itemIndex) => {
        if (itemIndex === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      onActive?.(index);
    };
    const crossingRatio = Number.parseFloat(start.match(/[\d.]+(?=%)/)?.[0] || '58') / 100;
    const update = () => {
      const bounds = items[0]?.parentElement?.getBoundingClientRect();
      if (!bounds || bounds.bottom < -window.innerHeight * 0.2 || bounds.top > window.innerHeight * 1.2) return;
      const crossing = window.innerHeight * crossingRatio;
      let nearest = 0;
      let nearestDistance = Infinity;
      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - crossing);
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      });
      activate(nearest);
    };
    mobileStateWatchers.add(update);
    update();
    return activate;
  };

  const setActiveItem = (items, active) => {
    items.forEach((item, index) => item.classList.toggle('is-active', index === active));
  };

  const formatStoryStep = new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });
  const createStoryProgress = (section, name) => ({
    count: section.querySelector(`[data-${name}-count]`),
    fill: section.querySelector(`[data-${name}-fill]`),
    active: -1,
  });
  const updateStoryProgress = (ui, active, progress) => {
    if (ui.count && ui.active !== active) {
      const current = `${formatStoryStep.format(active + 1)} / ${formatStoryStep.format(3)}`;
      if (ui.count.textContent !== current) ui.count.textContent = current;
      ui.active = active;
    }
    if (ui.fill) ui.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  };

  const mobileStoryHeaderOffset = () => Math.ceil(document.querySelector('[data-header]')?.getBoundingClientRect().height || 64) + 10;
  const buildMobileStickyStory = ({ section, track, stage, states, progressUi, id, hint, onEnter }) => {
    if (!section || !track || !stage || !states.length) return;
    const headerOffset = mobileStoryHeaderOffset();
    section.style.setProperty('--mobile-story-top', `${headerOffset}px`);
    states.forEach((item, index) => {
      item.hidden = false;
      item.setAttribute('aria-hidden', String(index !== 0));
      item.classList.toggle('is-active', index === 0);
    });
    gsap.set(states, { autoAlpha: 0, y: 8 });
    gsap.set(states[0], { autoAlpha: 1, y: 0 });
    let activeIndex = 0;
    let stateTween;
    let entered = false;
    const setProgress = (progress) => {
      const active = progress < 0.3 ? 0 : progress < 0.62 ? Math.min(1, states.length - 1) : states.length - 1;
      if (active !== activeIndex) {
        const outgoing = states[activeIndex];
        const incoming = states[active];
        stateTween?.kill();
        states.forEach((item, index) => {
          item.setAttribute('aria-hidden', String(index !== active));
          item.classList.toggle('is-active', index === active);
        });
        stateTween = gsap.timeline();
        stateTween.to(outgoing, { autoAlpha: 0, y: -6, duration: 0.2, ease: 'power2.out' }, 0)
          .fromTo(incoming, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.26, ease: 'power2.out' }, 0.05);
        activeIndex = active;
      }
      updateStoryProgress(progressUi, active, progress);
      if (hint) hint.style.opacity = String(Math.max(0, 1 - progress / 0.075));
    };
    const story = ScrollTrigger.create({
      id,
      trigger: track,
      start: () => `top ${mobileStoryHeaderOffset()}px`,
      end: () => `+=${Math.max(1, track.offsetHeight - stage.offsetHeight)}`,
      invalidateOnRefresh: true,
      onEnter: (self) => { entered = true; onEnter?.(); setProgress(self.progress); },
      onEnterBack: (self) => { entered = true; setProgress(self.progress); },
      onLeaveBack: (self) => { entered = false; setProgress(self.progress); },
      onUpdate: (self) => { if (entered) setProgress(self.progress); },
    });
    const bounds = track.getBoundingClientRect();
    if (bounds.top <= window.innerHeight && bounds.bottom >= 0) {
      entered = true;
      setProgress(story.progress);
    }
  };

  const buildWbg905Scene = (profile, useStickyTrack, stickyTop) => {
    const section = document.querySelector('[data-motion-section="wbg905-story"]');
    const stage = section?.querySelector('.wbg905-product-story__stage');
    const product = stage?.querySelector('.wbg905-product-story__image');
    const callouts = [...(stage?.querySelectorAll('.wbg905-product-story__callout') || [])];
    const overview = section?.querySelector('.wbg905-product-story__overview');
    const track = section?.querySelector('[data-product-track]');
    const chapters = [...(section?.querySelectorAll('[data-product-chapter]') || [])];

    chapters.forEach((chapter, index) => {
      chapter.hidden = index !== 0;
      chapter.setAttribute('aria-hidden', String(index !== 0));
      chapter.classList.toggle('is-active', index === 0);
    });
    gsap.set(chapters, { clearProps: 'opacity,visibility,transform' });

    if (section) delete section.dataset.motionReady;
    if (section && overview && stage && product && track && useStickyTrack) {
      section.dataset.motionReady = 'true';
      section.style.setProperty('--wbg905-sticky-top', `${stickyTop}px`);
      const storyProgress = createStoryProgress(section, 'product-story');
      let currentChapter = 0;
      let chapterTimeline;
      const productPoses = [
        { at: 0, x: 0, y: 0, scale: 1.07 },
        { at: 0.28, x: -20, y: -8, scale: 1.15 },
        { at: 0.56, x: 17, y: 7, scale: 1.125 },
        { at: 0.82, x: -14, y: -7, scale: 1.155 },
        { at: 0.88, x: 0, y: 0, scale: 1.07 },
        { at: 1, x: 0, y: 0, scale: 1.07 },
      ];
      let lastBenefit = -1;
      let lastCallout = -1;
      let storyHasEnteredViewport = false;
      const turnToChapter = (nextIndex) => {
        if (!chapters[nextIndex]) return;
        if (chapterTimeline) {
          chapterTimeline.kill();
          transientAnimations.delete(chapterTimeline);
        }
        chapters.forEach((chapter, index) => {
          chapter.hidden = index !== currentChapter;
          chapter.setAttribute('aria-hidden', String(index !== currentChapter));
          chapter.classList.toggle('is-active', index === currentChapter);
        });
        gsap.set(chapters, { clearProps: 'opacity,visibility,transform' });
        if (nextIndex === currentChapter) return;

        const outgoing = chapters[currentChapter];
        const incoming = chapters[nextIndex];
        const direction = nextIndex > currentChapter ? -1 : 1;
        chapterTimeline = gsap.timeline({
          onComplete: () => {
            currentChapter = nextIndex;
            transientAnimations.delete(chapterTimeline);
            chapterTimeline = null;
          },
        });
        transientAnimations.add(chapterTimeline);
        chapterTimeline
          .to(outgoing, { autoAlpha: 0, x: direction * 22, rotationY: direction * 8, duration: 0.18, ease: 'power1.in' })
          .add(() => {
            outgoing.hidden = true;
            outgoing.setAttribute('aria-hidden', 'true');
            outgoing.classList.remove('is-active');
            incoming.hidden = false;
            incoming.setAttribute('aria-hidden', 'false');
            incoming.classList.add('is-active');
            gsap.set(incoming, { autoAlpha: 0, x: direction * -22, rotationY: direction * -8 });
          })
          .to(incoming, { autoAlpha: 1, x: 0, rotationY: 0, duration: 0.34, ease: 'power2.out' });
      };
      const update = (progress) => {
        const poseIndex = productPoses.findIndex((pose) => progress <= pose.at);
        const from = productPoses[Math.max(0, poseIndex - 1)];
        const to = productPoses[poseIndex < 0 ? productPoses.length - 1 : poseIndex];
        const segmentProgress = to.at === from.at ? 1 : Math.max(0, Math.min(1, (progress - from.at) / (to.at - from.at)));
        const easedProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
        const pose = {
          x: from.x + (to.x - from.x) * easedProgress,
          y: from.y + (to.y - from.y) * easedProgress,
          scale: from.scale + (to.scale - from.scale) * easedProgress,
        };
        section.style.setProperty('--wbg905-product-x', `${pose.x.toFixed(2)}px`);
        section.style.setProperty('--wbg905-product-y', `${pose.y.toFixed(2)}px`);
        section.style.setProperty('--wbg905-product-scale', pose.scale.toFixed(4));

        const active = progress < 0.28 ? 0 : progress < 0.56 ? 1 : 2;
        const calloutIndex = progress < 0.28 ? 0 : progress < 0.56 ? 1 : progress < 0.72 ? 2 : 3;
        if (active !== lastBenefit) {
          setActiveItem(benefits, active);
          turnToChapter(active);
          lastBenefit = active;
        }
        if (calloutIndex !== lastCallout) {
          callouts.forEach((item, index) => item.classList.toggle('is-active', index === calloutIndex));
          lastCallout = calloutIndex;
        }
        updateStoryProgress(storyProgress, active, progress);
      };
      // Observe the CSS sticky track only; this scene intentionally has no GSAP pin.
      const story = ScrollTrigger.create({
        id: 'wbg905-story',
        trigger: track,
        start: `top ${stickyTop}px`,
        end: () => `bottom ${stickyTop + overview.offsetHeight}px`,
        invalidateOnRefresh: true,
        onLeave: () => section.classList.add('is-story-released'),
        onEnter: (self) => {
          storyHasEnteredViewport = true;
          update(self.progress);
        },
        onEnterBack: (self) => {
          storyHasEnteredViewport = true;
          section.classList.remove('is-story-released');
          update(self.progress);
        },
        onLeaveBack: (self) => {
          if (storyHasEnteredViewport) update(self.progress);
          storyHasEnteredViewport = false;
          section.classList.remove('is-story-released');
        },
        onUpdate: (self) => {
          if (storyHasEnteredViewport) update(self.progress);
        },
      });
      const trackBounds = track.getBoundingClientRect();
      if (trackBounds.top < window.innerHeight && trackBounds.bottom > 0) {
        storyHasEnteredViewport = true;
        update(story.progress);
      }
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
    enterOnce(heading, { start: useStickyTrack ? 'top 14%' : 'top 76%', y: profile.y, duration: profile.reveal });
    staggerOnOwnViewport(featureGrid, features, profile, { start: useStickyTrack ? 'top 20%' : 'top 78%', imageSelector: 'img', batchMax: 2 });
    enterOnce(final, { start: 'top 82%', y: 12, duration: profile.reveal });
  };

  const buildCapabilitiesScene = (profile, canSticky, stickyTop) => {
    const section = document.querySelector('[data-motion-section="capabilities"]');
    const visual = section?.querySelector('.capabilities-section__visual');
    const overlays = [...(section?.querySelectorAll('.capabilities-section__benefits li') || [])];
    const sceneRoot = section?.querySelector('.capabilities-section__scene');
    const track = section?.querySelector('[data-workspace-track]');
    const intro = section?.querySelector('.capabilities-section__intro');

    if (section) delete section.dataset.motionReady;
    if (section && track && sceneRoot && visual && canSticky) {
      section.dataset.motionReady = 'true';
      section.style.setProperty('--workspace-sticky-top', `${stickyTop}px`);
      const storyProgress = createStoryProgress(section, 'capabilities-story');
      let hintDismissed = section.dataset.workspaceHintDismissed === 'true';
      if (hintDismissed) section.classList.add('is-story-started');
      let lastActive = -1;
      const update = (progress) => {
        const active = overlays.length
          ? (progress < 0.28 ? 0 : progress < 0.58 ? Math.min(1, overlays.length - 1) : overlays.length - 1)
          : -1;
        if (active !== lastActive) {
          setActiveItem(overlays, active);
          lastActive = active;
        }
        updateStoryProgress(storyProgress, active, progress);
        if (!hintDismissed && progress > 0.07) {
          hintDismissed = true;
          section.dataset.workspaceHintDismissed = 'true';
          section.classList.add('is-story-started');
        }
      };
      const story = ScrollTrigger.create({
        id: 'workspace-story',
        trigger: track,
        start: `top ${stickyTop}px`,
        end: () => `bottom ${stickyTop + sceneRoot.offsetHeight}px`,
        invalidateOnRefresh: true,
        onUpdate: (self) => update(self.progress),
      });
      update(story.progress);
    } else if (visual) {
      enterOnce(visual, { start: 'top 78%', y: 8, duration: profile.reveal });
      const benefits = section.querySelector('.capabilities-section__benefits');
      revealGroup(benefits, overlays, profile, { start: 'top 82%', y: 8 });
    }

    if (section && !canSticky) {
      revealSequence(intro, [
        { element: intro?.querySelector('.capabilities-section__eyebrow'), y: 10, duration: 0.4, at: 0 },
        { element: intro?.querySelector('h2'), y: profile.y, duration: profile.reveal, at: 0.08 },
        { element: intro?.querySelector(':scope > p:last-child'), y: 12, duration: profile.reveal, at: 0.2 },
      ], profile, 'top 74%');
    }

    const cards = section?.querySelector('.capabilities-section__cards');
    staggerOnOwnViewport(cards, [...(cards?.querySelectorAll('.capabilities-section__card') || [])], profile, { start: canSticky ? 'top 14%' : 'top 78%', imageSelector: 'img', batchMax: 2 });
    const process = section?.querySelector('.capabilities-section__process ol');
    revealGroup(process, [...(process?.querySelectorAll(':scope > li') || [])], profile, { start: 'top 82%', y: 10 });
  };

  const buildWbg901Progression = (profile, stickyTop) => {
    const section = document.querySelector('[data-motion-section="wbg901"]');
    const track = section?.querySelector('[data-wbg901-track]');
    const scene = section?.querySelector('[data-wbg901-scene]');
    const stage = section?.querySelector('.wbg901-product__stage');
    const image = stage?.querySelector('.wbg901-product__main-image');
    const features = [...(section?.querySelectorAll('.wbg901-product__features > li') || [])];
    if (!section || !stage) return;
    setActiveItem(features, 0);

    if (window.innerWidth >= 1024 && track && scene && features.length) {
      section.style.setProperty('--wbg901-sticky-top', `${stickyTop}px`);
      let storyHasEnteredViewport = false;
      const update = (progress) => {
        const active = Math.min(features.length - 1, Math.floor(Math.min(0.999999, Math.max(0, progress)) * features.length));
        setActiveItem(features, active);
      };
      const story = ScrollTrigger.create({
        id: 'wbg901-product-story',
        trigger: track,
        start: `top ${stickyTop}px`,
        end: () => `bottom ${stickyTop + scene.offsetHeight}px`,
        invalidateOnRefresh: true,
        onEnter: (self) => {
          storyHasEnteredViewport = true;
          update(self.progress);
        },
        onEnterBack: (self) => {
          storyHasEnteredViewport = true;
          update(self.progress);
        },
        onLeave: () => { storyHasEnteredViewport = false; },
        onLeaveBack: (self) => {
          if (storyHasEnteredViewport) update(self.progress);
          storyHasEnteredViewport = false;
        },
        onUpdate: (self) => { if (storyHasEnteredViewport) update(self.progress); },
      });
      const trackBounds = track.getBoundingClientRect();
      if (trackBounds.top < window.innerHeight && trackBounds.bottom > 0) {
        storyHasEnteredViewport = true;
        update(story.progress);
      }
    } else {
      revealMediaOnce(stage, stage, image, profile, { start: 'top 78%', fromScale: 1.025 });
      revealGroup(section.querySelector('.wbg901-product__features'), features, profile, { start: 'top 78%', y: 10 });
    }
    enterOnce(section.querySelector('.wbg901-product__intro'), { start: 'top 74%', y: profile.y, duration: profile.reveal });
    enterOnce(section.querySelector('.wbg901-product__actions'), { start: 'top 82%', y: 12, duration: profile.reveal });
  };

  const buildMobileWbg905Story = (profile) => {
    const section = document.querySelector('[data-motion-section="wbg905-story"]');
    const overview = section?.querySelector('.wbg905-product-story__overview');
    const intro = overview?.querySelector('.wbg905-product-story__intro');
    const stage = overview?.querySelector('.wbg905-product-story__stage');
    const chapters = [...(section?.querySelectorAll('[data-product-chapter]') || [])];
    const benefits = [...(section?.querySelectorAll('.wbg905-product-story__benefit') || [])];
    const storyProgress = section ? createStoryProgress(section, 'product-story') : null;
    const track = section?.querySelector('[data-product-track]');

    if (!section || !overview || !stage || !chapters.length) return;
    section.dataset.mobileMotionReady = 'true';
    chapters.forEach((chapter) => {
      chapter.hidden = false;
      chapter.setAttribute('aria-hidden', 'false');
    });

    buildMobileStickyStory({
      section,
      track,
      stage: overview,
      states: chapters,
      progressUi: storyProgress,
      id: 'wbg905-mobile-story',
      hint: section.querySelector('[data-product-story-hint]'),
    });

    const heading = section.querySelector('.wbg905-product-story__details-heading');
    mobileRevealSequence(heading?.querySelector('.wbg905-product-story__eyebrow'), [
      { element: heading?.querySelector('.wbg905-product-story__eyebrow'), y: 8, duration: 0.4, at: 0 },
      { element: heading?.querySelector('h3'), y: 18, at: 0.08 },
      { element: heading?.querySelector(':scope > p:last-child'), y: 12, at: 0.2 },
    ], profile);
    const featureGrid = section.querySelector('.wbg905-product-story__features');
    mobileStagger(featureGrid, [...(featureGrid?.querySelectorAll('.wbg905-product-story__feature') || [])], profile, { start: 'top 84%', y: 14, imageSelector: 'img', batchMax: 2 });
    const final = section.querySelector('.wbg905-product-story__final');
    mobileRevealSequence(final, [{ element: final, y: 14, duration: 0.48, at: 0 }], profile, 'top 84%');
  };

  const buildMobileProfile = (profile) => {
    const about = document.querySelector('[data-motion-section="about"]');
    if (about) {
      const content = about.querySelector('.about-shahrokh__content');
      mobileRevealSequence(content.querySelector('.about-shahrokh__meta'), [
        { element: content.querySelector('.about-shahrokh__meta'), y: 8, duration: 0.4, at: 0 },
        { element: content.querySelector('.about-shahrokh__title'), y: 18, at: 0.08 },
        { element: content.querySelector('.about-shahrokh__description'), y: 12, at: 0.2 },
        { element: content.querySelector('.about-shahrokh__cta'), y: 8, duration: 0.44, at: 0.32 },
      ], profile);
      const media = about.querySelector('.about-shahrokh__media');
      mobileRevealMedia(media, media, media?.querySelector('img'));
      const features = [...about.querySelectorAll('.about-shahrokh__features > li')];
      mobileStagger(about.querySelector('.about-shahrokh__features'), features, profile, { y: 14, batchMax: 2 });
    }

    buildMobileWbg905Story(profile);

    const solutions = document.querySelector('[data-motion-section="solutions"]');
    if (solutions) {
      const eyebrow = solutions.querySelector('.product-range__eyebrow');
      const intro = solutions.querySelector('.product-range__intro');
      mobileRevealSequence(eyebrow, [
        { element: eyebrow, y: 8, duration: 0.4, at: 0 },
        { element: intro?.querySelector('h2'), y: 18, at: 0.08 },
        { element: intro?.querySelector('.product-range__lead'), y: 12, at: 0.2 },
        { element: intro?.querySelector('.product-range__all-link'), y: 8, duration: 0.44, at: 0.32 },
      ], profile);
      const stage = solutions.querySelector('.product-range__stage');
      const picture = stage?.querySelector('picture');
      mobileRevealMedia(stage, picture, stage?.querySelector('.product-range__showcase'));
      const product = solutions.querySelector('.product-range__product-card');
      mobileStagger(product?.parentElement, product ? [product] : [], profile, { start: 'top 84%', y: 14, imageSelector: 'img', batchMax: 1 });

      const categoryHeading = solutions.querySelector('.product-range__category-heading');
      mobileRevealSequence(categoryHeading, [
        { element: categoryHeading?.querySelector('.product-range__eyebrow'), y: 8, duration: 0.4, at: 0 },
        { element: categoryHeading?.querySelector('h3'), y: 18, at: 0.08 },
        { element: categoryHeading?.querySelector(':scope > p:last-child'), y: 12, at: 0.2 },
      ], profile);
      const categories = [...solutions.querySelectorAll('.product-range__category-card')];
      mobileStagger(solutions.querySelector('.product-range__category-grid'), categories, profile, { y: 14, imageSelector: 'picture img', batchMax: 2 });
      const values = [...solutions.querySelectorAll('.product-range__values > li')];
      mobileStagger(solutions.querySelector('.product-range__values'), values, profile, { y: 12, batchMax: 2 });
    }

    const capabilities = document.querySelector('[data-motion-section="capabilities"]');
    if (capabilities) {
      capabilities.dataset.mobileMotionReady = 'true';
      const track = capabilities.querySelector('[data-workspace-track]');
      const scene = capabilities.querySelector('[data-capabilities-scene]');
      const overlays = [...capabilities.querySelectorAll('.capabilities-section__benefits li')];
      const progress = createStoryProgress(capabilities, 'capabilities-story');
      buildMobileStickyStory({
        section: capabilities,
        track,
        stage: scene,
        states: overlays,
        progressUi: progress,
        id: 'workspace-mobile-story',
        hint: capabilities.querySelector('[data-capabilities-scroll-hint]'),
        onEnter: () => {
          if (capabilities.dataset.mobileIntroRevealed === 'true') return;
          capabilities.dataset.mobileIntroRevealed = 'true';
          const intro = capabilities.querySelector('.capabilities-section__intro');
          gsap.fromTo(intro, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power2.out', clearProps: 'opacity,visibility,transform' });
        },
      });

      const cardsHeading = capabilities.querySelector('.capabilities-section__cards-heading');
      mobileRevealSequence(cardsHeading, [{ element: cardsHeading, y: 12, duration: 0.46, at: 0 }], profile);
      const cards = [...capabilities.querySelectorAll('.capabilities-section__card')];
      mobileStagger(capabilities.querySelector('.capabilities-section__cards'), cards, profile, { y: 14, imageSelector: 'img', batchMax: 2 });
      const promo = capabilities.querySelector('.capabilities-section__mobile-promo');
      mobileRevealSequence(promo, [{ element: promo, y: 12, duration: 0.46, at: 0 }], profile, 'top 84%');
      const process = capabilities.querySelector('.capabilities-section__process ol');
      mobileStagger(process, [...(process?.querySelectorAll(':scope > li') || [])], profile, { y: 12, batchMax: 2 });
    }

    const applications = document.querySelector('[data-motion-section="applications"]');
    if (applications) {
      const intro = applications.querySelector('.industry-applications__intro');
      const eyebrow = intro?.querySelector('.industry-applications__eyebrow');
      mobileRevealSequence(eyebrow, [
        { element: eyebrow, y: 8, duration: 0.4, at: 0 },
        { element: intro?.querySelector('h2'), y: 18, at: 0.08 },
        { element: intro?.querySelector(':scope > p'), y: 12, at: 0.2 },
      ], profile);
      const hero = applications.querySelector('.industry-applications__hero');
      mobileRevealMedia(hero, hero, hero?.querySelector('img'));
      const cards = [...applications.querySelectorAll('.industry-applications__card')];
      mobileStagger(applications.querySelector('.industry-applications__cards'), cards, profile, { y: 14, imageSelector: 'img', batchMax: 2 });
      const benefits = applications.querySelector('.industry-applications__benefits');
      const benefitIntro = benefits?.querySelector('.industry-applications__benefit-intro');
      mobileRevealSequence(benefitIntro, [{ element: benefitIntro, y: 12, at: 0 }], profile);
      const benefitItems = [...(benefits?.querySelectorAll('.industry-applications__benefit-list > li') || [])];
      mobileStagger(benefits?.querySelector('.industry-applications__benefit-list'), benefitItems, profile, { y: 12, batchMax: 2 });
    }

    const wbg901 = document.querySelector('[data-motion-section="wbg901"]');
    if (wbg901) {
      wbg901.dataset.mobileMotionReady = 'true';
      const intro = wbg901.querySelector('.wbg901-product__intro');
      const eyebrow = intro?.querySelector('.wbg901-product__eyebrow');
      mobileRevealSequence(eyebrow, [
        { element: eyebrow, y: 8, duration: 0.4, at: 0 },
        { element: intro?.querySelector('h2'), y: 18, at: 0.08 },
        { element: intro?.querySelector('.wbg901-product__lead'), y: 12, at: 0.2 },
      ], profile);
      const stage = wbg901.querySelector('.wbg901-product__stage');
      mobileRevealMedia(stage, stage, stage?.querySelector('.wbg901-product__main-image'), { fromScale: 0.97 });
      const features = [...wbg901.querySelectorAll('.wbg901-product__features > li')];
      mobileActivateOnCenter(features, { start: 'center 60%' });
      const actions = wbg901.querySelector('.wbg901-product__actions');
      mobileRevealSequence(actions, [{ element: actions, y: 10, duration: 0.46, at: 0 }], profile);
      const details = wbg901.querySelector('[data-wbg901-gallery]');
      if (details && !details.hidden) mobileStagger(details, [...details.children], profile, { y: 12, batchMax: 2 });
      const specs = wbg901.querySelector('[data-wbg901-specs]');
      if (specs && !specs.hidden) mobileStagger(specs, [...specs.children], profile, { y: 10, batchMax: 2 });
    }

    const brand = document.querySelector('[data-motion-section="brand"]');
    if (brand) {
      const intro = brand.querySelector('.brand-trust-about__intro');
      const eyebrow = intro?.querySelector('.brand-trust-about__eyebrow');
      mobileRevealSequence(eyebrow, [
        { element: eyebrow, y: 8, duration: 0.4, at: 0 },
        { element: intro?.querySelector('h2'), y: 18, at: 0.08 },
        { element: intro?.querySelector('.brand-trust-about__description'), y: 12, at: 0.2 },
      ], profile);
      const actions = brand.querySelector('.brand-trust-about__actions');
      mobileRevealSequence(actions, [{ element: actions, y: 10, duration: 0.44, at: 0 }], profile);
      const media = brand.querySelector('.brand-trust-about__media');
      mobileRevealMedia(media, media, media?.querySelector('img'));
      const values = [...brand.querySelectorAll('.brand-trust-about__values > li')];
      mobileStagger(brand.querySelector('.brand-trust-about__values'), values, profile, { y: 14, batchMax: 2 });
    }

    const footer = document.querySelector('[data-motion-section="footer"]');
    if (footer) {
      const banner = footer.querySelector('.site-footer__banner');
      mobileRevealSequence(banner, [{ element: banner, y: 14, duration: 0.48, at: 0 }], profile, 'top 84%');
      const columns = [...footer.querySelectorAll('.site-footer__columns > .site-footer__column')];
      mobileStagger(footer.querySelector('.site-footer__columns'), columns, profile, { start: 'top 86%', y: 10, batchMax: 2 });
    }
  };

  const buildProfile = (profile, { desktop = false, wideDesktop = false, stickyTop } = {}) => {
    if (window.innerWidth <= 767) {
      buildMobileProfile(profile);
      return;
    }
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

    buildWbg905Scene(profile, wideDesktop, stickyTop);

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

    buildCapabilitiesScene(profile, desktop, stickyTop);

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

    buildWbg901Progression(profile, stickyTop);

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

  const initializeMotion = () => {
    motionMatchMedia = gsap.matchMedia();
    motionProfiles.forEach((profile) => {
      motionMatchMedia.add(profile.query, () => {
        const width = window.innerWidth;
        const stickyTop = stickyOffset();
        buildProfile(profile, { desktop: width >= 1024, wideDesktop: width >= 1200, stickyTop });
        return () => {
          killTransientAnimations();
          disconnectMobileObservers();
          document.querySelectorAll('[data-motion-section][data-motion-ready="true"]').forEach((section) => {
            delete section.dataset.motionReady;
          });
          document.querySelectorAll('[data-motion-section][data-mobile-motion-ready="true"]').forEach((section) => {
            delete section.dataset.mobileMotionReady;
          });
          document.querySelectorAll('[data-motion-section="wbg905-story"] .is-active, [data-motion-section="capabilities"] .is-active, [data-motion-section="wbg901"] .is-active').forEach((item) => {
            item.classList.remove('is-active');
          });
          const wbg905 = document.querySelector('[data-motion-section="wbg905-story"]');
          wbg905?.classList.remove('is-story-released');
          wbg905?.style.removeProperty('--mobile-story-top');
          wbg905?.querySelector('[data-product-story-hint]')?.style.removeProperty('opacity');
          const productChapters = [...(wbg905?.querySelectorAll('[data-product-chapter]') || [])];
          productChapters.forEach((chapter, index) => {
            chapter.hidden = index !== 0;
            chapter.setAttribute('aria-hidden', String(index !== 0));
            chapter.classList.toggle('is-active', index === 0);
          });
          gsap.set(productChapters, { clearProps: 'opacity,visibility,transform' });
          wbg905?.style.removeProperty('--wbg905-sticky-top');
          wbg905?.style.removeProperty('--wbg905-product-x');
          wbg905?.style.removeProperty('--wbg905-product-y');
          wbg905?.style.removeProperty('--wbg905-product-scale');
          const capabilities = document.querySelector('[data-motion-section="capabilities"]');
          capabilities?.classList.toggle('is-story-started', capabilities?.dataset.workspaceHintDismissed === 'true');
          capabilities?.style.removeProperty('--workspace-sticky-top');
          capabilities?.style.removeProperty('--mobile-story-top');
          capabilities?.querySelector('[data-capabilities-scroll-hint]')?.style.removeProperty('opacity');
          delete capabilities?.dataset.mobileIntroRevealed;
          const workspaceStates = [...(capabilities?.querySelectorAll('.capabilities-section__benefits li') || [])];
          workspaceStates.forEach((item) => item.setAttribute('aria-hidden', 'false'));
          gsap.set(workspaceStates, { clearProps: 'opacity,visibility,transform' });
          const wbg901 = document.querySelector('[data-motion-section="wbg901"]');
          const wbg901Features = [...(wbg901?.querySelectorAll('.wbg901-product__features > li') || [])];
          setActiveItem(wbg901Features, 0);
          wbg901?.style.removeProperty('--wbg901-sticky-top');
        };
      });
    });
    motionMatchMedia.add('(max-width: 767px) and (prefers-reduced-motion: reduce)', () => {
      const section = document.querySelector('[data-motion-section="wbg905-story"]');
      const chapters = [...(section?.querySelectorAll('[data-product-chapter]') || [])];
      if (section) section.dataset.mobileMotionReady = 'true';
      chapters.forEach((chapter) => {
        chapter.hidden = false;
        chapter.setAttribute('aria-hidden', 'false');
      });
      return () => {
        if (section) delete section.dataset.mobileMotionReady;
        chapters.forEach((chapter, index) => {
          chapter.hidden = index !== 0;
          chapter.setAttribute('aria-hidden', String(index !== 0));
        });
      };
    });

    // All image boxes have intrinsic dimensions and font metrics are now ready.
    // Refresh only at scene initialization, never from load/font callbacks mid-scroll.
    ScrollTrigger.refresh();

    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      motionMatchMedia?.revert();
      killTransientAnimations();
      disconnectMobileObservers();
      preloadObserver?.disconnect();
      playbackObserver?.disconnect();
    });

  // Loading may begin near the viewport; playback is governed by a separate
  // zero-margin observer so no visible motion starts while media is offscreen.
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const videoHosts = [...document.querySelectorAll('[data-motion-video][data-video-src]')];
    if (!videoHosts.length) return;

    playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target: host, isIntersecting, intersectionRatio }) => {
        const video = host.__motionVideo;
        if (!video) return;
        const active = isIntersecting && intersectionRatio >= 0.55;
        host.dataset.videoActive = String(active);
        if (active) video.play().then(() => host.classList.add('has-motion-video')).catch(() => {});
        else video.pause();
      });
    }, { rootMargin: '0px', threshold: [0, 0.1, 0.55, 0.75] });

    preloadObserver = new IntersectionObserver((entries) => {
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
  };

  if (window.matchMedia('(max-width: 767px)').matches) {
    initializeMotion();
    if (document.fonts?.status === 'loading') {
      document.fonts.ready.then(() => {
        if (window.scrollY <= 1) ScrollTrigger.refresh();
      });
    }
  } else if (document.fonts?.ready) document.fonts.ready.then(initializeMotion, initializeMotion);
  else initializeMotion();
})();
