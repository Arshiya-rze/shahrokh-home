(() => {
  const hero = document.querySelector('[data-hero]');
  const header = document.querySelector('[data-header]');
  if (!hero || !header) return;

  // The Hero's approved sequence is owned exclusively by
  // wbg901-hero-sequence.js. This only preserves the header's sticky context.
  const updateHeroHeader = () => {
    header.classList.toggle('is-sticky-context', window.scrollY >= hero.offsetHeight - 2);
  };

  window.addEventListener('scroll', updateHeroHeader, { passive: true });
  updateHeroHeader();
})();
