const menuButton = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const menuLinks = [...(mobileMenu?.querySelectorAll("a[href^='#']") ?? [])];
const focusableMenuItems = () => [menuButton, ...menuLinks].filter((item) => item && !item.hidden);
let savedScrollY = 0;

const setMenuOpen = (open) => {
  if (!menuButton || !mobileMenu) return;

  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
  mobileMenu.setAttribute("aria-hidden", String(!open));
  mobileMenu.inert = !open;
  mobileMenu.classList.toggle("is-open", open);

  if (open) {
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.insetBlockStart = `-${savedScrollY}px`;
    document.body.style.inlineSize = "100%";
    document.body.classList.add("menu-open");
    requestAnimationFrame(() => menuLinks[0]?.focus());
    return;
  }

  document.body.classList.remove("menu-open");
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("inset-block-start");
  document.body.style.removeProperty("inline-size");
  window.scrollTo(0, savedScrollY);
};

const closeMenu = () => {
  if (menuButton?.getAttribute("aria-expanded") !== "true") return;
  setMenuOpen(false);
  menuButton.focus();
};

menuButton?.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
});

mobileMenu?.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");
  if (!link) return;

  const target = document.querySelector(link.getAttribute("href"));
  if (!target) return;

  event.preventDefault();
  const destination = link.getAttribute("href");
  setMenuOpen(false);
  menuButton.focus({ preventScroll: true });
  history.pushState(null, "", destination);
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });
});

document.addEventListener("keydown", (event) => {
  if (menuButton?.getAttribute("aria-expanded") !== "true") return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu();
    return;
  }

  if (event.key !== "Tab") return;
  const items = focusableMenuItems();
  const first = items[0];
  const last = items.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});

document.querySelectorAll("[data-media-slot]").forEach((frame) => {
  const video = frame.querySelector("video");
  if (!video) return;

  const source = frame.dataset.video;
  if (source && !video.querySelector("source") && !video.src) video.src = source;

  const hasSource = video.querySelector("source") || video.src;
  if (!hasSource) return;

  frame.classList.add("has-video");
  video.addEventListener("error", () => {
    if (frame.closest("#top")) frame.dataset.videoFailed = "true";
  });
  if (frame.id === "top" || frame.closest("#top")) {
    if (reducedMotion) {
      video.autoplay = false;
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  } else if (source) {
    video.play().catch(() => {});
  }
});

const heroVideo = document.querySelector("#top .media-video");
const videoButton = document.querySelector("[data-video-placeholder]");
const videoStatus = document.querySelector("#hero-video-status");

videoButton?.addEventListener("click", () => {
  if (!heroVideo || !videoStatus) return;
  videoStatus.hidden = false;

  if (reducedMotion) {
    videoStatus.textContent = "پیش‌نمایش ثابت محصول به‌دلیل تنظیم کاهش حرکت نمایش داده می‌شود.";
    return;
  }

  heroVideo.currentTime = 0;
  heroVideo.play().then(() => {
    videoStatus.textContent = "ویدئوی معرفی WBG905 در حال پخش است.";
  }).catch(() => {
    videoStatus.textContent = "پخش ویدئو در این مرورگر در دسترس نیست.";
  });
});
