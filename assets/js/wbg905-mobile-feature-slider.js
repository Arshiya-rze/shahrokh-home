(() => {
  const carousel = document.querySelector("[data-feature-carousel]");
  const track = carousel?.querySelector("[data-feature-track]");
  const controls = carousel?.querySelector("[data-feature-controls]");
  if (!carousel || !track || !controls) return;

  const slides = Array.from(track.querySelectorAll("[data-product-feature]"));
  if (slides.length < 2) return;

  const mobile = window.matchMedia("(max-width: 767px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const createButton = (label, content, className) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.className = className;
    button.textContent = content;
    return button;
  };

  const previous = createButton("نمایش ویژگی قبلی", "←", "feature-control-arrow");
  const position = document.createElement("span");
  position.dataset.featurePosition = "";
  position.setAttribute("aria-hidden", "true");
  const next = createButton("نمایش ویژگی بعدی", "→", "feature-control-arrow");
  controls.append(previous, position, next);

  let activeIndex = 0;
  let intervalId = 0;
  let pointerInside = false;
  let focusInside = false;
  let touchPauseUntil = 0;
  let scrollFrame = 0;

  const updateControls = () => {
    position.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  };

  const goTo = (index, behavior = "smooth") => {
    activeIndex = (index + slides.length) % slides.length;
    updateControls();
    const trackBox = track.getBoundingClientRect();
    const slideBox = slides[activeIndex].getBoundingClientRect();
    const horizontalOffset = (slideBox.left + slideBox.width / 2) - (trackBox.left + trackBox.width / 2);
    track.scrollTo({
      left: track.scrollLeft + horizontalOffset,
      top: track.scrollTop,
      behavior: reducedMotion.matches ? "auto" : behavior,
    });
  };

  const detectActive = () => {
    scrollFrame = 0;
    if (!mobile.matches) return;
    const trackBox = track.getBoundingClientRect();
    const center = trackBox.left + trackBox.width / 2;
    let closest = 0;
    let closestDistance = Infinity;
    slides.forEach((slide, index) => {
      const box = slide.getBoundingClientRect();
      const distance = Math.abs(box.left + box.width / 2 - center);
      if (distance < closestDistance) {
        closest = index;
        closestDistance = distance;
      }
    });
    if (activeIndex !== closest) {
      activeIndex = closest;
      updateControls();
    }
  };

  const syncMode = () => {
    const isMobile = mobile.matches;
    controls.hidden = !isMobile;
    if (!isMobile) {
      window.clearInterval(intervalId);
      intervalId = 0;
      return;
    }
    detectActive();
    if (!intervalId && !reducedMotion.matches) {
      intervalId = window.setInterval(() => {
        if (pointerInside || focusInside || document.hidden || Date.now() < touchPauseUntil) return;
        goTo(activeIndex + 1);
      }, 5200);
    }
  };

  previous.addEventListener("click", () => goTo(activeIndex - 1));
  next.addEventListener("click", () => goTo(activeIndex + 1));
  track.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(detectActive);
  }, { passive: true });
  track.addEventListener("pointerdown", () => {
    touchPauseUntil = Date.now() + 8000;
  }, { passive: true });
  carousel.addEventListener("pointerenter", () => { pointerInside = true; });
  carousel.addEventListener("pointerleave", () => { pointerInside = false; });
  carousel.addEventListener("focusin", () => { focusInside = true; });
  carousel.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) focusInside = false;
  });
  mobile.addEventListener?.("change", syncMode);
  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) {
      window.clearInterval(intervalId);
      intervalId = 0;
    } else {
      syncMode();
    }
  });

  updateControls();
  syncMode();
})();
