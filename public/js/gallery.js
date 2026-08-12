/* Gallery rail behaviour — Soon Come Villa.
 *
 * The drift is decorative: it hints that the row continues past the edge. So it
 * is deliberately subordinate to the visitor.
 *   - hovering pauses it, and leaving resumes  (a glance should not cost you it)
 *   - scrolling, swiping, clicking, tabbing or pressing the button stops it for
 *     good — once someone is steering, taking the wheel back would be rude
 *   - it only runs while the rail is actually on screen
 *   - prefers-reduced-motion means it never starts, and the control is hidden
 *     rather than left there pretending
 *
 * Position is driven by scrollLeft, the same property the visitor's own
 * scrolling moves, so the two can never fight or jump.
 */
(function () {
  'use strict';

  var SPEED = 24;            // px/sec — slower than the 37 it replaces; readable
  var wrap, list, toggle, io;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var onScreen = false;      // rail is in the viewport
  var hovering = false;      // temporary pause
  var stopped  = false;      // permanent, user took control
  var raf = null, last = 0;
  var keyTarget = null;      // pending keyboard scroll destination

  function atEnd() {
    return wrap.scrollLeft >= wrap.scrollWidth - wrap.clientWidth - 1;
  }

  function shouldRun() {
    return onScreen && !hovering && !stopped && !reduce.matches && !atEnd();
  }

  function frame(now) {
    raf = null;
    if (!shouldRun()) { last = 0; return; }
    if (last) wrap.scrollLeft += SPEED * ((now - last) / 1000);
    last = now;
    raf = requestAnimationFrame(frame);
  }

  function tick() {
    if (raf || !shouldRun()) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stopForGood() {
    if (stopped) return;
    stopped = true;
    setToggle();
  }

  function setToggle() {
    if (!toggle) return;
    // aria-pressed=true means "paused" — the button then offers to play.
    var paused = stopped || reduce.matches;
    toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggle.querySelector('.scv-rail-label').textContent = paused ? 'Play' : 'Pause';
    toggle.setAttribute('aria-label',
      paused ? 'Play the gallery' : 'Pause the gallery');
  }

  function build() {
    var bar = document.createElement('div');
    bar.className = 'scv-rail-bar';
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'scv-rail-toggle';
    toggle.id = 'scv-rail-toggle';
    toggle.innerHTML = '<span class="scv-rail-icon" aria-hidden="true"></span>' +
                       '<span class="scv-rail-label">Pause</span>';
    toggle.addEventListener('click', function () {
      if (stopped) { stopped = false; setToggle(); tick(); }
      else { stopForGood(); }
    });
    bar.appendChild(toggle);
    wrap.parentNode.insertBefore(bar, wrap.nextSibling);
    setToggle();
  }

  function init() {
    wrap = document.querySelector('.gallery-marquee-wrap');
    list = wrap && wrap.querySelector('.gallery-marquee-list');
    if (!wrap || !list) return;

    // The rail is a scrollable region: name it and let it take keyboard focus,
    // so arrow keys reach every card.
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Photos of the villa');
    wrap.setAttribute('tabindex', '0');

    build();

    ['wheel', 'touchstart', 'pointerdown'].forEach(function (ev) {
      wrap.addEventListener(ev, function () {
        keyTarget = null;                       // they are steering by hand now
        stopForGood();
      }, { passive: true });
    });
    wrap.addEventListener('focusin', stopForGood);

    // Chrome does not reliably arrow-scroll a focused overflow container, so
    // drive it here rather than depending on that. One press moves one card.
    wrap.addEventListener('keydown', function (e) {
      stopForGood();
      var card = list.querySelector('.lightbox-link');
      var step = card ? card.getBoundingClientRect().width + 50 : 530;  // + the 50px gap
      // Accumulate against the pending target, not the live scrollLeft: during a
      // smooth scroll the latter is mid-flight, so quick repeats would each
      // measure from a half-finished position and fall short.
      var base = (keyTarget === null) ? wrap.scrollLeft : keyTarget;
      var to = null;
      if (e.key === 'ArrowRight') to = base + step;
      else if (e.key === 'ArrowLeft') to = base - step;
      else if (e.key === 'PageDown') to = base + wrap.clientWidth;
      else if (e.key === 'PageUp') to = base - wrap.clientWidth;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = wrap.scrollWidth;
      if (to === null) return;
      e.preventDefault();                       // keep the page from scrolling too
      keyTarget = Math.max(0, Math.min(to, wrap.scrollWidth - wrap.clientWidth));
      wrap.scrollTo({ left: keyTarget, behavior: reduce.matches ? 'auto' : 'smooth' });
    });

    wrap.addEventListener('mouseenter', function () { hovering = true; });
    wrap.addEventListener('mouseleave', function () { hovering = false; tick(); });

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        tick();
      }, { threshold: 0.25 });
      io.observe(wrap);
    } else {
      onScreen = true;
    }

    if (reduce.addEventListener) {
      reduce.addEventListener('change', function () { setToggle(); tick(); });
    }
    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
