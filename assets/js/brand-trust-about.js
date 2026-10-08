(() => {
  const section = document.querySelector('.brand-trust-about');
  if (!section) return;

  const statsList = section.querySelector('[data-brand-stats]');
  // Populate only with client-verified values; no metrics were found in project data.
  const stats = [];
  const statIcons = {
    building: '<path d="M5 28V6h14v22M19 13h8v15M9 10h2m4 0h1m-7 5h2m4 0h1m-7 5h2m4 0h1m7-3h1m-1 5h1M3 28h26"/>',
    gear: '<path d="M16 3 19 6l4-.2 1.2 3.7 3.4 2-1.2 3.8 1.2 3.8-3.4 2L23 28l-4-.2-3 3-3-3-4 .2-1.2-3.7-3.4-2 1.2-3.8-1.2-3.8 3.4-2L9 6l4 .2z"/><circle cx="16" cy="16" r="4"/>',
    people: '<path d="M21 27v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2m16-7a5 5 0 0 1 5 5v2m-16-15a4 4 0 1 0 8 0 4 4 0 0 0-8 0zm11-3a4 4 0 0 1 0 8"/>',
    globe: '<circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4a19 19 0 0 1 0 24m0-24a19 19 0 0 0 0 24"/>',
  };

  const verifiedStats = stats.filter((item) => item.verified && item.value && item.label);
  if (verifiedStats.length) {
    const visibleStats = verifiedStats.slice(0, 4);
    statsList.style.setProperty('--brand-stat-count', visibleStats.length);
    visibleStats.forEach((item) => {
      const entry = document.createElement('li');
      const icon = document.createElement('span');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const value = document.createElement('strong');
      const label = document.createElement('span');
      entry.className = 'brand-trust-about__stat';
      icon.className = 'brand-trust-about__stat-icon';
      svg.setAttribute('viewBox', '0 0 32 32');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = statIcons[item.icon] || statIcons.building;
      value.className = 'brand-trust-about__stat-value';
      value.textContent = item.value;
      label.className = 'brand-trust-about__stat-label';
      label.textContent = item.label;
      icon.append(svg);
      entry.append(icon, value, label);
      statsList.append(entry);
    });
    statsList.hidden = false;
    section.classList.add('has-stats');
  }

  const videoPath = 'assets/videos/shahrokh-intro.mp4';
  const videoTrigger = section.querySelector('[data-brand-video-trigger]');
  const videoDialog = section.querySelector('[data-brand-video-dialog]');
  const video = section.querySelector('[data-brand-video]');
  const closeVideo = section.querySelector('[data-brand-video-close]');

  fetch(videoPath, { method: 'HEAD', cache: 'no-store' })
    .then((response) => {
      if (!response.ok || !response.headers.get('content-type')?.startsWith('video/')) return;
      video.src = videoPath;
      videoTrigger.hidden = false;
      videoTrigger.addEventListener('click', () => {
        videoDialog.showModal();
        video.play().catch(() => {});
      });
      closeVideo.addEventListener('click', () => videoDialog.close());
      videoDialog.addEventListener('close', () => video.pause());
    })
    .catch(() => {});

  if (window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    const introItems = section.querySelectorAll('.brand-trust-about__eyebrow, .brand-trust-about__intro h2, .brand-trust-about__description');
    window.gsap.fromTo(introItems, { autoAlpha: 0, y: 12 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: { trigger: section.querySelector('.brand-trust-about__intro'), start: 'top 82%', once: true },
    });
    window.gsap.fromTo(section.querySelector('.brand-trust-about__media'), { autoAlpha: 0, scale: 1.015 }, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: section.querySelector('.brand-trust-about__media'), start: 'top 88%', once: true },
    });
    section.querySelectorAll('.brand-trust-about__values li').forEach((card) => {
      window.gsap.fromTo(card, { autoAlpha: 0, y: 12 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: { trigger: card, start: 'top 94%', once: true },
      });
    });
  }
})();
