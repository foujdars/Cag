const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

if (menuButton && mobileNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    mobileNav.hidden = isOpen;
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
      mobileNav.hidden = true;
    });
  });
}

const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-nav a[href^="#"]')];
const sections = [...document.querySelectorAll('main section[id]')];

if ('IntersectionObserver' in window && navLinks.length && sections.length) {
  const updateActiveLink = (id) => {
    navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) updateActiveLink(visible.target.id);
  }, { rootMargin: '-25% 0px -60% 0px', threshold: [0.1, 0.35] });

  sections.forEach((section) => observer.observe(section));
}

const preview = document.querySelector('.workspace-card');
const stageDescription = document.querySelector('#stage-description');
const stageButtons = [...document.querySelectorAll('.journey-step')];
const stageCopy = {
  ask: 'Begin with an issue in your own words.',
  connect: 'See related context across state reports.',
  verify: 'Open the published CAG report for the full record.'
};

stageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const stage = button.dataset.stageTarget;
    if (!preview || !stageDescription || !stageCopy[stage]) return;
    preview.dataset.stage = stage;
    stageDescription.textContent = stageCopy[stage];
    stageButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
  });
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reducedMotion) {
  const revealItems = [...document.querySelectorAll('.intro-grid, .workflow-heading, .steps, .coverage-layout, .closing-inner')];
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealItems.forEach((item) => item.classList.add('reveal'));
  document.documentElement.classList.add('motion-ready');
  revealItems.forEach((item) => revealObserver.observe(item));
}
