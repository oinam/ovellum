// Ovellum default template — client-side enhancements.
// 1) Theme toggle (auto → light → dark) wired to <html data-theme="…">.
// 2) Copy button on every <pre> code block.
// 3) Mobile menu toggle (hamburger ↔ sheet).
// 4) Cmd/Ctrl+K → focus the search input; small kbd hint chip in the box.
(function () {
  var STORAGE_KEY = 'ovellum-theme';
  var ORDER = ['auto', 'light', 'dark'];

  function readStored() {
    try {
      var t = localStorage.getItem(STORAGE_KEY);
      return ORDER.indexOf(t) >= 0 ? t : 'auto';
    } catch (_) {
      return 'auto';
    }
  }

  function syncThemeColor(theme) {
    var meta = document.getElementById('ov-theme-color');
    if (!meta) return;
    var effective = theme;
    if (theme === 'auto') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var next = meta.getAttribute(effective === 'dark' ? 'data-dark' : 'data-light');
    if (next) meta.setAttribute('content', next);
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeColor(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {}
  }

  // Theme toggle — there may be more than one instance (desktop cluster +
  // mobile sheet). Wire every button; they share state via <html data-theme>.
  document.querySelectorAll('[data-ov-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var current = readStored();
      var next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      apply(next);
    });
  });

  // When the user is on 'auto' and flips their OS theme, retune the
  // meta theme-color so Safari's URL bar follows the OS change.
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onMqChange = function () {
      if (readStored() === 'auto') syncThemeColor('auto');
    };
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);
    else if (mq.addListener) mq.addListener(onMqChange);
  } catch (_) {}

  // Mobile menu
  var menuBtn = document.querySelector('[data-ov-menu-toggle]');
  var mobileNav = document.getElementById('ov-mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
      mobileNav.classList.toggle('is-open', !open);
      document.body.classList.toggle('ov-menu-open', !open);
    });
    // Close the sheet when a link is tapped so the page doesn't paint with
    // it still open after navigation.
    mobileNav.addEventListener('click', function (e) {
      if (e.target && e.target.tagName === 'A') {
        menuBtn.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('is-open');
        document.body.classList.remove('ov-menu-open');
      }
    });
  }

  // Search: Cmd/Ctrl+K shortcut + a small kbd hint chip.
  var searchContainer = document.getElementById('ov-search');
  if (searchContainer) {
    var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

    // Pagefind UI mounts asynchronously. Poll briefly for its input, then add
    // the platform-aware hint chip and wire the shortcut.
    function withSearchInput(cb) {
      var input = searchContainer.querySelector('.pagefind-ui__search-input');
      if (input) {
        cb(input);
        return;
      }
      var tries = 0;
      var timer = setInterval(function () {
        var el = searchContainer.querySelector('.pagefind-ui__search-input');
        tries += 1;
        if (el) {
          clearInterval(timer);
          cb(el);
        } else if (tries > 40) {
          // ~4 s of waiting — Pagefind probably failed to load; give up
          // silently rather than spinning forever.
          clearInterval(timer);
        }
      }, 100);
    }

    withSearchInput(function (input) {
      if (!searchContainer.querySelector('.ov-search-kbd')) {
        var hint = document.createElement('span');
        hint.className = 'ov-search-kbd';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = isMac ? '⌘ K' : 'Ctrl K';
        searchContainer.appendChild(hint);
      }
    });

    document.addEventListener('keydown', function (e) {
      // Only react to plain Cmd+K (Mac) / Ctrl+K (Win/Linux). Ignore the
      // combo when the user is already typing in a field — they almost
      // certainly meant a browser shortcut (e.g. Ctrl+K to focus the
      // URL bar is still available in this case via the same input).
      if (e.key !== 'k' && e.key !== 'K') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.altKey || e.shiftKey) return;
      var t = e.target;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          (t.getAttribute && t.getAttribute('contenteditable') === 'true'))
      ) {
        // Allow if it's our own search input (Cmd+K inside the search
        // field is a no-op rather than an annoying preventDefault).
        if (!searchContainer.contains(t)) return;
      }
      var input = searchContainer.querySelector('.pagefind-ui__search-input');
      if (!input) return;
      e.preventDefault();
      input.focus();
      input.select();
    });
  }

  // Copy buttons — docs code blocks get a text "Copy" button (top-right,
  // hover-revealed); install snippets (inside .ov-install) get an icon button
  // (copy glyph → check) centered on the right edge.
  // Mirror of the copy/check icons in icons.ts (canonical source). Browser code
  // can't import the TS registry, so we inline identical SVG markup (Lucide
  // geometry, 16px, currentColor, decorative).
  var COPY_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  var CHECK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg>';

  var blocks = document.querySelectorAll('.ov-prose pre');
  blocks.forEach(function (pre) {
    if (pre.querySelector('.ov-copy-btn')) return;
    // Install snippets (inside .ov-install) get an icon button; docs code
    // blocks keep the original text "Copy" button. Captured per-pre so each
    // button keeps its own mode inside the closures below.
    var isInstall = !!(pre.closest && pre.closest('.ov-install'));
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ov-copy-btn';
    if (isInstall) {
      btn.innerHTML = COPY_ICON;
      btn.setAttribute('aria-label', 'Copy code');
      btn.title = 'Copy';
    } else {
      btn.textContent = 'Copy';
    }
    btn.addEventListener('click', function () {
      var override = pre.getAttribute('data-copy-text');
      var code = pre.querySelector('code');
      var text = override !== null ? override : (code ? code.innerText : pre.innerText);
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        if (isInstall) {
          btn.innerHTML = CHECK_ICON;
          btn.setAttribute('aria-label', 'Copied');
        } else {
          btn.textContent = 'Copied';
        }
        btn.classList.add('is-copied');
        setTimeout(function () {
          if (isInstall) {
            btn.innerHTML = COPY_ICON;
            btn.setAttribute('aria-label', 'Copy code');
          } else {
            btn.textContent = 'Copy';
          }
          btn.classList.remove('is-copied');
        }, 1500);
      });
    });
    pre.appendChild(btn);
  });

  // ToC scroll-spy
  //
  // Highlights the right-rail "On this page" link for whichever h2/h3 is
  // currently the most recently-passed-the-top-of-the-viewport. Uses one
  // IntersectionObserver with a tall negative rootMargin so the "active"
  // line activates a moment AFTER the heading scrolls past the topbar,
  // giving you visual feedback that you're inside that section's content
  // — not the moment the heading first appears at the very bottom of
  // the window.
  (function tocSpy() {
    var toc = document.querySelector('.ov-toc');
    if (!toc) return;
    var prose = document.querySelector('.ov-prose');
    if (!prose) return;
    var tocLinks = {};
    toc.querySelectorAll('a[href^="#"]').forEach(function (a) {
      tocLinks[decodeURIComponent(a.getAttribute('href').slice(1))] = a;
    });
    var ids = Object.keys(tocLinks);
    if (ids.length === 0) return;

    var headings = ids
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);
    if (headings.length === 0) return;

    var visible = new Set();

    function setActive(id) {
      ids.forEach(function (i) {
        var a = tocLinks[i];
        if (i === id) a.classList.add('is-current');
        else a.classList.remove('is-current');
      });
    }

    function recompute() {
      // Pick the LAST heading whose top is above the topbar offset — that's
      // "the section you're reading". Falls back to the first heading when
      // the viewport is still above all of them.
      var top = 96; // ≈ topbar + a touch of breathing room
      var current = headings[0];
      for (var i = 0; i < headings.length; i++) {
        var h = headings[i];
        var rect = h.getBoundingClientRect();
        if (rect.top - top <= 0) current = h;
        else break;
      }
      setActive(current.id);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) visible.add(e.target.id);
            else visible.delete(e.target.id);
          });
          recompute();
        },
        { rootMargin: '-96px 0px -60% 0px', threshold: 0 },
      );
      headings.forEach(function (h) {
        io.observe(h);
      });
    }

    // Even with IO, recompute on scroll so a fast user-scroll doesn't
    // leave the indicator stranded between intersect callbacks.
    var ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          recompute();
          ticking = false;
        });
      },
      { passive: true },
    );

    recompute();
  })();

  // Back-to-top: reveal the button past a scroll threshold; click scrolls up.
  (function backToTop() {
    var btn = document.querySelector('[data-ov-to-top]');
    if (!btn) return;
    var THRESHOLD = 600;
    function update() {
      if (window.scrollY > THRESHOLD) btn.classList.add('is-visible');
      else btn.classList.remove('is-visible');
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    // No `behavior` here on purpose: the smooth scroll (and its reduced-motion
    // opt-out) lives entirely in CSS via `html { scroll-behavior }`. The JS
    // just asks to go to the top; CSS decides whether to animate.
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0 });
    });
  })();
})();
