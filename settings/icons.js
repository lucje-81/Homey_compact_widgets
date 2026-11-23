/* Shared icon drawings for the Climate widget and the settings page (copy: npm run sync-icons). */
(function () {
  'use strict';
  var SVG = function (p, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  function has(d, cap) { return !!d.caps && Object.prototype.hasOwnProperty.call(d.caps, cap); }
  function f(n) { return Math.round(n * 100) / 100; }
  function lines(x1, x2, y1, y2, step, vertical) {
    var out = '';
    if (vertical) for (var x = x1; x <= x2 + 0.01; x += step) out += 'M' + f(x) + ' ' + f(y1) + 'V' + f(y2);
    else for (var y = y1; y <= y2 + 0.01; y += step) out += 'M' + f(x1) + ' ' + f(y) + 'H' + f(x2);
    return out;
  }
  // Icons drawn for an opening fraction p (0 = closed, 1 = fully open)
  var GARAGE = '<path d="M2.5 10.5L12 4l9.5 6.5M4.5 9.2V20.5M19.5 9.2V20.5M2.5 20.5h19"/><path d="M6.5 11.5h11v9" opacity=".45"/><path d="M6.5 11.5v9"/>';
  var DRAW = {
    thermostat: function () { return '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" stroke-width="2"/><path d="M12 9v7" stroke-width="2"/>'; },
    power: function () { return '<path d="M12 3v8M7.5 6.5a7 7 0 1 0 9 0" stroke-width="2"/>'; },
    sectional: function (p) {
      var h = Math.max(1.2, 9 * (1 - p));
      return GARAGE + '<rect x="6.5" y="11.5" width="11" height="' + f(h) + '" fill="currentColor" fill-opacity=".18"/>'
        + '<path d="' + lines(6.5, 17.5, 11.5 + 2.25, 11.5 + h - 0.5, 2.25) + '"/>';
    },
    tilt: function (p) {
      var h = Math.max(1.2, 9 * (1 - p));
      return GARAGE + '<rect x="6.5" y="11.5" width="11" height="' + f(h) + '" fill="currentColor" fill-opacity=".18"/>'
        + (h > 2.5 ? '<path d="' + lines(8.7, 15.3, 12.3, 11.5 + h - 0.8, 2.2, true) + '" stroke-width="1.1"/>' : '');
    },
    roller: function (p) {
      var h = Math.max(0.1, 9 * (1 - p) - 1.4);
      return GARAGE + '<rect x="6" y="11" width="12" height="1.8" rx=".6" fill="currentColor"/>'
        + (h > 0.4 ? '<rect x="6.5" y="12.8" width="11" height="' + f(h) + '" fill="currentColor" fill-opacity=".18"/><path d="' + lines(6.5, 17.5, 13.9, 12.8 + h, 1.1) + '" stroke-width=".8"/>' : '');
    },
    swing: function (p) {
      var w = 8.2 * (1 - 0.72 * p), sk = 2.2 * p, out = '<path d="M3 6v14.5M21 6v14.5M2 20.5h20"/>';
      [[3.4, 1], [20.6, -1]].forEach(function (l) {
        var x0 = l[0], x1 = x0 + l[1] * w;
        out += '<path d="M' + x0 + ' 8L' + f(x1) + ' ' + f(8 + sk) + 'V' + f(19 + sk * 0.4) + 'L' + x0 + ' 19z" fill="currentColor" fill-opacity=".14"/>';
        for (var i = 1; i <= 3; i++) { var x = x0 + l[1] * w * i / 4; out += '<path d="M' + f(x) + ' ' + f(8 + sk * i / 4) + 'V' + f(19 + sk * 0.4 * i / 4) + '" stroke-width="1"/>'; }
      });
      return out;
    },
    sliding: function (p) {
      var x0 = 4 - 15 * p, x1 = 20 - 15 * p, vis0 = Math.max(x0, 0.8);
      var out = '<path d="M21 6.5v14M1 20.5h22"/>';
      if (x1 > 1.5) {
        out += '<path d="M' + f(vis0) + ' 8H' + f(x1) + 'V18.6H' + f(vis0) + '" fill="currentColor" fill-opacity=".14"/>';
        var bars = '';
        for (var x = x0 + 2.3; x < x1 - 0.5; x += 2.3) if (x > 1) bars += 'M' + f(x) + ' 8V18.6';
        out += '<path d="' + bars + '" stroke-width="1"/>';
        [x0 + 2.5, x1 - 2.5].forEach(function (c) { if (c > 1) out += '<circle cx="' + f(c) + '" cy="19.4" r="1" fill="currentColor" stroke="none"/>'; });
      }
      return out;
    },
    shutter: function (p) {
      var h = Math.max(0.1, 14 * (1 - p) - 2);
      return '<rect x="4" y="4" width="16" height="16" rx="1"/><rect x="4" y="4" width="16" height="2.6" fill="currentColor"/>'
        + (h > 0.4 ? '<rect x="4" y="6.6" width="16" height="' + f(h) + '" fill="currentColor" fill-opacity=".18"/><path d="' + lines(4, 20, 8.2, 6.6 + h, 1.6) + '" stroke-width=".9"/>' : '');
    },
    awning: function (p) {
      var reach = 3 + 13 * p, drop = 2 + 4 * p;
      return '<path d="M4 3v18M2 21h8"/><path d="M4 5L' + f(4 + reach) + ' ' + f(5 + drop) + 'v1.6" fill="none"/>'
        + '<path d="M4 5L' + f(4 + reach) + ' ' + f(5 + drop) + 'L4 ' + f(5 + drop * 0.3) + 'z" fill="currentColor" fill-opacity=".25" stroke="none"/>';
    },
  };
  var ICON_ORDER = ['auto', 'sectional', 'tilt', 'roller', 'swing', 'sliding', 'shutter', 'awning', 'thermostat', 'power'];
  var GATES = ['sectional', 'tilt', 'roller', 'swing', 'sliding'];

  // Icon guessed from capabilities, class and name; the user can override it per device
  function autoIcon(d) {
    var n = String(d.name || '').toLowerCase();
    var cls = d.virtualClass || d.class;
    if (has(d, 'target_temperature')) return 'thermostat';
    var gateLike = cls === 'garagedoor' || has(d, 'garagedoor_closed') || /poort|gate|hek|garage/.test(n);
    if (gateLike) {
      if (/kantel|tilt/.test(n)) return 'tilt';
      if (/oprol|roll/.test(n)) return 'roller';
      if (/sectio/.test(n)) return 'sectional';
      if (/schuif|slid|rolpoort/.test(n)) return 'sliding';
      if (/draai|vleugel|swing|tuin/.test(n)) return 'swing';
      return cls === 'garagedoor' || /garage/.test(n) ? 'sectional' : 'swing';
    }
    if (has(d, 'windowcoverings_set') || has(d, 'windowcoverings_state')) {
      return cls === 'awning' || /scherm|zonwering|knikarm|awning|screen/.test(n) ? 'awning' : 'shutter';
    }
    return 'power';
  }
  function iconSvg(name, p, cls) { return SVG((DRAW[name] || DRAW.power)(p == null ? 0 : Math.max(0, Math.min(1, p))), cls); }

  window.CompactIcons = { DRAW: DRAW, ICON_ORDER: ICON_ORDER, GATES: GATES, autoIcon: autoIcon, iconSvg: iconSvg, SVG: SVG };
})();
