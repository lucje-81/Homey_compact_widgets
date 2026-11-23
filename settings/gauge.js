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

  function number(v, decimals, locale) {
    try {
      return Number(v).toLocaleString(locale || undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    } catch (e) {
      return Number(v).toFixed(decimals);
    }
  }

  /** Format a value with its unit; W becomes kW from 1000 W. locale: e.g. 'nl' (Homey language). */
  function format(value, g, locale) {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) return '–';
    var v = Number(value);
    var unit = g.unit || '';
    if (unit === 'W' && Math.abs(v) >= 1000) {
      v /= 1000;
      unit = 'kW';
      return number(v, 1, locale).replace('-', '−') + ' ' + unit;
    }
    var d = (g.decimals === null || g.decimals === undefined || g.decimals === '')
      ? (Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0)
      : Number(g.decimals);
    var text = number(v, d, locale).replace('-', '−');
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
  function svg(g, value, locale) {
    var W = 120;
    var H = 76;
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
      + esc(format(value, g, locale)) + '</text>';
    out += '<text x="' + (cx - r) + '" y="' + (cy + 11) + '" text-anchor="middle" fill="currentColor" opacity="0.55" style="font-size:9px">'
      + esc(shortNumber(min)) + '</text>';
    out += '<text x="' + (cx + r) + '" y="' + (cy + 11) + '" text-anchor="middle" fill="currentColor" opacity="0.55" style="font-size:9px">'
      + esc(shortNumber(max)) + '</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(g.title) + ': ' + esc(format(value, g, locale)) + '">' + out + '</svg>';
  }

  // ---------------------------------------------------------------------------
  // Bars (same scale, colours, from-0 and needle as the gauge)
  // ---------------------------------------------------------------------------

  function frac(g, value) {
    var min = Number(g.min);
    var max = Number(g.max);
    if (!(max > min)) max = min + 1;
    var has = !(value === null || value === undefined || isNaN(Number(value)));
    var f = has ? Math.max(0, Math.min(1, (Number(value) - min) / (max - min))) : 0;
    var base = g.fromZero ? Math.max(0, Math.min(1, (0 - min) / (max - min))) : 0;
    return { min: min, max: max, has: has, f: f, base: base };
  }

  /** Horizontal bar: full widget width, title left and value right above the bar (HTML). */
  function hbar(g, value, locale) {
    var x = frac(g, value);
    var segs = '';
    for (var i = 0; i < 24; i++) segs += '<span class="seg" style="background:' + colorAt(g.scheme, (i + 0.5) / 24) + '"></span>';
    var extra = '';
    if (x.has) {
      var lo = Math.min(x.base, x.f);
      var hi = Math.max(x.base, x.f);
      if (hi - lo > 0.003) {
        extra += '<span class="cg-fill" style="left:' + (lo * 100).toFixed(2) + '%;width:' + ((hi - lo) * 100).toFixed(2)
          + '%;background:' + colorAt(g.scheme, x.f) + '"></span>';
      }
      extra += '<span class="cg-needle" style="left:' + (x.f * 100).toFixed(2) + '%"></span>';
    }
    if (g.fromZero) extra += '<span class="cg-zero" style="left:' + (x.base * 100).toFixed(2) + '%"></span>';
    return '<div class="cg-hbar-head"><span class="cg-title">' + esc(g.title) + '</span><span class="cg-val">'
      + esc(format(value, g, locale)) + '</span></div>'
      + '<div class="cg-track" role="img" aria-label="' + esc(g.title) + ': ' + esc(format(value, g, locale)) + '">' + segs + extra + '</div>'
      + '<div class="cg-scale"><span>' + esc(shortNumber(x.min)) + '</span><span>' + esc(shortNumber(x.max)) + '</span></div>';
  }

  /** Vertical bar: value on top, bar below, min/max at the left (SVG). */
  function vbar(g, value, locale) {
    var x = frac(g, value);
    var W = 60;
    var H = 120;
    var bx = 30;
    var bw = 11;
    var top = 24;
    var bottom = 112;
    var len = bottom - top;
    var segs = 20;
    var out = '';
    var yAt = function (f) { return bottom - f * len; };
    for (var i = 0; i < segs; i++) {
      var y1 = yAt((i + 1) / segs) + 0.6;
      var y0 = yAt(i / segs) - 0.6;
      out += '<rect x="' + bx + '" y="' + y1.toFixed(1) + '" width="' + bw + '" height="' + (y0 - y1).toFixed(1)
        + '" rx="1" fill="' + colorAt(g.scheme, (i + 0.5) / segs) + '" opacity="0.28"/>';
    }
    if (x.has) {
      var lo = Math.min(x.base, x.f);
      var hi = Math.max(x.base, x.f);
      if (hi - lo > 0.003) {
        out += '<rect x="' + bx + '" y="' + yAt(hi).toFixed(1) + '" width="' + bw + '" height="' + (yAt(lo) - yAt(hi)).toFixed(1)
          + '" rx="2" fill="' + colorAt(g.scheme, x.f) + '"/>';
      }
      out += '<line x1="' + (bx - 3) + '" x2="' + (bx + bw + 3) + '" y1="' + yAt(x.f).toFixed(1) + '" y2="' + yAt(x.f).toFixed(1)
        + '" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
    }
    if (g.fromZero) {
      out += '<line x1="' + (bx - 1) + '" x2="' + (bx + bw + 1) + '" y1="' + yAt(x.base).toFixed(1) + '" y2="' + yAt(x.base).toFixed(1)
        + '" stroke="currentColor" stroke-width="1" opacity="0.45"/>';
    }
    out += '<text x="' + (W / 2) + '" y="15" text-anchor="middle" fill="currentColor" style="font-size:14px;font-weight:600">'
      + esc(format(value, g, locale)) + '</text>';
    out += '<text x="' + (bx - 5) + '" y="' + (top + 4) + '" text-anchor="end" fill="currentColor" opacity="0.55" style="font-size:9px">'
      + esc(shortNumber(x.max)) + '</text>';
    out += '<text x="' + (bx - 5) + '" y="' + bottom + '" text-anchor="end" fill="currentColor" opacity="0.55" style="font-size:9px">'
      + esc(shortNumber(x.min)) + '</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(g.title) + ': '
      + esc(format(value, g, locale)) + '">' + out + '</svg>';
  }

  /** One panel item (gauge, horizontal or vertical bar) including its title. */
  function item(g, value, locale, id) {
    var style = g.style === 'hbar' || g.style === 'vbar' ? g.style : 'gauge';
    var inner;
    if (style === 'hbar') inner = hbar(g, value, locale);
    else inner = (style === 'vbar' ? vbar(g, value, locale) : svg(g, value, locale))
      + '<span class="cg-title">' + esc(g.title) + '</span>';
    return '<div class="cg-item cg-' + style + '"' + (id ? ' id="' + esc(id) + '"' : '') + '>' + inner + '</div>';
  }

  var CSS = [
    '.cg-grid{display:grid;gap:2px 6px;--cg-vbar-h:96px;--cg-track:8px}',
    '.cg-grid.size-S{--cg-vbar-h:76px;--cg-track:6px}',
    '.cg-grid.size-L{--cg-vbar-h:124px;--cg-track:10px}',
    '.cg-item{display:flex;flex-direction:column;align-items:center;min-width:0}',
    '.cg-item svg{width:100%;height:auto;display:block}',
    '.cg-item .cg-title{font-size:11px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center}',
    '.cg-grid.size-S .cg-title{font-size:10px}.cg-grid.size-L .cg-title{font-size:12px}',
    '.cg-vbar svg{height:var(--cg-vbar-h)}',
    '.cg-hbar{grid-column:1/-1;align-items:stretch;padding:3px 2px 1px}',
    '.cg-hbar-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;min-width:0}',
    '.cg-hbar .cg-title{text-align:left}',
    '.cg-val{font-size:14px;font-weight:600;white-space:nowrap}',
    '.cg-track{position:relative;height:var(--cg-track);display:flex;gap:1px;margin-top:3px}',
    '.cg-track .seg{flex:1;opacity:.28;border-radius:1px}',
    '.cg-fill{position:absolute;top:0;bottom:0;border-radius:2px}',
    '.cg-needle{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:currentColor;border-radius:1px}',
    '.cg-zero{position:absolute;top:-1px;bottom:-1px;width:1px;background:currentColor;opacity:.45}',
    '.cg-scale{display:flex;justify-content:space-between;font-size:9px;opacity:.55;margin-top:1px}',
  ].join('\n');

  if (typeof document !== 'undefined' && !document.getElementById('cg-styles')) {
    var st = document.createElement('style');
    st.id = 'cg-styles';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  root.CompactGauge = {
    svg: svg, hbar: hbar, vbar: vbar, item: item, format: format, schemes: Object.keys(SCHEMES), colorAt: colorAt, esc: esc,
  };
}(typeof window !== 'undefined' ? window : this));
