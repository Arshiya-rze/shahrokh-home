(() => {
  const section = document.querySelector(".industry-applications");
  const { gsap, ScrollTrigger } = window;

  if (!section || !gsap || !ScrollTrigger || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  gsap.registerPlugin(ScrollTrigger);

  const intro = section.querySelector(".industry-applications__intro");
  const hero = section.querySelector(".industry-applications__hero");
  const cards = section.querySelectorAll(".industry-applications__card");
  const benefits = section.querySelectorAll(".industry-applications__benefit-intro, .industry-applications__benefit-list li");

  gsap.fromTo(intro.children,
    { autoAlpha: 0, y: 14 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.58,
      stagger: 0.08,
      ease: "power3.out",
      clearProps: "all",
      scrollTrigger: { trigger: intro, start: "top 82%", once: true },
    },
  );

  gsap.fromTo(hero,
    { autoAlpha: 0, scale: 1.015 },
    {
      autoAlpha: 1,
      scale: 1,
      duration: 0.72,
      ease: "power3.out",
      clearProps: "all",
      scrollTrigger: { trigger: hero, start: "top 84%", once: true },
    },
  );

  gsap.fromTo(cards,
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.56,
      stagger: 0.08,
      ease: "power3.out",
      clearProps: "all",
      scrollTrigger: { trigger: cards[0], start: "top 86%", once: true },
    },
  );

  gsap.fromTo(benefits,
    { autoAlpha: 0, y: 10 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.06,
      ease: "power3.out",
      clearProps: "all",
      scrollTrigger: { trigger: section.querySelector(".industry-applications__benefits"), start: "top 88%", once: true },
    },
  );
})();
