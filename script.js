(() => {
  const html = document.documentElement;
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  const curtain = document.querySelector('.curtain');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- buttons: rolling label and a turning arrow ---- */
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const rollLabel = (el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const label = document.createElement('span');
    label.className = 'btn-label';
    label.dataset.text = text;
    label.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.textContent = text;
    label.appendChild(inner);
    el.appendChild(label);
  };
  $$('.btn').forEach((b) => {
    rollLabel(b);
    b.insertAdjacentHTML('beforeend', `<span class="btn-icon" aria-hidden="true">${ARROW}</span>`);
    b.classList.add('has-icon');
  });
  $$('.menu-cta').forEach(rollLabel);

  /* ---- header: solid after scroll, hide on the way down, progress hairline ---- */
  const bar = document.createElement('i');
  bar.className = 'progress';
  nav.appendChild(bar);
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    if (!menu.classList.contains('open')) {
      if (y > 240 && y > lastY + 2) nav.classList.add('hide');
      if (y < lastY - 2) nav.classList.remove('hide');
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
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

  /* ---- material guide tabs (all panels stay visible without JS) ---- */
  $$('[data-tabs]').forEach((box) => {
    box.classList.add('tabs-on');
    const tabs = $$('[role="tab"]', box);
    const show = (btn, animate) => {
      tabs.forEach((t) => {
        const on = t === btn;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (animate && hasGsap && !reduce) {
        gsap.from(`#${btn.getAttribute('aria-controls')} tr`, { y: 18, opacity: 0, duration: 0.55, ease: 'power2.out', stagger: 0.05 });
      }
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t, true));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        next.focus();
        show(next, true);
      });
    });
    show(tabs[0], false);
  });

  /* ---- hero time-lapse: no autoplay for reduced motion ---- */
  const vid = document.querySelector('.hero-bg');
  if (vid) {
    if (reduce) vid.pause();

    // dip to charcoal as the day ends, so the loop back to night is not a hard cut
    const dip = document.createElement('div');
    dip.className = 'hero-dip';
    dip.setAttribute('aria-hidden', 'true');
    vid.after(dip);
    vid.addEventListener('timeupdate', () => {
      const left = vid.duration - vid.currentTime;
      dip.classList.toggle('on', left < 1.1 || vid.currentTime < 0.35);
    });
  }

  /* ---- page transitions: the curtain lifts on arrival (CSS) and drops before leaving ---- */
  const intro = html.classList.contains('intro');
  if (curtain && hasGsap && !reduce) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$/.test(url.pathname) || (url.pathname === location.pathname && url.hash)) return;
      e.preventDefault();
      curtain.style.animation = 'none';
      gsap.fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.65, ease: 'power3.inOut', onComplete: () => { location.href = url.href; } });
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(curtain, { yPercent: -100 }); });
  }

  if (!hasGsap || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---- weighted smooth scrolling ---- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"], a[href*=".html#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const url = new URL(a.href, location.href);
        if (url.pathname !== location.pathname || !url.hash) return;
        const target = document.querySelector(url.hash);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -100 });
      });
    });
  }

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

  // the hero starts as the curtain lifts
  const start = intro ? 1.75 : 0.55;
  if ($$('.hero').length) {
    const tl = gsap.timeline({ delay: start, defaults: { ease: 'power4.out' } });
    tl.fromTo('.hero-bg', { scale: 1.18, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.6, ease: 'power3.out' }, 0)
      .from('.hero .ln > span', { yPercent: 120, duration: 1.3, stagger: 0.14 }, 0.3)
      .from('.hero .eyebrow, .hero .lead, .hero .actions, .hero-meta', { y: 32, opacity: 0, duration: 1, stagger: 0.1 }, '-=0.9');

    // the video drifts slower than the page, like looking through a window
    gsap.to('.hero-bg', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { y: -60, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true } });
  }

  // headings rise word by word (page titles wait for the curtain)
  $$('.split-words, .page-head h1').forEach((h) => {
    const words = splitWords(h);
    const inHead = !!h.closest('.page-head');
    gsap.from(words, {
      yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.05, delay: inHead ? start : 0,
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

  // About: Leon Steels is struck through, the arrow draws, the new name rises
  $$('[data-rename]').forEach((r) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: r, start: 'top 85%' } });
    tl.from(r.querySelector('.old'), { opacity: 0, x: -20, duration: 0.6, ease: 'power3.out' })
      .from(r.querySelector('.strike'), { scaleX: 0, duration: 0.7, ease: 'power3.inOut' }, '+=0.15')
      .from(r.querySelector('.rename-arrow path'), { strokeDashoffset: 80, duration: 0.7, ease: 'power2.inOut' }, '-=0.3')
      .from(splitWords(r.querySelector('.new')), { yPercent: 110, duration: 0.9, ease: 'power4.out', stagger: 0.08 }, '-=0.3');
  });

  // About: the statement lights up word by word as it scrolls past
  $$('[data-highlight]').forEach((p) => {
    const words = splitWords(p).map((w) => w.parentNode);
    gsap.fromTo(words, { opacity: 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 48%', scrub: true },
    });
  });

  // About: collage pieces move at different depths
  if ($$('.collage').length) {
    gsap.fromTo('.c-sub', { y: 70 }, { y: -50, ease: 'none', scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.c-card', { y: 50 }, { y: -70, ease: 'none', scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.c-tag', { y: 30 }, { y: -30, ease: 'none', scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.c-card, .c-tag', { scale: 0.8, opacity: 0, duration: 1, ease: 'back.out(1.6)', stagger: 0.15, scrollTrigger: { trigger: '.collage', start: 'top 75%' } });
  }

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

  // brand marquees lean with scroll velocity
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

  // products and contact pages
  $$('.prow > div').forEach((el) => {
    gsap.from(el.children, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.form, .details, .free, .areas, .quick, .tabs, .faq-list details').forEach((el) => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });

  // buttons ease gently toward the cursor
  if (fine) {
    $$('.btn, .menu-cta').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.22);
        yTo((e.clientY - r.top - r.height / 2) * 0.32);
      });
      b.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
