const menuButton = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const closeMenu = () => {
  menuButton?.setAttribute("aria-expanded", "false");
  mobileMenu?.setAttribute("aria-hidden", "true");
  mobileMenu?.classList.remove("is-open");
  document.body.classList.remove("menu-open");
};

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  mobileMenu?.setAttribute("aria-hidden", String(open));
  mobileMenu?.classList.toggle("is-open", !open);
  document.body.classList.toggle("menu-open", !open);
});

document.querySelectorAll(".mobile-menu a, .site-header a").forEach((link) => {
  link.addEventListener("click", closeMenu);
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
