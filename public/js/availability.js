/* Hero availability check — Soon Come Villa.
 *
 * Answers "are my dates free, and what does that cost" in the hero, instead of
 * making the guest browse to /rooms and only meet a date picker on the third
 * screen. Rates, minimum stay and occupancy limits all come from /api/units and
 * /api/availability — the same endpoints the booking pages use — so nothing
 * about pricing or availability is duplicated here. The reservation itself is
 * still created (and re-priced) server-side on the booking page.
 */
(function () {
  'use strict';

  var PHONE = '+18762355881';
  var PHONE_LABEL = '876-235-5881';
  var ROOM_COUNT = 4;

  /* Used only if /api/units cannot be reached, so the module still gives a
     sensible answer rather than failing shut. Server figures are authoritative. */
  var FALLBACK = {
    'entire-villa': { nightly_rate: 600, min_nights: 2, max_guests: 8 },
    'room-1':       { nightly_rate: 160, min_nights: 2, max_guests: 2 }
  };

  var el, form, answer, goBtn;
  var unitsPromise = null;

  /* ---- helpers --------------------------------------------------------- */

  function ymd(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function nightsBetween(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }

  function money(n) {
    return 'US$' + Math.round(n).toLocaleString('en-US');
  }

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  function esc(s) {
    return String(s).replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
    });
  }

  function bookingHref(path, checkIn, checkOut, guests) {
    return path + '?checkIn=' + encodeURIComponent(checkIn) +
      '&checkOut=' + encodeURIComponent(checkOut) +
      '&guests=' + encodeURIComponent(guests);
  }

  function fetchUnits() {
    if (unitsPromise) return unitsPromise;
    unitsPromise = fetch('/api/units')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        var by = {};
        (d.units || []).forEach(function (u) { by[u.slug] = u; });
        return {
          villa: by['entire-villa'] || FALLBACK['entire-villa'],
          room: by['room-1'] || FALLBACK['room-1']
        };
      })
      .catch(function () {
        unitsPromise = null;                       // let a later attempt retry
        return { villa: FALLBACK['entire-villa'], room: FALLBACK['room-1'] };
      });
    return unitsPromise;
  }

  function checkUnit(unit, checkIn, checkOut) {
    var qs = '?unit=' + unit + '&checkIn=' + checkIn + '&checkOut=' + checkOut;
    return fetch('/api/availability' + qs).then(function (r) {
      if (!r.ok) throw new Error('availability');
      return r.json();
    });
  }

  /* ---- rendering ------------------------------------------------------- */

  function render(state, headline, meta, actions) {
    el.setAttribute('data-state', state);
    answer.innerHTML =
      '<div class="scv-av__panel">' +
        '<p class="scv-av__headline">' + headline + '</p>' +
        (meta ? '<p class="scv-av__meta">' + meta + '</p>' : '') +
        '<div class="scv-av__actions">' + (actions || '') + '</div>' +
      '</div>';
  }

  function notice(headline, meta, actions) {
    render('notice', headline, meta, actions);
  }

  function reserveLink(href, label) {
    return '<a class="scv-av__reserve" href="' + href + '">' + label + '</a>';
  }

  function altLink(href, label) {
    return '<a class="scv-av__alt" href="' + href + '">' + label + '</a>';
  }

  function callLink() {
    return '<a class="scv-av__alt" href="tel:' + PHONE + '">Call ' + PHONE_LABEL + '</a>';
  }

  /* ---- the answer ------------------------------------------------------ */

  function answerFor(o) {
    var nights = o.nights;
    var guests = o.guests;
    var nightWord = plural(nights, 'night', 'nights');
    var villaTotal = nights * Number(o.villa.nightly_rate);
    var roomTotal = nights * Number(o.room.nightly_rate);
    var roomMax = Number(o.room.max_guests) || 2;
    var villaHref = bookingHref('/entire-villa', o.checkIn, o.checkOut, guests);
    var roomHref = bookingHref('/book-room', o.checkIn, o.checkOut, Math.min(guests, roomMax));

    /* A party too big for one room needs the whole estate. */
    var needsVilla = guests > roomMax;

    if (o.villaFree && (needsVilla || o.freeRooms === 0 || guests > roomMax)) {
      return render('answered',
        'The whole villa is yours.',
        nights + ' ' + nightWord + ' &middot; ' + money(villaTotal) +
          ' total &middot; sleeps ' + o.villa.max_guests,
        reserveLink(villaHref, 'Reserve these dates'));
    }

    if (o.villaFree) {
      /* Small party, everything open: lead with the cheaper fit, offer the estate. */
      return render('answered',
        'Both are free — take your pick.',
        'A room is ' + money(roomTotal) + ' for ' + nights + ' ' + nightWord +
          '. The whole villa is ' + money(villaTotal) + '.',
        reserveLink(roomHref, 'Reserve a room') +
          altLink(villaHref, 'Take the whole villa instead'));
    }

    if (o.freeRooms > 0 && !needsVilla) {
      return render('answered',
        o.freeRooms + ' of ' + ROOM_COUNT + ' rooms ' +
          plural(o.freeRooms, 'is', 'are') + ' free.',
        nights + ' ' + nightWord + ' &middot; ' + money(roomTotal) +
          ' total &middot; sleeps ' + roomMax + ' per room',
        reserveLink(roomHref, 'Reserve a room'));
    }

    if (o.freeRooms > 0 && needsVilla) {
      return notice(
        'Not enough room for ' + guests + ' on those nights.',
        'The estate is partly booked — ' + o.freeRooms + ' of ' + ROOM_COUNT +
          ' ' + plural(o.freeRooms, 'room is', 'rooms are') +
          ' still open. We can often make a larger party work.',
        altLink('contact-us.html', 'Tell us what you need') + callLink());
    }

    return notice(
      'Those nights are taken.',
      'Try another arrival date, or tell us roughly when you want to come and we will find something.',
      altLink('contact-us.html', 'Tell us what you need') + callLink());
  }

  /* ---- submit ---------------------------------------------------------- */

  function onSubmit(e) {
    e.preventDefault();

    var checkIn = form.checkIn.value;
    var checkOut = form.checkOut.value;
    var guests = parseInt(form.guests.value, 10);
    var today = ymd(new Date());

    if (!checkIn || !checkOut) {
      return notice('Pick an arrival and a departure date.', '', '');
    }
    if (checkIn < today) {
      return notice('Arrival cannot be in the past.', 'Choose a date from today onwards.', '');
    }
    if (checkOut <= checkIn) {
      return notice('Departure has to be after arrival.', '', '');
    }
    if (!guests || guests < 1) {
      return notice('Tell us how many are coming.', '', '');
    }

    el.setAttribute('data-state', 'checking');
    answer.innerHTML =
      '<div class="scv-av__panel"><p class="scv-av__headline">Checking those nights…</p></div>';
    goBtn.disabled = true;

    fetchUnits().then(function (units) {
      var minNights = Number(units.villa.min_nights) || 2;
      var nights = nightsBetween(checkIn, checkOut);
      var villaMax = Number(units.villa.max_guests) || 8;

      if (nights < minNights) {
        goBtn.disabled = false;
        return notice(
          'Stays are a minimum of ' + minNights + ' nights.',
          'Extend your departure by ' + (minNights - nights) + ' ' +
            plural(minNights - nights, 'night', 'nights') + ' and we will check again.',
          '');
      }
      if (guests > villaMax) {
        goBtn.disabled = false;
        return notice(
          'We sleep up to ' + villaMax + ' guests.',
          'For a larger group the ballroom hosts over 100 for the day — or tell us what you are planning.',
          altLink('ballroom.html', 'See the ballroom') +
            altLink('contact-us.html', 'Tell us what you need'));
      }

      return Promise.all([
        checkUnit('entire-villa', checkIn, checkOut),
        checkUnit('room', checkIn, checkOut)
      ]).then(function (res) {
        goBtn.disabled = false;
        var conflicts = (res[1].conflictUnits || []).length;
        answerFor({
          checkIn: checkIn,
          checkOut: checkOut,
          guests: guests,
          nights: nights,
          villa: units.villa,
          room: units.room,
          villaFree: !!res[0].available,
          freeRooms: Math.max(0, ROOM_COUNT - conflicts)
        });
      });
    }).catch(function () {
      goBtn.disabled = false;
      notice(
        'We could not check those nights just now.',
        'Try again in a moment, or reach us directly and we will confirm by hand.',
        callLink() + altLink('contact-us.html', 'Send a message'));
    });
  }

  /* ---- placement ------------------------------------------------------- */

  /* Below 480px the Webflow hero (.hero-fixed-image-wrapper) is display:none,
     so the module moves under the navbar and takes its solid treatment. */
  function place(mq) {
    var hero = document.getElementById('scv-av-hero-mount');
    var docked = document.getElementById('scv-av-mobile-mount');
    var target = mq.matches ? docked : hero;
    if (!target || el.parentNode === target) return;
    target.appendChild(el);
    el.classList.toggle('scv-av--docked', mq.matches);
  }

  /* ---- init ------------------------------------------------------------ */

  function init() {
    el = document.getElementById('scv-av');
    if (!el) return;
    form = document.getElementById('scv-av-form');
    answer = document.getElementById('scv-av-answer');
    goBtn = form.querySelector('.scv-av__go');

    var today = ymd(new Date());
    form.checkIn.min = today;
    form.checkOut.min = today;

    /* Departure can never precede arrival. */
    form.checkIn.addEventListener('change', function () {
      form.checkOut.min = form.checkIn.value || today;
      if (form.checkOut.value && form.checkOut.value <= form.checkIn.value) {
        form.checkOut.value = '';
      }
    });

    form.addEventListener('submit', onSubmit);

    var mq = window.matchMedia('(max-width: 479px)');
    place(mq);
    if (mq.addEventListener) mq.addEventListener('change', function () { place(mq); });
    else if (mq.addListener) mq.addListener(function () { place(mq); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
