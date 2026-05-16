// Ovellum default template — client-side enhancements.
// 1) Theme toggle (auto → light → dark) wired to <html data-theme="…">.
// 2) Copy button on every <pre> code block.
// 3) Mobile menu toggle (hamburger ↔ sheet).
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

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {}
  }

  // Theme toggle
  var btn = document.querySelector('[data-ov-theme-toggle]');
  if (btn) {
    btn.addEventListener('click', function () {
      var current = readStored();
      var next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      apply(next);
    });
  }

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

  // Copy buttons
  var blocks = document.querySelectorAll('.ov-prose pre');
  blocks.forEach(function (pre) {
    if (pre.querySelector('.ov-copy-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ov-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.innerText : pre.innerText;
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied';
        btn.classList.add('is-copied');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('is-copied');
        }, 1500);
      });
    });
    pre.appendChild(btn);
  });
})();
