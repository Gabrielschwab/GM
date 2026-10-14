(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky header state ---------- */
  var header = document.querySelector('.site-header');
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.hamburger');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    var closeMenu = function () {
      nav.setAttribute('data-open', 'false');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- Scrollspy ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = navLinks.filter(function (a) {
            return a.getAttribute('href') === '#' + entry.target.id;
          })[0];
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); });
            link.classList.add('active');
            link.setAttribute('aria-current', 'true');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal on scroll (Tier 0 — IntersectionObserver) ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Cookie / LGPD banner ---------- */
  var bar = document.getElementById('cookie-bar');
  if (bar) {
    if (!localStorage.getItem('cookie-consent')) bar.hidden = false;
    var setConsent = function (v) {
      try { localStorage.setItem('cookie-consent', v); } catch (e) {}
      bar.hidden = true;
    };
    var accept = document.getElementById('cookie-accept');
    var reject = document.getElementById('cookie-reject');
    if (accept) accept.addEventListener('click', function () { setConsent('accept'); });
    if (reject) reject.addEventListener('click', function () { setConsent('reject'); });
  }

  /* ---------- Contact form -> WhatsApp (no backend) ---------- */
  var form = document.getElementById('contato-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var nome = form.querySelector('#f-nome').value;
      var tel = form.querySelector('#f-telefone').value;
      var msg = form.querySelector('#f-mensagem').value;
      var text = 'Olá! Me chamo ' + nome + ' (tel: ' + tel + '). ' + msg;
      var url = 'https://wa.me/5531975153356?text=' + encodeURIComponent(text);
      window.open(url, '_blank', 'noopener');
      var status = document.getElementById('form-status');
      if (status) status.textContent = 'Abrindo o WhatsApp para enviar sua mensagem...';
      form.reset();
    });
  }

  /* ---------- Tier 2 motion (GSAP + Lenis), opt-in and reduced-motion gated ---------- */
  if (!reduce && window.gsap && window.ScrollTrigger && window.Lenis) {
    gsap.registerPlugin(ScrollTrigger);
    var lenis = new Lenis();
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);

    gsap.utils.toArray('.parallax-img').forEach(function (img) {
      gsap.to(img, {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }
})();
