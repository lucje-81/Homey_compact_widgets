/* Compact Widgets - gauge renderer, shared by the widget and the settings page.
 * Keep settings/gauge.js identical to widgets/gauges/public/gauge.js (npm run sync-gauge). */
(function (root) {
  'use strict';

  var SCHEMES = {
    gyr: ['#3f9b2d', '#f0a020', '#e0433f'], // green -> red (consumption, temperature)
    ryg: ['#e0433f', '#f0a020', '#3f9b2d'], // red -> green (battery level, charging)
    sun: ['#8a8a85', '#f0b020', '#f08a00'], // grey -> yellow (solar)
    blue: ['#3a7bd5', '#8a63d2', '#e0433f'], // blue -> red (cold -> hot)
    mono: ['#8a8a85', '#8a8a85', '#8a8a85'], // neutral
  };

  function hex(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  function mix(a, b, t) {
    var x = hex(a);
    var y = hex(b);
    return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')';
  }

  function colorAt(scheme, f) {
    var p = SCHEMES[scheme] || SCHEMES.gyr;
    f = Math.max(0, Math.min(1, f));
    return f < 0.5 ? mix(p[0], p[1], f * 2) : mix(p[1], p[2], (f - 0.5) * 2);
  }

  function point(cx, cy, r, f) {
    var a = Math.PI * (1 - f);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  }

  function arc(cx, cy, r, f0, f1) {
    var a = point(cx, cy, r, f0);
    var b = point(cx, cy, r, f1);
    return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function number(v, decimals) {
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  /** Format a value with its unit; W becomes kW from 1000 W. */
  function format(value, g) {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) return '–';
    var v = Number(value);
    var unit = g.unit || '';
    if (unit === 'W' && Math.abs(v) >= 1000) {
      v /= 1000;
      unit = 'kW';
      return number(v, 1).replace('-', '−') + ' ' + unit;
    }
    var d = (g.decimals === null || g.decimals === undefined || g.decimals === '')
      ? (Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0)
      : Number(g.decimals);
    var text = number(v, d).replace('-', '−');
    if (!unit) return text;
    return unit === '%' ? text + ' %' : text + ' ' + unit;
  }

  function shortNumber(n) {
    var a = Math.abs(n);
    var s = a >= 1000 ? (n / 1000) + 'k' : String(n);
    return s.replace('-', '−');
  }

  /**
   * SVG for one gauge.
   * g: { title, unit, min, max, scheme, fromZero, decimals }
   */
  function svg(g, value) {
    var W = 120;
    var H = 70;
    var cx = 60;
    var cy = 58;
    var r = 47;
    var sw = 8;
    var min = Number(g.min);
    var max = Number(g.max);
    if (!(max > min)) max = min + 1;
    var segs = 24;
    var out = '';
    var i;

    for (i = 0; i < segs; i++) {
      out += '<path d="' + arc(cx, cy, r, i / segs + 0.004, (i + 1) / segs - 0.004)
        + '" stroke="' + colorAt(g.scheme, (i + 0.5) / segs) + '" stroke-width="' + sw + '" fill="none" opacity="0.28"/>';
    }

    var has = !(value === null || value === undefined || isNaN(Number(value)));
    var f = has ? (Number(value) - min) / (max - min) : 0;
    f = Math.max(0, Math.min(1, f));
    var base = g.fromZero ? Math.max(0, Math.min(1, (0 - min) / (max - min))) : 0;

    if (has) {
      var lo = Math.min(base, f);
      var hi = Math.max(base, f);
      if (hi - lo > 0.003) {
        out += '<path d="' + arc(cx, cy, r, lo, hi) + '" stroke="' + colorAt(g.scheme, f) + '" stroke-width="' + sw + '" fill="none"/>';
      }
      var n1 = point(cx, cy, r - sw / 2 - 3, f);
      var n2 = point(cx, cy, r + sw / 2 + 3, f);
      out += '<line x1="' + n1[0].toFixed(1) + '" y1="' + n1[1].toFixed(1) + '" x2="' + n2[0].toFixed(1) + '" y2="' + n2[1].toFixed(1)
        + '" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
    }
    if (g.fromZero) {
      var z1 = point(cx, cy, r - sw / 2 - 1, base);
      var z2 = point(cx, cy, r + sw / 2 + 1, base);
      out += '<line x1="' + z1[0].toFixed(1) + '" y1="' + z1[1].toFixed(1) + '" x2="' + z2[0].toFixed(1) + '" y2="' + z2[1].toFixed(1)
        + '" stroke="currentColor" stroke-width="1" opacity="0.45"/>';
    }

    out += '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" fill="currentColor" style="font-size:15px;font-weight:600">'
      + esc(format(value, g)) + '</text>';
    out += '<text x="' + (cx - r) + '" y="' + (cy + 11) + '" text-anchor="middle" fill="currentColor" opacity="0.55" style="font-size:9px">'
      + esc(shortNumber(min)) + '</text>';
    out += '<text x="' + (cx + r) + '" y="' + (cy + 11) + '" text-anchor="middle" fill="currentColor" opacity="0.55" style="font-size:9px">'
      + esc(shortNumber(max)) + '</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(g.title) + ': ' + esc(format(value, g)) + '">' + out + '</svg>';
  }

  root.CompactGauge = { svg: svg, format: format, schemes: Object.keys(SCHEMES), colorAt: colorAt, esc: esc };
}(typeof window !== 'undefined' ? window : this));
