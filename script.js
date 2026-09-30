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

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const globe = document.querySelector('#audit-globe');
const globeButton = document.querySelector('#globe-motion');

if (globe && globeButton) {
  const ctx = globe.getContext('2d');
  const size = 720;
  const center = size / 2;
  const radius = 283;
  const rad = Math.PI / 180;
  const tilt = 18 * rad;
  let countries = [];
  let longitude = 78;
  let phase = 0;
  let turning = !reducedMotion;
  let visible = true;
  let lastTime = 0;
  let lastDraw = 0;
  let signalTime = 0;
  let heldCard = null;
  const stage = document.querySelector('.atlas-stage');
  const signal = document.querySelector('.atlas-orbit-dot');
  const cards = [
    document.querySelector('.observation-rajasthan'),
    document.querySelector('.observation-maharashtra'),
    document.querySelector('.observation-odisha')
  ];
  const stops = [
    { card: cards[0], coordinate: [74.2, 26.9], placement: 'left' },
    { card: cards[2], coordinate: [85.8, 20.9], placement: 'right' },
    { card: cards[1], coordinate: [75.7, 19.5], placement: 'below' }
  ];
  const dwell = 2900;
  const travel = 2300;
  const leg = dwell + travel;
  if (!reducedMotion && stage && signal && cards.every(Boolean)) {
    stage.classList.add('motion-enabled');
    cards.forEach((card) => {
      card.addEventListener('pointerenter', () => { heldCard = card; });
      card.addEventListener('pointerleave', () => { if (heldCard === card) heldCard = null; });
      card.addEventListener('focusin', () => { heldCard = card; });
      card.addEventListener('focusout', (event) => {
        if (heldCard === card && !card.contains(event.relatedTarget)) heldCard = null;
      });
    });
  }

  const updateSignal = () => {
    if (!stage?.classList.contains('motion-enabled') || !signal) return;
    const segment = Math.floor(signalTime / leg) % stops.length;
    const progress = signalTime % leg;
    let coordinate = stops[segment].coordinate;
    let active = segment;
    if (progress >= dwell) {
      const next = (segment + 1) % stops.length;
      const t = (progress - dwell) / travel;
      const eased = t * t * (3 - 2 * t);
      coordinate = stops[segment].coordinate.map((value, index) =>
        value + (stops[next].coordinate[index] - value) * eased);
      active = t < .035 ? segment : t > .965 ? next : -1;
    }
    const stageRect = stage.getBoundingClientRect();
    const globeRect = globe.getBoundingClientRect();
    const scale = globeRect.width / size;
    const onStage = (location) => {
      const projected = project(location);
      return {
        x: globeRect.left - stageRect.left + projected.x * scale,
        y: globeRect.top - stageRect.top + projected.y * scale
      };
    };
    const point = onStage(coordinate);
    signal.style.left = `${point.x}px`;
    signal.style.top = `${point.y}px`;
    stops.forEach(({ card, coordinate: location, placement }, index) => {
      const marker = onStage(location);
      const width = card.offsetWidth, height = card.offsetHeight;
      let x = marker.x - width / 2, y = marker.y - height - 20;
      if (placement === 'left') { x = marker.x - width - 22; y = marker.y - height / 2; }
      if (placement === 'right') { x = marker.x + 20; y = marker.y - height / 2; }
      if (placement === 'below') { x = marker.x - width / 2; y = marker.y + 20; }
      if (stage.clientWidth < 500) {
        x = marker.x - width / 2;
        y = placement === 'left' ? marker.y - height - 20 : marker.y + 20;
      }
      card.style.left = `${Math.max(0, Math.min(stage.clientWidth - width, x))}px`;
      card.style.top = `${Math.max(7, Math.min(stage.clientHeight - height - 7, y))}px`;
      card.classList.toggle('is-active', card === heldCard || index === active);
    });
  };

  const project = (point) => {
    const lon = (point[0] - longitude) * rad;
    const lat = point[1] * rad;
    const cosLat = Math.cos(lat);
    const depth = Math.sin(tilt) * Math.sin(lat) + Math.cos(tilt) * cosLat * Math.cos(lon);
    return { x: center + radius * cosLat * Math.sin(lon), y: center - radius * (Math.cos(tilt) * Math.sin(lat) - Math.sin(tilt) * cosLat * Math.cos(lon)), depth };
  };

  // The sphere's grid and the country outlines share one orthographic projection.
  const drawLine = (points, color, width) => {
    ctx.beginPath();
    let drawing = false;
    points.forEach((point) => {
      const p = project(point);
      if (p.depth > 0) {
        if (drawing) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
        drawing = true;
      } else drawing = false;
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  const drawRing = (ring, isIndia) => {
    ctx.beginPath();
    let open = false;
    let visiblePoints = 0;
    ring.forEach((point) => {
      const p = project(point);
      if (p.depth > 0) {
        if (!open) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
        open = true;
        visiblePoints++;
      } else open = false;
    });
    if (visiblePoints < 3) return;
    ctx.closePath();
    ctx.fillStyle = isIndia ? '#d7ad6e' : '#315e69';
    ctx.fill();
    ctx.strokeStyle = isIndia ? '#f7d99c' : '#7fb7b6';
    ctx.lineWidth = isIndia ? 2.4 : 1.1;
    ctx.stroke();
  };

  const draw = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#75c3c03b';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center, center, radius + 24, -1.15, .2);
    ctx.strokeStyle = '#edbf7575';
    ctx.lineWidth = 2;
    ctx.stroke();

    const ocean = ctx.createRadialGradient(262, 209, 10, center, center, radius);
    ocean.addColorStop(0, '#244d62');
    ocean.addColorStop(.64, '#12374b');
    ocean.addColorStop(1, '#071d32');
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = ocean;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let lat = -75; lat <= 75; lat += 15) {
      drawLine(Array.from({ length: 181 }, (_, i) => [-180 + i * 2, lat]), '#8cc4c02b', 1);
    }
    for (let lon = -180; lon < 180; lon += 15) {
      drawLine(Array.from({ length: 89 }, (_, i) => [lon, -88 + i * 2]), '#8cc4c022', 1);
    }
    countries.forEach((feature) => {
      const geometry = feature.geometry;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      polygons.forEach((polygon) => polygon.forEach((ring) => drawRing(ring, feature.properties.iso === 'IND')));
    });
    [
      [74.2, 26.9],
      [75.7, 19.5],
      [85.8, 20.9]
    ].forEach((coordinate) => {
      const p = project(coordinate);
      if (p.depth <= .04) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#f2c77b33';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff0c5';
      ctx.fill();
      ctx.strokeStyle = '#10283e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();

    const shade = ctx.createLinearGradient(center - radius, 0, center + radius, 0);
    shade.addColorStop(0, '#041524a6');
    shade.addColorStop(.32, '#04152400');
    shade.addColorStop(.74, '#04152400');
    shade.addColorStop(1, '#03111ec9');
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.strokeStyle = '#9ac9c066';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  };

  const animate = (time) => {
    if (turning && visible && !document.hidden && !heldCard && lastTime) {
      const elapsed = Math.min(time - lastTime, 80);
      phase += elapsed * .00023;
      longitude = 78 + 25 * Math.sin(phase);
      signalTime = (signalTime + elapsed) % (leg * stops.length);
    }
    lastTime = time;
    if (time - lastDraw > 32 && visible && !document.hidden) {
      draw();
      updateSignal();
      lastDraw = time;
    }
    requestAnimationFrame(animate);
  };

  globeButton.setAttribute('aria-pressed', String(turning));
  globeButton.innerHTML = turning ? 'Pause rotation <span aria-hidden="true">Ⅱ</span>' : 'Start rotation <span aria-hidden="true">↻</span>';
  globeButton.addEventListener('click', () => {
    turning = !turning;
    globeButton.setAttribute('aria-pressed', String(turning));
    globeButton.innerHTML = turning ? 'Pause rotation <span aria-hidden="true">Ⅱ</span>' : 'Start rotation <span aria-hidden="true">↻</span>';
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; lastTime = 0; }, { threshold: .05 }).observe(globe);
  }
  draw();
  updateSignal();
  fetch('world-110m.json').then((response) => {
    if (!response.ok) throw new Error('Map data unavailable');
    return response.json();
  }).then((data) => { countries = data.features || []; draw(); }).catch(() => { draw(); });
  requestAnimationFrame(animate);
}

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
