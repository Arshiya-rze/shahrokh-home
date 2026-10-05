(() => {
  const hero = document.querySelector("[data-hero]");
  const { gsap, ScrollTrigger, Observer } = window;

  if (!hero || !gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  if (Observer) gsap.registerPlugin(Observer);

  const header = document.querySelector("[data-header]");
  const progressList = hero.querySelector("[data-hero-progress]");
  const steps = gsap.utils.toArray("[data-hero-step]", hero);
  const labels = steps.map((step) => step.querySelector(".hero-stepper__label"));
  const title = hero.querySelector("[data-hero-title]");
  const description = hero.querySelector("[data-hero-description]");
  const actions = hero.querySelector("[data-hero-actions]");
  const product = hero.querySelector("[data-hero-product]");
  const featureBar = hero.querySelector("[data-hero-features]");
  const cue = hero.querySelector("[data-hero-cue]");

  let currentHeroState = 0;
  let isAnimating = false;
  let gestureArmed = true;
  let gestureEnded = true;
  let storyExited = false;
  let storyObserver;
  let boundaryObserver;
  let storyTrigger;
  let gestureArmTimer;

  const productScales = [1, 1.035, 1.055, 1.07];
  const transitionDuration = 0.74;

  function setProgressState(state) {
    if (progressList) progressList.dataset.activeStep = String(state);

    steps.forEach((step, index) => {
      const active = index + 1 === state;
      step.classList.toggle("is-active", active);
      if (active) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  }

  function setInitialStoryVisuals() {
    currentHeroState = 0;
    hero.dataset.state = "0";
    setProgressState(0);
    gsap.set(labels, { autoAlpha: 0, y: 8 });
    gsap.set(product, { scale: 1, transformOrigin: "38% 55%" });
    gsap.set([title, featureBar, cue], { autoAlpha: 1, y: 0 });
    gsap.set([description, actions], { autoAlpha: 1, y: 0 });
  }

  function showHeroState(state) {
    gsap.set(labels, { autoAlpha: 0, y: 8 });
    if (state > 0 && labels[state - 1]) gsap.set(labels[state - 1], { autoAlpha: 1, y: 0 });
    gsap.set(product, { scale: productScales[state], transformOrigin: "38% 55%" });
    gsap.set(title, { autoAlpha: state === 0 ? 1 : 0.12, y: state === 0 ? 0 : -4 });
    gsap.set([description, actions, featureBar, cue], {
      autoAlpha: state === 0 ? 1 : 0,
      y: state === 0 ? 0 : 5,
    });
  }

  function scheduleGestureRearm(delay = 0.42) {
    gestureArmTimer?.kill();
    gestureArmTimer = gsap.delayedCall(delay, () => {
      gestureEnded = true;
      if (!isAnimating && !storyExited) gestureArmed = true;
    });
  }

  function markGestureEnded() {
    gestureEnded = true;
    scheduleGestureRearm();
  }

  function finishTransition() {
    isAnimating = false;
    if (gestureEnded && !storyExited) gestureArmed = true;
  }

  function goToHeroState(nextState) {
    const clampedState = gsap.utils.clamp(0, 3, nextState);
    if (isAnimating || clampedState === currentHeroState) return;

    const previousState = currentHeroState;
    currentHeroState = clampedState;
    hero.dataset.state = String(clampedState);
    setProgressState(clampedState);
    isAnimating = true;

    const timeline = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: finishTransition,
    });

    if (previousState > 0 && labels[previousState - 1]) {
      timeline.to(labels[previousState - 1], {
        autoAlpha: 0,
        y: -5,
        duration: transitionDuration * 0.42,
      }, 0);
    }

    if (clampedState > 0 && labels[clampedState - 1]) {
      timeline.fromTo(
        labels[clampedState - 1],
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: transitionDuration * 0.62 },
        transitionDuration * 0.28,
      );
    }

    timeline.to(product, {
      scale: productScales[clampedState],
      duration: transitionDuration,
    }, 0);

    timeline.to(title, {
      autoAlpha: clampedState === 0 ? 1 : 0.12,
      y: clampedState === 0 ? 0 : -4,
      duration: transitionDuration * 0.72,
    }, 0);

    timeline.to([description, actions], {
      autoAlpha: clampedState === 0 ? 1 : 0,
      y: clampedState === 0 ? 0 : 5,
      duration: transitionDuration * 0.58,
      stagger: 0.035,
    }, 0);

    timeline.to([featureBar, cue], {
      autoAlpha: clampedState === 0 ? 1 : 0,
      y: clampedState === 0 ? 0 : 4,
      duration: transitionDuration * 0.58,
      stagger: 0.025,
    }, 0);
  }

  function exitHeroStory() {
    if (isAnimating || storyExited) return;

    isAnimating = true;
    gestureArmed = false;
    const exitTimeline = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        storyExited = true;
        isAnimating = false;
        storyObserver?.disable();

        if (storyTrigger) {
          window.scrollTo({ top: storyTrigger.end, behavior: "smooth" });
        }
      },
    });

    exitTimeline.to(labels[2], { autoAlpha: 0, y: -5, duration: 0.36 }, 0);
    exitTimeline.to([title, description, actions, featureBar, cue], {
      autoAlpha: 0,
      duration: 0.5,
      stagger: 0.025,
    }, 0);
    exitTimeline.to(product, { scale: productScales[3], duration: 0.6 }, 0);
  }

  function handleStoryGesture(direction) {
    if (isAnimating || storyExited || !gestureArmed) {
      if (!storyExited) {
        gestureEnded = false;
        scheduleGestureRearm();
      }
      return;
    }

    gestureArmed = false;
    gestureEnded = false;

    if (direction > 0) {
      if (currentHeroState < 3) goToHeroState(currentHeroState + 1);
      else exitHeroStory();
      return;
    }

    if (currentHeroState > 0) {
      goToHeroState(currentHeroState - 1);
      return;
    }

    // The current Hero is the first page section; keep the top edge native-safe.
    gestureEnded = true;
    gestureArmed = true;
  }

  function forwardPageGesture(observer, direction) {
    const rawDelta = Number(observer.event?.deltaY);
    const accumulatedDelta = Number(observer.deltaY);
    const distance = Math.max(
      24,
      Math.abs(Number.isFinite(rawDelta) && rawDelta ? rawDelta : accumulatedDelta || 0),
    );
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollBy(0, direction * distance);
    root.style.scrollBehavior = previousScrollBehavior;
  }

  function initPersistentHeader() {
    if (!header) return () => {};

    const headerTrigger = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      onEnter: () => header.classList.remove("is-sticky-context"),
      onLeave: () => header.classList.add("is-sticky-context"),
      onEnterBack: () => header.classList.remove("is-sticky-context"),
      onLeaveBack: () => header.classList.remove("is-sticky-context"),
    });

    return () => headerTrigger.kill();
  }

  function initHeroIntro() {
    const label = hero.querySelector("[data-hero-label]");
    const redRule = label?.querySelector("i");
    const kicker = hero.querySelector("[data-hero-kicker]");
    const titleLines = gsap.utils.toArray("[data-hero-title-line]", hero);
    const background = hero.querySelector("[data-hero-background]");
    const actionItems = actions ? Array.from(actions.children) : [];

    const intro = gsap.timeline({ defaults: { ease: "power2.out" } });

    if (header) {
      intro.fromTo(header, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 0);
    }
    if (label) {
      intro.fromTo(label, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.38 }, 0.12);
    }
    if (redRule) {
      intro.fromTo(redRule, { scaleX: 0, transformOrigin: "right center" }, {
        scaleX: 1, duration: 0.36, ease: "power2.inOut",
      }, 0.2);
    }
    if (kicker) {
      intro.fromTo(kicker, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.38 }, 0.18);
    }
    if (titleLines.length) {
      intro.fromTo(titleLines, { autoAlpha: 0, y: 32 }, {
        autoAlpha: 1, y: 0, duration: 0.52, stagger: 0.12, ease: "power3.out",
      }, 0.28);
    }
    if (description) {
      intro.fromTo(description, { autoAlpha: 0, y: 16 }, {
        autoAlpha: 1, y: 0, duration: 0.42,
      }, 0.8);
    }
    if (actionItems.length) {
      intro.fromTo(actionItems, { autoAlpha: 0, y: 12 }, {
        autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.1,
      }, 1.02);
    }
    if (background) {
      intro.fromTo(background, { autoAlpha: 0, scale: 1.025, y: 10 }, {
        autoAlpha: 1, scale: 1, y: 0, duration: 0.82, ease: "power2.out",
      }, 0.34);
    }
    if (featureBar) {
      intro.fromTo(featureBar, { autoAlpha: 0, y: 10 }, {
        autoAlpha: 1, y: 0, duration: 0.42,
      }, 1.18);
    }
    if (cue) {
      intro.fromTo(cue, { autoAlpha: 0, y: 8 }, {
        autoAlpha: 1, y: 0, duration: 0.36,
      }, 1.24);
    }

    return intro;
  }

  function initHeroStepController() {
    if (!Observer) return () => {};

    setInitialStoryVisuals();

    storyObserver = Observer.create({
      type: "wheel,touch",
      target: window,
      preventDefault: true,
      tolerance: 55,
      onStopDelay: 0.4,
      onDown: () => handleStoryGesture(1),
      onUp: () => handleStoryGesture(-1),
      onStop: markGestureEnded,
    });
    storyObserver.disable();

    boundaryObserver = Observer.create({
      type: "wheel,touch",
      target: window,
      preventDefault: true,
      tolerance: 1,
      onStopDelay: 0.35,
      onDown: (observer) => {
        if (!isAnimating && storyExited) forwardPageGesture(observer, 1);
      },
      onUp: (observer) => {
        if (!isAnimating && storyExited) forwardPageGesture(observer, -1);
      },
      onStop: markGestureEnded,
    });
    boundaryObserver.disable();

    storyTrigger = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      pin: true,
      pinSpacing: false,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => {
        if (!storyExited) {
          header?.classList.remove("is-sticky-context");
          boundaryObserver.disable();
          gestureArmed = true;
          storyObserver.enable();
        }
      },
      onLeave: () => {
        if (storyExited) {
          header?.classList.add("is-sticky-context");
          storyObserver.disable();
          boundaryObserver.enable();
        }
      },
      onEnterBack: () => {
        storyExited = false;
        currentHeroState = 3;
        hero.dataset.state = "3";
        setProgressState(3);
        showHeroState(3);
        header?.classList.remove("is-sticky-context");
        boundaryObserver.disable();
        gestureArmed = false;
        gestureEnded = false;
        storyObserver.enable();
        scheduleGestureRearm(0.5);
      },
      onLeaveBack: () => {
        if (currentHeroState === 0) {
          storyObserver.disable();
          header?.classList.remove("is-sticky-context");
        }
      },
    });

    if (ScrollTrigger.isInViewport(hero, 0.99)) storyObserver.enable();

    return () => {
      storyObserver?.kill();
      boundaryObserver?.kill();
      storyTrigger?.kill();
      gestureArmTimer?.kill();
      storyObserver = undefined;
      boundaryObserver = undefined;
      storyTrigger = undefined;
      storyExited = false;
      isAnimating = false;
      gestureArmed = true;
      setInitialStoryVisuals();
    };
  }

  function initSectionReveals() {
    gsap.utils
      .toArray(
        ".brand-intro__body,.ecosystem__head,.capabilities__intro,.detail-story__copy,.final-cta__inner",
      )
      .forEach((block) => {
        gsap.from(block, {
          y: 42,
          autoAlpha: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: block, start: "top 78%" },
        });
      });

    gsap.utils.toArray(".product-line,.capability").forEach((item, index) => {
      gsap.from(item, {
        y: 24,
        autoAlpha: 0,
        duration: 0.65,
        delay: (index % 4) * 0.06,
        ease: "power2.out",
        scrollTrigger: { trigger: item, start: "top 88%" },
      });
    });

    gsap.utils.toArray(".motion-frame,.detail-story__media").forEach((media) => {
      gsap.from(media, {
        scale: 0.94,
        autoAlpha: 0,
        duration: 1,
        scrollTrigger: { trigger: media, start: "top 82%" },
      });
    });

    const sectionMedia = gsap.matchMedia();
    sectionMedia.add("(min-width: 700px)", () => {
      const panels = gsap.utils.toArray(".story-panel");
      const story = gsap.timeline({
        scrollTrigger: {
          trigger: ".wbg-story",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
        },
      });

      story.to(".story-media .product-drawing", {
        scale: 1.16,
        x: -38,
        duration: 1,
        ease: "none",
      });

      panels.forEach((panel, index) => {
        story
          .to(panel, { autoAlpha: 1, duration: 0.22 }, index === 0 ? 0 : 0.42 + index * 0.56)
          .to(
            panel,
            { autoAlpha: index === panels.length - 1 ? 1 : 0.28, duration: 0.18 },
            index === panels.length - 1 ? "+=0.35" : "+=0.42",
          );
      });

      story.to(".story-progress span", { width: "100%", duration: 1, ease: "none" }, 0);
    });

    return () => sectionMedia.revert();
  }

  const motionQueries = gsap.matchMedia();

  motionQueries.add("(prefers-reduced-motion: no-preference)", () => {
    setInitialStoryVisuals();
    initHeroIntro();
    const headerCleanup = initPersistentHeader();
    const sectionCleanup = initSectionReveals();
    const responsiveQueries = gsap.matchMedia();
    responsiveQueries.add("(min-width: 900px)", initHeroStepController);

    return () => {
      responsiveQueries.revert();
      headerCleanup();
      sectionCleanup?.();
    };
  });

  motionQueries.add("(prefers-reduced-motion: reduce)", () => {
    document.documentElement.classList.add("reduced-motion");
    const headerCleanup = initPersistentHeader();
    return () => {
      document.documentElement.classList.remove("reduced-motion");
      headerCleanup();
    };
  });

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
})();
