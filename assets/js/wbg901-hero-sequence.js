(() => {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  // This flag prevents the former Hero interaction in animations.js from
  // attaching a second scroll controller. Other section animations remain.
  window.__wbg901HeroSequenceActive = true;

  const canvas = hero.querySelector('[data-hero-canvas]');
  const fallback = hero.querySelector('.hero-product-fallback');
  const panels = [...hero.querySelectorAll('[data-hero-panel]')];
  const progressList = hero.querySelector('[data-hero-progress]');
  const steps = [...hero.querySelectorAll('[data-hero-step]')];
  const context = canvas?.getContext('2d', { alpha: true, desynchronized: true });
  if (!canvas || !fallback || !context || panels.length !== 4) return;

  // Alpha bounds measured once from the shipped WebP frames (alpha > 4%,
  // approximately 10/255). Cropping is draw-only; originals stay untouched.
  // The list is a verified rotation manifest, never a filename sort.
  const orderedFrames = [
    [10, 83, 85, 563, 546], [11, 85, 83, 535, 555],
    [12, 102, 78, 517, 582], [13, 128, 74, 494, 604],
    [14, 165, 69, 442, 621], [15, 212, 65, 359, 631],
    [16, 235, 62, 281, 632], [17, 164, 61, 336, 638],
    [18, 107, 60, 445, 643], [19, 71, 62, 524, 637],
    [20, 58, 63, 567, 625], [21, 66, 65, 573, 605],
    [22, 91, 69, 543, 578], [23, 88, 68, 536, 589],
    [0, 86, 65, 538, 615], [1, 103, 63, 503, 635],
    [2, 134, 63, 444, 646], [3, 176, 62, 355, 649],
    [4, 224, 63, 244, 641], [5, 167, 65, 333, 639],
    [6, 113, 68, 442, 635], [7, 80, 72, 520, 622],
    [8, 68, 76, 565, 601], [9, 77, 81, 572, 575],
  ].map(([sourceIndex, x, y, width, height]) => ({
    sourceIndex,
    x,
    y,
    width,
    height,
    url: `assets/images/products/wbg901/sequence/0_${sourceIndex}.webp`,
  }));
  const frameCount = orderedFrames.length;
  const frameOrder = orderedFrames.map(({ sourceIndex }) => sourceIndex);
  const frameBySource = new Map(orderedFrames.map((frame) => [frame.sourceIndex, frame]));
  const frameTargets = [0, 8, 15, 23];
  const frameImages = new Array(frameCount);
  const frameLoads = new Array(frameCount);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wheelThreshold = 48;
  const swipeThreshold = 56;
  const animationDuration = 780;
  const quietPeriod = 280;
  const visibleHeightRatio = window.matchMedia('(max-width: 899px)').matches ? 1 : 0.82;

  let heroTop = window.scrollY + hero.getBoundingClientRect().top;
  let stageIndex = !prefersReducedMotion && window.scrollY > heroTop + 2 ? 3 : 0;
  let currentOrderIndex = frameTargets[stageIndex];
  let requestedOrderIndex = currentOrderIndex;
  let renderedOrderIndex = -1;
  let lastScrollY = window.scrollY;
  let internalLock = !prefersReducedMotion && window.scrollY <= heroTop + 2;
  let sequenceReady = false;
  let transitioning = false;
  let gestureArmed = true;
  let wheelRemainder = 0;
  let lastInputAt = 0;
  let quietTimer = 0;
  let drawRaf = 0;
  let transitionRaf = 0;
  let transitionToken = 0;
  let touchStartY = null;
  let touchEndY = null;
  let touchStartedLocked = false;
  let touchReleasedNatively = false;

  const now = () => performance.now();

  function loadFrame(sourceIndex) {
    if (frameLoads[sourceIndex]) return frameLoads[sourceIndex];

    const image = new Image();
    image.decoding = 'async';
    frameLoads[sourceIndex] = new Promise((resolve, reject) => {
      image.onload = async () => {
        try {
          if (typeof image.decode === 'function') await image.decode();
        } catch {
          // A successfully loaded image remains drawable if decode() rejects.
        }
        if (!image.naturalWidth) {
          reject(new Error(`WBG901 frame ${sourceIndex} has no decoded pixels`));
          return;
        }
        frameImages[sourceIndex] = image;
        resolve(image);
        if (frameOrder[requestedOrderIndex] === sourceIndex) scheduleDraw(requestedOrderIndex);
      };
      image.onerror = () => {
        const error = new Error(`Unable to load WBG901 frame ${sourceIndex}`);
        if (window.location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
          console.warn(error);
        }
        reject(error);
      };
      image.src = frameBySource.get(sourceIndex).url;
    });
    return frameLoads[sourceIndex];
  }

  function loadRange(fromOrderIndex, toOrderIndex) {
    const low = Math.min(fromOrderIndex, toOrderIndex);
    const high = Math.max(fromOrderIndex, toOrderIndex);
    const loads = [];
    for (let orderIndex = low; orderIndex <= high; orderIndex += 1) {
      loads.push(loadFrame(frameOrder[orderIndex]));
    }
    return Promise.allSettled(loads);
  }

  function nearestLoadedOrderIndex(orderIndex) {
    for (let distance = 0; distance < frameCount; distance += 1) {
      const after = orderIndex + distance;
      const before = orderIndex - distance;
      if (after < frameCount && frameImages[frameOrder[after]]) return after;
      if (before >= 0 && frameImages[frameOrder[before]]) return before;
    }
    return -1;
  }

  function paintFrame(orderIndex) {
    const actualOrderIndex = frameImages[frameOrder[orderIndex]] ? orderIndex : nearestLoadedOrderIndex(orderIndex);
    if (actualOrderIndex < 0 || renderedOrderIndex === actualOrderIndex) return;
    const frame = orderedFrames[actualOrderIndex];
    const image = frameImages[frame.sourceIndex];

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    // Keep every visible product the same height and align its feet to one
    // baseline. Side-view width remains naturally narrow.
    const scale = Math.min(
      (height * visibleHeightRatio) / frame.height,
      (width * 0.92) / frame.width,
    );
    const drawWidth = frame.width * scale;
    const drawHeight = frame.height * scale;
    const drawX = (width - drawWidth) / 2;
    const drawY = height * 0.965 - drawHeight;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, frame.x, frame.y, frame.width, frame.height, drawX, drawY, drawWidth, drawHeight);

    renderedOrderIndex = actualOrderIndex;
    currentOrderIndex = actualOrderIndex;
    canvas.dataset.frame = String(frame.sourceIndex);
    hero.classList.add('has-sequence-ready');
  }

  function scheduleDraw(orderIndex) {
    requestedOrderIndex = orderIndex;
    if (drawRaf) return;
    drawRaf = window.requestAnimationFrame(() => {
      drawRaf = 0;
      paintFrame(requestedOrderIndex);
    });
  }

  function setStage(nextStage) {
    stageIndex = Math.max(0, Math.min(3, nextStage));
    panels.forEach((panel, index) => {
      panel.classList.remove('is-leaving');
      const active = index === stageIndex;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
    });
    steps.forEach((step, index) => {
      const active = index + 1 === stageIndex;
      step.classList.toggle('is-active', active);
      if (active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    if (progressList) progressList.dataset.activeStep = String(stageIndex);
  }

  function cancelQuietTimer() {
    if (quietTimer) window.clearTimeout(quietTimer);
    quietTimer = 0;
  }

  function markInput() {
    lastInputAt = now();
    cancelQuietTimer();
    quietTimer = window.setTimeout(() => {
      quietTimer = 0;
      const elapsed = now() - lastInputAt;
      if (elapsed < quietPeriod) {
        quietTimer = window.setTimeout(() => {
          quietTimer = 0;
          if (internalLock && !transitioning) {
            gestureArmed = true;
            wheelRemainder = 0;
          }
        }, quietPeriod - elapsed);
        return;
      }
      if (internalLock && !transitioning) {
        gestureArmed = true;
        wheelRemainder = 0;
      }
    }, quietPeriod);
  }

  function setFinalStageAndLock() {
    internalLock = true;
    gestureArmed = false;
    wheelRemainder = 0;
    markInput();
    if (sequenceReady && stageIndex !== 3) {
      animateToStage(3);
      return;
    }
    setStage(3);
    const target = frameTargets[3];
    if (frameImages[frameOrder[target]]) scheduleDraw(target);
    else loadRange(currentOrderIndex, target).then(() => scheduleDraw(target)).catch(() => {});
  }

  function releaseLock() {
    internalLock = false;
    gestureArmed = false;
    wheelRemainder = 0;
    cancelQuietTimer();
    lastInputAt = now();
  }

  function animateToStage(nextStage) {
    if (transitioning || !sequenceReady || nextStage < 0 || nextStage > 3) return;
    if (nextStage === stageIndex) return;

    const previousStage = stageIndex;
    const from = frameTargets[previousStage];
    const to = frameTargets[nextStage];
    const token = ++transitionToken;
    transitioning = true;
    gestureArmed = false;
    wheelRemainder = 0;
    panels[previousStage]?.classList.add('is-leaving');
    markInput();

    loadRange(from, to).then(() => {
      if (token !== transitionToken) return;
      const startedAt = now();
      let storyActivated = false;

      const animate = (timestamp) => {
        if (token !== transitionToken) return;
        const progress = Math.min(1, (timestamp - startedAt) / animationDuration);
        const orderIndex = Math.round(from + (to - from) * progress);
        paintFrame(orderIndex);
        // Let the rotation lead while beginning the next story copy at 60%.
        // The outgoing panel remains as a quiet visual bridge until then.
        if (!storyActivated && progress >= 0.60) {
          storyActivated = true;
          setStage(nextStage);
        }
        if (progress < 1) {
          transitionRaf = window.requestAnimationFrame(animate);
          return;
        }
        if (!storyActivated) setStage(nextStage);
        paintFrame(to);
        currentOrderIndex = to;
        transitionRaf = 0;
        transitioning = false;
        const remainingQuiet = Math.max(0, quietPeriod - (now() - lastInputAt));
        window.setTimeout(() => {
          if (internalLock && !transitioning && now() - lastInputAt >= quietPeriod) {
            gestureArmed = true;
            wheelRemainder = 0;
          }
        }, remainingQuiet);
      };

      transitionRaf = window.requestAnimationFrame(animate);
    });
  }

  function moveOneStage(direction) {
    if (direction > 0 && stageIndex === 3) {
      releaseLock();
      return;
    }
    const nextStage = stageIndex + direction;
    if (nextStage >= 0 && nextStage <= 3) animateToStage(nextStage);
  }

  function normalizeWheelDelta(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  function onWheel(event) {
    const delta = normalizeWheelDelta(event);
    if (!delta) return;

    if (!internalLock) {
      const currentY = window.scrollY;
      if (delta < 0 && currentY > heroTop + 2 && currentY + delta <= heroTop + 2) {
        event.preventDefault();
        window.scrollTo({ top: heroTop, behavior: 'instant' });
        setFinalStageAndLock();
        lastScrollY = heroTop;
      }
      return;
    }

    const candidate = wheelRemainder + delta;
    const crossesThreshold = Math.abs(candidate) >= wheelThreshold;
    const direction = Math.sign(candidate);

    // The first deliberate down gesture after stage 3 is the native-scroll
    // release. Let this event reach the browser; do not reinterpret its size.
    if (gestureArmed && !transitioning && sequenceReady && stageIndex === 3 && crossesThreshold && direction > 0) {
      wheelRemainder = 0;
      releaseLock();
      return;
    }

    event.preventDefault();
    markInput();
    if (!gestureArmed || transitioning || !sequenceReady) return;

    if (Math.sign(wheelRemainder) && Math.sign(wheelRemainder) !== Math.sign(delta)) wheelRemainder = 0;
    wheelRemainder += delta;
    if (Math.abs(wheelRemainder) < wheelThreshold) return;

    const stepDirection = Math.sign(wheelRemainder);
    wheelRemainder = 0;
    moveOneStage(stepDirection);
  }

  function onTouchStart(event) {
    if (event.touches.length !== 1) {
      touchStartY = null;
      touchStartedLocked = false;
      return;
    }
    touchStartY = event.touches[0].clientY;
    touchEndY = touchStartY;
    touchStartedLocked = internalLock;
    touchReleasedNatively = false;
  }

  function onTouchMove(event) {
    if (!touchStartedLocked || !internalLock || event.touches.length !== 1 || touchStartY === null) return;
    touchEndY = event.touches[0].clientY;
    const pageDownDistance = touchStartY - touchEndY;

    // At the last stage, a downward swipe releases native page scrolling.
    // Leave the touch sequence uncancelled so the browser can carry it on.
    if (stageIndex === 3 && pageDownDistance > 12) {
      touchReleasedNatively = true;
      releaseLock();
      markInput();
      return;
    }

    event.preventDefault();
  }

  function onTouchEnd() {
    if (touchStartY === null) return;
    const delta = touchStartY - touchEndY;
    const wasLocked = touchStartedLocked;
    touchStartY = null;
    touchEndY = null;
    touchStartedLocked = false;
    if (!wasLocked || touchReleasedNatively || !internalLock) return;

    if (stageIndex === 3 && delta >= swipeThreshold) {
      releaseLock();
      markInput();
      window.scrollBy({ top: Math.min(Math.max(delta, 120), window.innerHeight * 0.42), behavior: 'instant' });
      return;
    }

    markInput();
    if (!gestureArmed || transitioning || !sequenceReady || Math.abs(delta) < swipeThreshold) return;
    moveOneStage(delta > 0 ? 1 : -1);
  }

  function isEditableTarget(target) {
    return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
  }

  function onKeyDown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isEditableTarget(event.target)) return;
    if (event.key === 'Escape' && internalLock) {
      event.preventDefault();
      releaseLock();
      return;
    }
    if (!internalLock || !['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp'].includes(event.key)) return;

    const direction = event.key === 'ArrowDown' || event.key === 'PageDown' ? 1 : -1;
    if (direction > 0 && stageIndex === 3 && gestureArmed && !transitioning) {
      releaseLock();
      return;
    }
    event.preventDefault();
    markInput();
    if (event.repeat || !gestureArmed || transitioning || !sequenceReady) return;
    moveOneStage(direction);
  }

  function onScroll() {
    const currentY = window.scrollY;
    if (internalLock && Math.abs(currentY - heroTop) > 2) {
      window.scrollTo({ top: heroTop, behavior: 'instant' });
      lastScrollY = heroTop;
      return;
    }
    if (!internalLock && !prefersReducedMotion && lastScrollY > heroTop + 8 && currentY <= heroTop + 1) {
      setFinalStageAndLock();
    }
    lastScrollY = currentY;
  }

  let resizeTimer = 0;
  let lastCanvasWidth = canvas.clientWidth;
  let lastCanvasHeight = canvas.clientHeight;
  let lastDpr = window.devicePixelRatio || 1;
  function onResize() {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = 0;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const meaningfulChange = Math.abs(width - lastCanvasWidth) >= 24
        || Math.abs(height - lastCanvasHeight) >= 24
        || dpr !== lastDpr;
      if (!meaningfulChange) return;
      lastCanvasWidth = width;
      lastCanvasHeight = height;
      lastDpr = dpr;
      heroTop = window.scrollY + hero.getBoundingClientRect().top;
      lastScrollY = window.scrollY;
      renderedOrderIndex = -1;
      if (frameImages[frameOrder[requestedOrderIndex]]) scheduleDraw(requestedOrderIndex);
    }, 180);
  }

  // Decode the first real frame before requesting any transition frames. The
  // matching eager <img> remains visible underneath until the canvas is ready.
  const firstFrameReady = loadFrame(frameOrder[0]).then(() => {
    if (stageIndex === 0) scheduleDraw(frameTargets[0]);
    setStage(stageIndex);
  });
  const initialRangeReady = firstFrameReady.then(async () => {
    if (!prefersReducedMotion) {
      // Prioritize the first user-facing transition, then any later stage
      // needed to restore a page opened below the Hero.
      await loadRange(frameTargets[0], frameTargets[1]);
      if (stageIndex === 3) {
        await loadRange(frameTargets[1], frameTargets[2]);
        await loadRange(frameTargets[2], frameTargets[3]);
      }
    }
    sequenceReady = true;
    currentOrderIndex = frameTargets[stageIndex];
    scheduleDraw(currentOrderIndex);
    setStage(stageIndex);
  }).catch(() => {
    sequenceReady = false;
    internalLock = false;
    setStage(0);
    hero.classList.add('has-sequence-error');
  });

  if (!prefersReducedMotion) {
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, { passive: true });

    hero.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', () => {
        if (internalLock) releaseLock();
      });
    });
  } else {
    hero.classList.add('is-reduced-motion');
  }

  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);
    window.addEventListener('pagehide', () => resizeObserver.disconnect(), { once: true });
  } else {
    window.addEventListener('resize', onResize, { passive: true });
  }
  window.addEventListener('orientationchange', onResize, { passive: true });

  // Load the rest off the interaction path. The first complete transition is
  // already decoded before the controller reports sequenceReady.
  if (!prefersReducedMotion) {
    initialRangeReady.then(async () => {
      // Stage 1→2 and 2→3 ranges are decoded ahead of the next deliberate input.
      await Promise.allSettled([loadRange(frameTargets[1], frameTargets[2])]);
      await Promise.allSettled([loadRange(frameTargets[2], frameTargets[3])]);
    });
  }
})();
