const footerYear = document.querySelector("[data-footer-year]");

if (footerYear) {
  const now = new Date();
  const persianYear = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
  }).format(now);

  footerYear.textContent = persianYear;
}
