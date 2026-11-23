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
    const source = vid.querySelector('source[data-src]');
    const startVideo = () => {
      if (source && !source.src) { source.src = source.dataset.src; vid.load(); }
      vid.play().catch(() => {});
    };
    if (!reduce) {
      if (document.readyState === 'complete') startVideo();
      else window.addEventListener('load', startVideo, { once: true });
    }

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

  /* ---- Our Story: a rebar-mesh grid with light beams running along the bars ---- */
  $$('.story-bg').forEach((bg) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'story-grid';
    canvas.setAttribute('aria-hidden', 'true');
    bg.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const GAP = 56;
    const COLORS = ['90,6,16', '90,6,16', '19,39,58'];
    let W = 0, H = 0, ox = 0, oy = 0, cols = 0, rows = 0, beams = [], running = false, raf = 0;
    const pointer = { x: -9999, y: -9999 };
    const flashes = new Map();   // joint key -> brightness

    const newBeam = (fresh) => {
      const horiz = Math.random() < 0.5;
      const lane = horiz ? Math.round(Math.random() * rows) : Math.round(Math.random() * cols);
      const span = horiz ? W : H;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const len = 90 + Math.random() * 150;
      return {
        horiz, dir, len,
        pos: horiz ? oy + lane * GAP : ox + lane * GAP,
        head: fresh ? Math.random() * span : (dir > 0 ? -len : span + len),
        speed: 1.4 + Math.random() * 1.8,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      };
    };

    const resize = () => {
      const box = bg.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.width; H = box.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.floor(W / GAP); rows = Math.floor(H / GAP);
      ox = (W - cols * GAP) / 2; oy = (H - rows * GAP) / 2;
      const count = W < 768 ? 6 : 11;
      beams = Array.from({ length: count }, () => newBeam(true));
    };

    const drawGrid = () => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(11,11,11,0.075)';
      ctx.beginPath();
      for (let i = 0; i <= cols; i++) { const x = ox + i * GAP + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let j = 0; j <= rows; j++) { const y = oy + j * GAP + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      // tie-wire knots at each joint, like a rebar mesh
      ctx.fillStyle = 'rgba(11,11,11,0.16)';
      for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) ctx.fillRect(ox + i * GAP - 1, oy + j * GAP - 1, 2.5, 2.5);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      // soft crimson glow on the mesh around the cursor
      if (pointer.x > -999) {
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 170);
        g.addColorStop(0, 'rgba(90,6,16,0.10)');
        g.addColorStop(1, 'rgba(90,6,16,0)');
        ctx.fillStyle = g;
        ctx.fillRect(pointer.x - 170, pointer.y - 170, 340, 340);
      }
      for (const b of beams) {
        const tail = b.head - b.dir * b.len;
        const [x1, y1, x2, y2] = b.horiz ? [tail, b.pos, b.head, b.pos] : [b.pos, tail, b.pos, b.head];
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(${b.c},0)`);
        grad.addColorStop(1, `rgba(${b.c},0.85)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1 + 0.5, y1 + 0.5); ctx.lineTo(x2 + 0.5, y2 + 0.5); ctx.stroke();
        ctx.fillStyle = `rgba(${b.c},0.95)`;
        ctx.beginPath(); ctx.arc(x2 + 0.5, y2 + 0.5, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      // joints flare briefly when a beam passes through them
      for (const [key, a] of flashes) {
        const [x, y, c] = key.split('|');
        ctx.strokeStyle = `rgba(${c},${a * 0.7})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(+x + 0.5, +y + 0.5, 4 + (1 - a) * 9, 0, Math.PI * 2); ctx.stroke();
      }
    };

    const step = () => {
      for (let k = 0; k < beams.length; k++) {
        const b = beams[k];
        const before = b.head;
        b.head += b.dir * b.speed;
        const origin = b.horiz ? ox : oy;
        // did the head cross a joint this frame?
        const cellA = Math.floor((before - origin) / GAP), cellB = Math.floor((b.head - origin) / GAP);
        if (cellA !== cellB) {
          const at = origin + Math.max(cellA, cellB) * GAP;
          const key = b.horiz ? `${at}|${b.pos}|${b.c}` : `${b.pos}|${at}|${b.c}`;
          flashes.set(key, 1);
        }
        const span = b.horiz ? W : H;
        if ((b.dir > 0 && b.head - b.len > span) || (b.dir < 0 && b.head + b.len < 0)) beams[k] = newBeam(false);
      }
      for (const [key, a] of flashes) { if (a <= 0.04) flashes.delete(key); else flashes.set(key, a * 0.94); }
      draw();
      if (running) raf = requestAnimationFrame(step);
    };
    const play = () => { if (!running && !reduce) { running = true; raf = requestAnimationFrame(step); } };
    const pause = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    draw();
    window.addEventListener('resize', () => { resize(); draw(); });
    const story = bg.closest('.story') || bg;
    story.addEventListener('pointermove', (e) => {
      const r = bg.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    });
    story.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? play() : pause()))).observe(bg);
    } else {
      play();
    }
  });

  /* ---- products at a glance: the active name lights up, its image and brands show ---- */
  const plxItems = $$('.plx-item');
  let setPlx = () => {};
  let plxPinned = false;   // true while the desktop scroll is stepping through the list
  if (plxItems.length) {
    const imgs = $$('.plx-img');
    const card = document.querySelector('.plx-card');
    let cur = 0;
    setPlx = (i) => {
      if (i === cur) return;
      cur = i;
      plxItems.forEach((a, k) => a.classList.toggle('is-active', k === i));
      imgs.forEach((f) => f.classList.toggle('is-active', +f.dataset.i === i));
      if (card) {
        card.querySelector('.plx-num').textContent = plxItems[i].dataset.num;
        card.querySelector('.plx-brands').textContent = plxItems[i].dataset.brands;
        card.classList.remove('swap');
        void card.offsetWidth;
        card.classList.add('swap');
      }
    };
    plxItems.forEach((a) => {
      const i = +a.dataset.i;
      a.addEventListener('mouseenter', () => { if (!plxPinned) setPlx(i); });
      a.addEventListener('focus', () => { if (!plxPinned) setPlx(i); });
    });
  }

  /* ---- hero: the word after "your" rotates through what people build ---- */
  $$('.rotator').forEach((rot) => {
    const words = $$('.rot-word', rot);
    let i = 0;
    const fit = (w) => { rot.style.width = `${w.offsetWidth}px`; };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit(words[i]));
    fit(words[0]);
    window.addEventListener('resize', () => fit(words[i]));
    if (reduce || words.length < 2) return;

    const next = () => {
      const cur = words[i];
      i = (i + 1) % words.length;
      const nw = words[i];
      cur.classList.remove('is-on');
      cur.classList.add('is-out');
      nw.classList.add('is-on');
      fit(nw);
      // the chip gives a small springy bump as the word changes
      rot.classList.add('bump');
      setTimeout(() => rot.classList.remove('bump'), 320);
      // underline retracts, then redraws under the new word
      rot.style.setProperty('--bar', '0');
      setTimeout(() => rot.style.setProperty('--bar', '1'), 380);
      // park the old word back below, out of sight, ready for its next turn
      setTimeout(() => {
        cur.style.transition = 'none';
        cur.classList.remove('is-out');
        void cur.offsetWidth;
        cur.style.transition = '';
      }, 760);
    };
    setTimeout(() => setInterval(next, 2600), 1600);
  });

  /* ---- decorative clips load only when they scroll near the screen ---- */
  $$('video.lazy-video').forEach((v) => {
    const start = () => {
      if (!v.src) { v.src = v.dataset.src; v.load(); }
      if (!reduce) v.play().catch(() => {});
    };
    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) start();
        else if (v.src) v.pause();
      });
    }, { rootMargin: '300px 0px' }).observe(v);
  });

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
  const start = intro ? 0.45 : 0;
  if ($$('.hero').length) {
    const tl = gsap.timeline({ delay: start, defaults: { ease: 'power4.out' } });
    tl.fromTo('.hero-bg', { scale: 1.08, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' }, 0)
      .from('.hero .ln > span', { yPercent: 110, duration: 0.75, stagger: 0.07 }, 0.05)
      .from('.hero .eyebrow, .hero .lead, .hero .actions, .hero-meta', { y: 20, opacity: 0, duration: 0.55, stagger: 0.05 }, 0.15);

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
    const marks = $$('mark', p);
    const words = splitWords(p).map((w) => w.parentNode);
    const range = { trigger: p, start: 'top 85%', end: 'bottom 50%', scrub: 0.6 };
    // each word rises, sharpens and brightens in reading order
    gsap.fromTo(words, { opacity: 0.35, yPercent: 30, filter: 'blur(1.2px)' }, {
      opacity: 1, yPercent: 0, filter: 'blur(0px)', ease: 'power1.out', stagger: 0.1, scrollTrigger: range,
    });
    // key phrases draw a crimson underline as the reading reaches them
    marks.forEach((m) => {
      gsap.fromTo(m, { backgroundSize: '0% .09em' }, {
        backgroundSize: '100% .09em', ease: 'none',
        scrollTrigger: { trigger: m, start: 'top 64%', end: 'top 50%', scrub: 0.6 },
      });
    });
    const story = p.closest('.story');
    if (story) {
      gsap.fromTo(story.querySelector('.story-rail i'), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: range });
      gsap.from(story.querySelector('.story-sign'), {
        y: 24, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: story.querySelector('.story-sign'), start: 'top 92%' },
      });
    }
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
    const img = el.querySelector('img, video');
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

  // stat cards rise in, play their visual once, and replay it when clicked
  const stats = $$('.stat[data-vis]');
  if (stats.length) {
    gsap.from(stats, { y: 90, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

    const playVis = (card) => {
      const svg = card.querySelector('.stat-vis');
      const kind = card.dataset.vis;
      if (kind === 'ring') {
        gsap.fromTo(svg.querySelector('.ring-arc'), { strokeDashoffset: 1 }, { strokeDashoffset: 0.25, duration: 1.2, ease: 'power3.out' });
        gsap.fromTo(svg.querySelectorAll('.tick'), { opacity: 0.15 }, { opacity: 1, duration: 0.25, stagger: 0.04, ease: 'none' });
      } else if (kind === 'tiles') {
        gsap.fromTo(svg.querySelectorAll('.tile'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.6, stagger: 0.07, ease: 'back.out(2.6)' });
      } else if (kind === 'orbit') {
        gsap.to(svg.querySelector('.orbit'), { rotation: '+=360', svgOrigin: '50 50', duration: 1.4, ease: 'power3.inOut' });
        gsap.fromTo(svg.querySelectorAll('.dot'), { scale: 1.9, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.9, stagger: 0.04, ease: 'elastic.out(1, .5)' });
      } else if (kind === 'radar') {
        gsap.fromTo(svg.querySelectorAll('.burst'), { attr: { r: 5 }, opacity: 0.9 }, { attr: { r: 50 }, opacity: 0, duration: 1.1, stagger: 0.22, ease: 'power2.out' });
      }
    };

    const recount = (card) => {
      const el = card.querySelector('.count');
      const to = parseFloat(el.dataset.to);
      const suffix = el.dataset.suffix || '';
      const o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.1, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } });
    };

    const fire = (card, x, y) => {
      const r = card.getBoundingClientRect();
      const rip = document.createElement('span');
      rip.className = 'stat-ripple';
      rip.style.left = `${(x ?? r.left + r.width / 2) - r.left}px`;
      rip.style.top = `${(y ?? r.top + r.height / 2) - r.top}px`;
      card.appendChild(rip);
      rip.addEventListener('animationend', () => rip.remove());
      gsap.fromTo(card, { scale: 0.95 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, .45)' });
      recount(card);
      playVis(card);
    };

    stats.forEach((card) => {
      card.addEventListener('click', (e) => fire(card, e.clientX, e.clientY));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(card); }
      });
    });
    ScrollTrigger.create({
      trigger: '.stats', start: 'top 80%', once: true,
      onEnter: () => stats.forEach((c, i) => setTimeout(() => playVis(c), 300 + i * 150)),
    });
  }

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

  // the ticker strip and brand marquees lean with scroll velocity
  // (on the outer strips: the sliding tracks' CSS animation would override a transform set on them)
  const tracks = $$('.mq, .ticker');
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

  // "What sets us apart": cards tip up into place, then each icon draws itself
  if ($$('.acard').length) {
    const cards = $$('.acard');
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.apart', start: 'top 82%' } });
    tl.from(cards, { y: 90, rotationX: -18, opacity: 0, transformPerspective: 1100, transformOrigin: '50% 100%', duration: 1.1, ease: 'power3.out', stagger: 0.14 })
      .from($$('.acard-ico path'), { strokeDashoffset: 1, duration: 1, ease: 'power2.inOut', stagger: 0.08 }, 0.35)
      .from($$('.acard-num'), { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.14 }, 0.3);

    // hover: tilt toward the pointer, with a glare that follows it
    if (fine) {
      cards.forEach((c) => {
        const rx = gsap.quickTo(c, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        const ry = gsap.quickTo(c, 'rotationY', { duration: 0.6, ease: 'power3.out' });
        gsap.set(c, { transformPerspective: 1100 });
        c.addEventListener('pointermove', (e) => {
          const r = c.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          c.style.setProperty('--mx', `${px * 100}%`);
          c.style.setProperty('--my', `${py * 100}%`);
          rx((0.5 - py) * 10);
          ry((px - 0.5) * 12);
        });
        c.addEventListener('pointerleave', () => { rx(0); ry(0); });
      });
    }
  }

  // products at a glance: names rise in, and on desktop the one passing mid-screen becomes active
  if (plxItems.length) {
    gsap.from(plxItems, { y: 40, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.plx-list', start: 'top 85%' } });
    // desktop: on the first pass down, hold the list and step through every product;
    // after that (or when coming back up into it) it scrolls by like any other section
    gsap.matchMedia().add('(min-width: 1021px)', () => {
      const plx = document.querySelector('.plx');
      const stage = document.querySelector('.plx-stage');
      const n = plxItems.length;
      const follow = [];
      let released = false;

      const release = () => {
        if (released) return;
        released = true;
        plxPinned = false;
        // remove the held scroll distance and shift the scroll by the same amount, so nothing jumps
        const y = window.scrollY - (st.end - st.start);
        st.kill();
        ScrollTrigger.refresh();
        if (lenis) { lenis.resize(); lenis.scrollTo(y, { immediate: true, force: true }); } else { window.scrollTo(0, y); }
        // from now on the active product simply follows the scroll
        plxItems.forEach((a) => follow.push(ScrollTrigger.create({
          trigger: a, start: 'top 60%', end: 'bottom 60%',
          onToggle: (self) => { if (self.isActive) setPlx(+a.dataset.i); },
        })));
      };

      const st = ScrollTrigger.create({
        trigger: plx, start: 'center center', end: `+=${n * 60}%`,
        pin: true, anticipatePin: 1,
        onToggle: (self) => { plxPinned = self.isActive; },
        onUpdate: (self) => {
          const i = Math.min(n - 1, Math.floor(self.progress * n));
          setPlx(i);
          // how far through the current product (0 to 1): photo sets drift at different speeds with it
          stage.style.setProperty('--sp', Math.min(1, self.progress * n - i).toFixed(3));
        },
        onLeave: () => requestAnimationFrame(release),       // finished the list going down
        onEnterBack: () => requestAnimationFrame(release),   // coming back up from below: no hold
      });
      // page opened (or restored) already below the list: never hold it
      if (window.scrollY > st.end) requestAnimationFrame(release);

      return () => { st.kill(); follow.forEach((t) => t.kill()); };
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
