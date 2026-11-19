(() => {
  const html = document.documentElement;
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- header: solid after scroll, hide on scroll down, show on scroll up ---- */
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    if (!menu.classList.contains('open')) {
      nav.classList.toggle('hide', y > 240 && y > lastY + 2);
      if (y < lastY - 2) nav.classList.remove('hide');
    }
    lastY = y;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('locked', open);
    nav.classList.remove('hide');
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---- scroll animation (GSAP + ScrollTrigger). Content stays visible if it is unavailable. ---- */
  if (!window.gsap || !window.ScrollTrigger || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // wrap every word in a masked span so headings can rise line by line
  const splitWords = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span');
            o.className = 'w';
            const i = document.createElement('span');
            i.textContent = t;
            o.appendChild(i);
            frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
    return $$('.w > span', el);
  };

  // hero intro
  if ($$('.hero').length) {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.hero .ln > span', { yPercent: 120, duration: 1.3, stagger: 0.14 })
      .from('.hero .eyebrow, .hero .lead, .hero .actions', { y: 32, opacity: 0, duration: 1, stagger: 0.12 }, '-=0.9')
      .fromTo('.hero .arch', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power3.inOut' }, 0.15)
      .from('.hero .arch img', { scale: 1.35, duration: 2, ease: 'power3.out' }, 0.15)
      .from('.hero .badge', { scale: 0, rotate: -120, duration: 1.1, ease: 'back.out(1.7)' }, '-=0.9');

    gsap.to('.hero .arch img', { yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { y: -50, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true } });
    gsap.to('.hero-art', { y: 60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.badge svg', { rotate: 360, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
  }

  // headings rise word by word
  $$('.split-words, .page-head h1').forEach((h) => {
    const words = splitWords(h);
    gsap.from(words, {
      yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.05,
      scrollTrigger: { trigger: h, start: 'top 90%' },
    });
  });

  // simple fade-and-rise
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', delay: parseFloat(el.dataset.delay || 0),
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // groups that rise one after another
  $$('[data-stagger]').forEach((g) => {
    gsap.from(g.children, {
      y: 90, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: g, start: 'top 85%' },
    });
  });

  // images open out of a frame and drift as you scroll
  $$('.imgwrap').forEach((el) => {
    gsap.fromTo(el,
      { clipPath: 'inset(16% 16% 16% 16% round 40px)', opacity: 0 },
      { clipPath: 'inset(0% 0% 0% 0% round 24px)', opacity: 1, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
    const img = el.querySelector('img');
    if (img) {
      gsap.fromTo(img, { yPercent: -9, scale: 1.2 }, {
        yPercent: 9, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  });

  // staggered columns of product tiles move at different speeds
  $$('.tcol').forEach((col) => {
    const d = parseFloat(col.dataset.y || 0);
    gsap.fromTo(col, { y: d }, {
      y: -d, ease: 'none',
      scrollTrigger: { trigger: '.tiles', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
    });
  });

  // numbers count up
  $$('.count').forEach((el) => {
    const to = parseFloat(el.dataset.to);
    const suffix = el.dataset.suffix || '';
    const o = { v: 0 };
    el.textContent = '0' + suffix;
    gsap.to(o, {
      v: to, duration: 2, ease: 'power2.out',
      onUpdate: () => { el.textContent = Math.round(o.v) + suffix; },
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  // journey timeline draws itself as you scroll
  if ($$('.timeline').length) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1021px)', () => {
      gsap.fromTo('.tl-line', { scaleX: 0 }, { scaleX: 1, ease: 'none', transformOrigin: 'left center', scrollTrigger: { trigger: '.timeline', start: 'top 75%', end: 'bottom 55%', scrub: true } });
    });
    mm.add('(max-width: 1020px)', () => {
      gsap.fromTo('.tl-line', { scaleY: 0 }, { scaleY: 1, ease: 'none', transformOrigin: 'center top', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true } });
    });
    $$('.step').forEach((s, i) => {
      gsap.from(s, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', delay: i * 0.05, scrollTrigger: { trigger: s, start: 'top 88%' } });
    });
  }

  // brand marquees: speed up and lean with scroll velocity
  const tracks = $$('.mq-track');
  if (tracks.length) {
    let t;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-10, 10, self.getVelocity() / -350);
        gsap.to(tracks, { skewX: v, duration: 0.4, overwrite: true });
        clearTimeout(t);
        t = setTimeout(() => gsap.to(tracks, { skewX: 0, duration: 0.9, ease: 'power3.out', overwrite: true }), 90);
      },
    });
  }

  // principle cards fan in
  if ($$('.pcards').length) {
    gsap.from('.pcard', {
      y: 140, rotate: (i) => (i % 2 ? 5 : -5), opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.pcards', start: 'top 85%' },
    });
  }

  // products page rows
  $$('.prow > div').forEach((el) => {
    gsap.from(el.children, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.form, .details, .free, .areas').forEach((el) => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
