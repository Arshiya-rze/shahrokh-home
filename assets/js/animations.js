(() => {
  const hero = document.querySelector("[data-hero]");
  const { gsap, ScrollTrigger, Observer } = window;

  if (!hero || !gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  if (Observer) gsap.registerPlugin(Observer);

  const header = document.querySelector("[data-header]");
  const progressList = hero.querySelector("[data-hero-progress]");
  const steps = gsap.utils.toArray("[data-hero-step]", hero);
  const stepLabels = steps.map((step) => step.querySelector(".hero-stepper__label"));
  const title = hero.querySelector("[data-hero-title]");
  const description = hero.querySelector("[data-hero-description]");
  const actions = hero.querySelector("[data-hero-actions]");
  const product = hero.querySelector("[data-hero-product]");
  const featureBar = hero.querySelector("[data-hero-features]");
  const cue = hero.querySelector("[data-hero-cue]");
  const stepper = hero.querySelector(".hero-stepper");
  const featureContent = hero.querySelector("[data-hero-feature-content]");
  const featureTitle = hero.querySelector("[data-feature-title]");
  const featureDescription = hero.querySelector("[data-feature-description]");

  const HERO_STATES = [
    { index: 0, type: "initial", scale: 1 },
    {
      index: 1,
      number: "01",
      title: "نظم بیشتر",
      description:
        "چیدمان هدفمند ابزارها و تجهیزات، فضای کار را منظم‌تر می‌کند و دسترسی به بخش‌های موردنیاز را ساده‌تر می‌سازد.",
      scale: 1.005,
    },
    {
      index: 2,
      number: "02",
      title: "دسترسی سریع",
      description:
        "هر ابزار در جای مشخص خود قرار می‌گیرد تا مسیر کار روان‌تر باشد و تجهیزات همیشه در دسترس بمانند.",
      scale: 1.01,
    },
    {
      index: 3,
      number: "03",
      title: "طراحی ماژولار",
      description:
        "ساختار WBG905 برای ترکیب و توسعه بخش‌های مختلف طراحی شده تا فضای کار با نیازهای حرفه‌ای هماهنگ شود.",
      scale: 1.015,
    },
  ];

  const COOLDOWN_MS = 150;
  const TRANSITION_DURATION = 0.5;
  const GESTURE_IDLE_DELAY = 0.16;

  let currentHeroState = 0;
  let isAnimating = false;
  let gestureReady = true;
  let gestureSettled = true;
  let animationFinished = true;
  let storyExited = false;
  let storyExiting = false;
  let storyObserver;
  let storyTrigger;
  let activeTimeline;
  let cooldownTimer;
  let idleTimer;
  let transitionId = 0;
  let transitionFromState = 0;

  function updateProgress(state) {
    if (progressList) progressList.dataset.activeStep = String(state);

    steps.forEach((step, index) => {
      const active = index + 1 === state;
      step.classList.toggle("is-active", active);
      if (active) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  }

  function renderFeature(state) {
    const feature = HERO_STATES[state];
    if (!featureContent) return;

    if (state === 0) {
      featureContent.setAttribute("aria-hidden", "true");
      return;
    }

    featureTitle.textContent = feature.title;
    featureDescription.textContent = feature.description;
    featureContent.setAttribute("aria-hidden", "false");
  }

  function setHeroVisualState(state) {
    const feature = HERO_STATES[state];
    currentHeroState = state;
    hero.dataset.state = String(state);
    updateProgress(state);
    renderFeature(state);

    gsap.set(stepLabels, { autoAlpha: 0, y: 8 });
    if (state > 0 && stepLabels[state - 1]) {
      gsap.set(stepLabels[state - 1], { autoAlpha: 1, y: 0 });
    }
    gsap.set(product, { scale: feature.scale, transformOrigin: "50% 55%" });
    gsap.set(featureContent, { autoAlpha: state === 0 ? 0 : 1, y: 0 });
    gsap.set(title, { autoAlpha: state === 0 ? 1 : 0, y: state === 0 ? 0 : -4 });
    gsap.set([description, actions, featureBar, cue], {
      autoAlpha: state === 0 ? 1 : 0,
      y: state === 0 ? 0 : 5,
    });
    gsap.set(stepper, { autoAlpha: 1 });
  }

  function setInitialHeroState() {
    setHeroVisualState(0);
  }

  function scheduleCooldown() {
    cooldownTimer?.kill();
    cooldownTimer = gsap.delayedCall(COOLDOWN_MS / 1000, () => {
      cooldownTimer = undefined;
      if (!storyExited && !storyExiting && animationFinished && gestureSettled) {
        isAnimating = false;
        gestureReady = true;
      }
    });
  }

  function tryReleaseInteraction() {
    if (animationFinished && gestureSettled && !storyExited && !storyExiting) {
      scheduleCooldown();
    }
  }

  function noteGestureActivity() {
    gestureSettled = false;
    idleTimer?.kill();
    idleTimer = undefined;
    cooldownTimer?.kill();
    cooldownTimer = undefined;
  }

  function markGestureIdle() {
    idleTimer?.kill();
    idleTimer = undefined;
    gestureSettled = true;
    tryReleaseInteraction();
  }

  function waitForGestureIdle(delay = GESTURE_IDLE_DELAY) {
    idleTimer?.kill();
    idleTimer = gsap.delayedCall(delay, markGestureIdle);
  }

  function finishAnimation(id) {
    if (id !== transitionId) return;
    activeTimeline = undefined;
    animationFinished = true;
    tryReleaseInteraction();
  }

  function beginAnimation(timelineBuilder) {
    isAnimating = true;
    gestureReady = false;
    animationFinished = false;
    cooldownTimer?.kill();
    cooldownTimer = undefined;

    const id = ++transitionId;
    activeTimeline = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => finishAnimation(id),
      onInterrupt: () => finishAnimation(id),
    });
    timelineBuilder(activeTimeline);
  }

  function requestHeroState(nextState) {
    if (isAnimating || storyExited || storyExiting || !gestureReady) return;

    const next = gsap.utils.clamp(0, HERO_STATES.length - 1, nextState);
    if (next === currentHeroState) {
      gestureReady = true;
      animationFinished = true;
      return;
    }

    const previous = currentHeroState;
    transitionFromState = previous;
    currentHeroState = next;
    hero.dataset.state = String(next);
    updateProgress(next);
    noteGestureActivity();

    beginAnimation((timeline) => {
      if (previous > 0) {
        timeline.to(featureContent, {
          autoAlpha: 0,
          y: -14,
          duration: 0.24,
          ease: "power2.out",
        }, 0);
      }

      timeline.call(() => renderFeature(next), null, previous > 0 ? 0.24 : 0);
      if (next > 0) {
        timeline.fromTo(
          featureContent,
          { autoAlpha: 0, y: 14, immediateRender: false },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" },
          previous > 0 ? 0.24 : 0,
        );
      }

      if (previous > 0) {
        timeline.to(stepLabels[previous - 1], {
          autoAlpha: 0,
          y: -8,
          duration: 0.24,
          ease: "power2.out",
        }, 0);
      }
      if (next > 0 && stepLabels[next - 1]) {
        timeline.fromTo(
          stepLabels[next - 1],
          { autoAlpha: 0, y: 14, immediateRender: false },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" },
          previous > 0 ? 0.24 : 0,
        );
      }

      const state = HERO_STATES[next];
      timeline.to(product, { scale: state.scale, duration: TRANSITION_DURATION }, 0);
      timeline.to(title, {
        autoAlpha: next === 0 ? 1 : 0,
        y: next === 0 ? 0 : -4,
        duration: 0.42,
      }, 0);
      timeline.to([description, actions], {
        autoAlpha: next === 0 ? 1 : 0,
        y: next === 0 ? 0 : 5,
        duration: 0.36,
        stagger: 0.035,
      }, 0);
      timeline.to([featureBar, cue], {
        autoAlpha: next === 0 ? 1 : 0,
        y: next === 0 ? 0 : 4,
        duration: 0.36,
        stagger: 0.025,
      }, 0);
    });
  }

  function exitHeroStory() {
    if (isAnimating || storyExited || storyExiting) return;

    noteGestureActivity();
    storyExiting = true;
    transitionFromState = currentHeroState;
    beginAnimation((timeline) => {
      timeline.to(featureContent, {
        autoAlpha: 0,
        y: -14,
        duration: 0.3,
        ease: "power2.out",
      }, 0);
      timeline.to(stepper, { autoAlpha: 0.2, duration: 0.48 }, 0);
      timeline.to(product, { scale: 1.02, duration: 0.72 }, 0);
      timeline.to(title, { autoAlpha: 0, duration: 0.38 }, 0);
      timeline.to([description, actions, featureBar, cue], {
        autoAlpha: 0,
        duration: 0.36,
        stagger: 0.025,
      }, 0);
      timeline.eventCallback("onComplete", () => {
        activeTimeline = undefined;
        animationFinished = true;
        isAnimating = false;
        storyExiting = false;
        storyExited = true;
        storyObserver?.disable();
        if (storyTrigger) {
          window.scrollTo({ top: storyTrigger.end, behavior: "smooth" });
        }
      });
      timeline.eventCallback("onInterrupt", () => {
        activeTimeline = undefined;
        animationFinished = true;
        isAnimating = false;
        storyExiting = false;
        gestureReady = true;
        gestureSettled = true;
        scheduleCooldown();
      });
    });
  }

  function requestDirection(direction) {
    noteGestureActivity();

    if (isAnimating) {
      const reverseExit = storyExiting && direction < 0;
      const reverseTransition =
        !storyExiting &&
        currentHeroState !== transitionFromState &&
        (direction > 0 ? currentHeroState + 1 : currentHeroState - 1) === transitionFromState;

      if (reverseExit || reverseTransition) {
        activeTimeline?.kill();
        isAnimating = false;
        animationFinished = true;
        gestureReady = true;
        storyExited = false;
        storyExiting = false;
        setHeroVisualState(transitionFromState);

        if (reverseExit) requestHeroState(transitionFromState - 1);
        return;
      }
      return;
    }

    if (storyExited || storyExiting || !gestureReady) return;

    if (direction > 0) {
      if (currentHeroState < HERO_STATES.length - 1) {
        requestHeroState(currentHeroState + 1);
      } else {
        exitHeroStory();
      }
      return;
    }

    if (currentHeroState > 0) {
      requestHeroState(currentHeroState - 1);
      return;
    }

    // Hero is the first section; at its top there is no earlier content to reveal.
    gestureSettled = true;
    gestureReady = true;
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
    const compactIntro = window.matchMedia("(max-width: 699px)").matches;
    const timings = compactIntro
      ? {
          header: 0.25,
          label: 0.3,
          rule: 0.2,
          kicker: 0.28,
          title: 0.34,
          titleStagger: 0.04,
          description: 0.28,
          actions: 0.25,
          actionStagger: 0.05,
        }
      : {
          header: 0.45,
          label: 0.38,
          rule: 0.36,
          kicker: 0.38,
          title: 0.52,
          titleStagger: 0.12,
          description: 0.42,
          actions: 0.38,
          actionStagger: 0.1,
        };
    const label = hero.querySelector("[data-hero-label]");
    const redRule = label?.querySelector("i");
    const kicker = hero.querySelector("[data-hero-kicker]");
    const titleLines = gsap.utils.toArray("[data-hero-title-line]", hero);
    const background = hero.querySelector("[data-hero-background]");
    const actionItems = actions ? Array.from(actions.children) : [];
    const intro = gsap.timeline({ defaults: { ease: "power2.out" } });

    if (header) {
      intro.fromTo(header, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: timings.header }, 0);
    }
    if (label) {
      intro.fromTo(label, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: timings.label }, compactIntro ? 0.08 : 0.12);
    }
    if (redRule) {
      intro.fromTo(redRule, { scaleX: 0, transformOrigin: "right center" }, {
        scaleX: 1, duration: timings.rule, ease: "power2.inOut",
      }, compactIntro ? 0.12 : 0.2);
    }
    if (kicker) {
      intro.fromTo(kicker, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: timings.kicker }, compactIntro ? 0.1 : 0.18);
    }
    if (titleLines.length) {
      intro.fromTo(titleLines, { autoAlpha: 0, y: 32 }, {
        autoAlpha: 1, y: 0, duration: timings.title, stagger: timings.titleStagger, ease: "power3.out",
      }, compactIntro ? 0.15 : 0.28);
    }
    if (description) {
      intro.fromTo(description, { autoAlpha: 0, y: 16 }, {
        autoAlpha: 1, y: 0, duration: timings.description,
      }, compactIntro ? 0.36 : 0.8);
    }
    if (actionItems.length) {
      intro.fromTo(actionItems, { autoAlpha: 0, y: 12 }, {
        autoAlpha: 1, y: 0, duration: timings.actions, stagger: timings.actionStagger,
      }, compactIntro ? 0.52 : 1.02);
    }
    if (background) {
      intro.fromTo(background, { autoAlpha: 0, scale: 1.025, y: 10 }, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: compactIntro ? 0.55 : 0.82,
        ease: "power2.out",
      }, compactIntro ? 0.18 : 0.34);
    }
    if (featureBar && !compactIntro) {
      intro.fromTo(featureBar, { autoAlpha: 0, y: 10 }, {
        autoAlpha: 1, y: 0, duration: 0.42,
      }, 1.18);
    }
    if (cue && !compactIntro) {
      intro.fromTo(cue, { autoAlpha: 0, y: 8 }, {
        autoAlpha: 1, y: 0, duration: 0.36,
      }, 1.24);
    }
    return intro;
  }

  function initHeroStepController() {
    if (!Observer) return () => {};

    setHeroVisualState(0);
    storyObserver?.kill();
    storyTrigger?.kill();

    storyObserver = Observer.create({
      target: window,
      type: "wheel,touch",
      wheelSpeed: 1,
      tolerance: 48,
      onStopDelay: GESTURE_IDLE_DELAY,
      preventDefault: true,
      onDown: () => requestDirection(1),
      onUp: () => requestDirection(-1),
      onStop: markGestureIdle,
    });
    storyObserver.disable();

    storyTrigger = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      pin: true,
      pinSpacing: false,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => {
        if (storyExited) return;
        header?.classList.remove("is-sticky-context");
        storyObserver.enable();
      },
      onLeave: () => {
        storyObserver.disable();
      },
      onEnterBack: () => {
        storyExited = false;
        storyExiting = false;
        setHeroVisualState(3);
        header?.classList.remove("is-sticky-context");
        gestureReady = false;
        gestureSettled = false;
        animationFinished = true;
        isAnimating = false;
        storyObserver.enable();
        waitForGestureIdle(0.28);
      },
      onLeaveBack: () => {
        if (currentHeroState === 0) storyObserver.disable();
      },
    });

    if (ScrollTrigger.isInViewport(hero, 0.99)) storyObserver.enable();

    return () => {
      storyObserver?.kill();
      storyTrigger?.kill();
      activeTimeline?.kill();
      cooldownTimer?.kill();
      idleTimer?.kill();
      storyObserver = undefined;
      storyTrigger = undefined;
      activeTimeline = undefined;
      cooldownTimer = undefined;
      idleTimer = undefined;
      transitionId += 1;
      currentHeroState = 0;
      isAnimating = false;
      gestureReady = true;
      gestureSettled = true;
      animationFinished = true;
      storyExited = false;
      storyExiting = false;
      setInitialHeroState();
    };
  }

  function initSectionReveals() {
    const aboutCleanup = initAboutReveal();
    const productStoryCleanup = initWbg905ProductStory();
    const productRangeCleanup = initProductRangeReveal();

    gsap.utils
      .toArray(
        ".capabilities__intro,.detail-story__copy,.final-cta__inner",
      )
      .forEach((block) => {
        gsap.from(block, {
          y: 28,
          autoAlpha: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: block, start: "top 78%" },
        });
      });

    gsap.utils.toArray(".capability").forEach((item, index) => {
      gsap.from(item, {
        y: 18,
        autoAlpha: 0,
        duration: 0.55,
        delay: (index % 4) * 0.045,
        ease: "power2.out",
        scrollTrigger: { trigger: item, start: "top 88%" },
      });
    });

    gsap.utils.toArray(".motion-frame,.detail-story__media").forEach((media) => {
      gsap.from(media, {
        scale: 0.97,
        autoAlpha: 0,
        duration: 0.82,
        scrollTrigger: { trigger: media, start: "top 82%" },
      });
    });

    return () => {
      productStoryCleanup?.();
      productRangeCleanup?.();
      aboutCleanup?.();
    };
  }

  function initProductRangeReveal() {
    const section = document.querySelector(".product-range");
    if (!section) return;

    const meta = section.querySelector(".product-range__intro .product-range__eyebrow");
    const title = section.querySelector("#product-range-title");
    const lead = section.querySelector(".product-range__lead");
    const cta = section.querySelector(".product-range__all-link");
    const stage = section.querySelector("[data-product-range-stage]");
    const featuredCard = section.querySelector(".product-range__product-card");
    const categoryCards = gsap.utils.toArray(".product-range__category-card", section);
    const values = gsap.utils.toArray(".product-range__value", section);

    const context = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: section, start: "top 86%", once: true },
      });
      intro.from(meta, { autoAlpha: 0, y: 12, duration: .55 }, 0);
      intro.from(title, { autoAlpha: 0, y: 20, duration: .68 }, .08);
      intro.from(lead, { autoAlpha: 0, y: 16, duration: .58 }, .22);
      intro.from(cta, { autoAlpha: 0, y: 12, duration: .5 }, .34);
      intro.from(stage, { autoAlpha: 0, y: 18, scale: 1.015, duration: .82 }, .08);

      if (featuredCard && window.matchMedia("(max-width: 1279px)").matches) {
        gsap.from(featuredCard, {
          autoAlpha: 0,
          y: 18,
          duration: .58,
          ease: "power3.out",
          scrollTrigger: {
            trigger: featuredCard,
            start: "top 88%",
            once: true,
          },
        });
      }

      [[categoryCards, section.querySelector(".product-range__categories")], [values, section.querySelector(".product-range__values")]].forEach(([items, trigger]) => {
        if (!items.length || !trigger) return;
        gsap.from(items, {
          autoAlpha: 0,
          y: 18,
          duration: .58,
          stagger: .085,
          ease: "power3.out",
          scrollTrigger: { trigger, start: "top 88%", once: true },
        });
      });
    }, section);

    return () => context.revert();
  }

  function initWbg905ProductStory() {
    const section = document.querySelector("#wbg905-product-story");
    if (!section) return;

    const meta = section.querySelector("[data-product-meta]");
    const code = section.querySelector("[data-product-code]");
    const headline = section.querySelector("[data-product-headline]");
    const description = section.querySelector("[data-product-description]");
    const actions = gsap.utils.toArray("[data-product-actions] > *", section);
    const stage = section.querySelector("[data-product-stage]");
    const callouts = gsap.utils.toArray("[data-product-callout]", section);
    const benefits = gsap.utils.toArray("[data-product-benefit]", section);
    const detailsHeading = section.querySelector("[data-product-details-heading]");
    const features = gsap.utils.toArray("[data-product-feature]", section);
    const finalCta = section.querySelector("[data-product-final]");

    const context = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: section, start: "top 84%", once: true },
      });
      intro.from(meta, { autoAlpha: 0, y: 12, duration: .4 }, 0);
      intro.from(code, { autoAlpha: 0, y: 18, duration: .55 }, .05);
      intro.from(headline, { autoAlpha: 0, y: 20, duration: .55 }, .12);
      intro.from(description, { autoAlpha: 0, y: 14, duration: .48 }, .28);
      intro.from(actions, { autoAlpha: 0, y: 12, duration: .38, stagger: .07 }, .38);
      intro.from(stage, { autoAlpha: 0, y: 20, scale: 1.015, duration: .85 }, .08);
      intro.from(benefits, { autoAlpha: 0, y: 14, duration: .45, stagger: .08 }, .36);

      if (callouts.length) {
        gsap.from(callouts, {
          autoAlpha: 0,
          y: 8,
          duration: .38,
          stagger: .07,
          ease: "power2.out",
          scrollTrigger: { trigger: stage, start: "top 72%", once: true },
        });
        gsap.from(callouts.map((callout) => callout.querySelector(".wbg905-product-story__callout-line")), {
          scaleX: 0,
          duration: .42,
          stagger: .07,
          ease: "power2.out",
          scrollTrigger: { trigger: stage, start: "top 72%", once: true },
        });
      }

      gsap.from(detailsHeading, {
        autoAlpha: 0,
        y: 18,
        duration: .52,
        ease: "power3.out",
        scrollTrigger: { trigger: detailsHeading, start: "top 88%", once: true },
      });
      gsap.from(features, {
        autoAlpha: 0,
        y: 18,
        duration: .48,
        stagger: .08,
        ease: "power3.out",
        scrollTrigger: { trigger: features[0], start: "top 88%", once: true },
      });
      gsap.from(finalCta, {
        autoAlpha: 0,
        y: 16,
        duration: .5,
        ease: "power3.out",
        scrollTrigger: { trigger: finalCta, start: "top 90%", once: true },
      });
    }, section);

    const parallax = gsap.matchMedia();
    parallax.add("(min-width: 1200px)", () => {
      gsap.to(stage, {
        yPercent: -1.5,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: .9 },
      });
    });

    return () => {
      context.revert();
      parallax.revert();
    };
  }

  function initAboutReveal() {
    const section = document.querySelector("[data-about-section]");
    if (!section) return;

    const meta = section.querySelector("[data-about-meta]");
    const metaRule = meta?.querySelector("i");
    const titleLines = gsap.utils.toArray("[data-about-title-line]", section);
    const description = section.querySelector("[data-about-description]");
    const cta = section.querySelector("[data-about-cta]");
    const media = section.querySelector("[data-about-media]");
    const word = section.querySelector(".about-shahrokh__word");
    const features = gsap.utils.toArray("[data-about-feature]", section);

    const revealContext = gsap.context(() => {
      const reveal = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          once: true,
        },
      });

      reveal.from(meta, { autoAlpha: 0, y: 12, duration: .5 }, 0);
      if (metaRule) {
        reveal.to(metaRule, { scaleX: 1, duration: .46, ease: "power2.inOut" }, .08);
      }
      reveal.from(titleLines, { autoAlpha: 0, y: 28, duration: .62, stagger: .12 }, .12);
      reveal.from(description, { autoAlpha: 0, y: 18, duration: .55 }, .48);
      reveal.from(cta, { autoAlpha: 0, y: 12, duration: .45 }, .72);
      reveal.from(media, { autoAlpha: 0, scale: 1.035, y: 24, duration: 1.05 }, .12);

      gsap.from(features, {
        autoAlpha: 0,
        y: 20,
        duration: .52,
        stagger: .1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section.querySelector("[data-about-features]"),
          start: "top 88%",
          once: true,
        },
      });
    }, section);

    const parallax = gsap.matchMedia();
    parallax.add("(min-width: 1024px)", () => {
      gsap.to(media, {
        yPercent: -3,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: .8,
        },
      });
      gsap.to(word, {
        xPercent: -2,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    });

    return () => {
      revealContext.revert();
      parallax.revert();
    };
  }

  const motionQueries = gsap.matchMedia();
  motionQueries.add("(prefers-reduced-motion: no-preference)", () => {
    setInitialHeroState();
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
    setInitialHeroState();
    const headerCleanup = initPersistentHeader();
    return () => {
      document.documentElement.classList.remove("reduced-motion");
      headerCleanup();
    };
  });

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
})();
