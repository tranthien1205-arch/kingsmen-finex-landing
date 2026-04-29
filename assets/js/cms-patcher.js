/**
 * Kingsmen Terrazy — Hybrid CMS Patcher
 * ====================================================================
 * Static HTML stays as the visual master. This script reads /content/*.json
 * and patches only the dynamic data + marketing images.
 *
 *   site.json     → hotline, address, email, social, FOMO bar text
 *   combos.json   → #comboGrid (3 combo cards) + window.COMBO_DATA
 *   colors.json   → #colorGrid (12 swatches in order section)
 *   faq.json      → #faq accordion items
 *   reviews.json  → #reviews .grid review cards
 *   tiktok.json   → #tiktok grid items
 *   banners.json  → #fomoBar text/visibility
 *   images.json   → all [data-cms-img="<key>"] src
 *
 * Safe by default: any failed fetch / missing key just leaves the static
 * default in place. No CMS=on/off flag — patches always apply.
 */
(function () {
  'use strict';

  // -------------------- HELPERS --------------------
  function fetchJson(url) {
    return fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  function fmtVnd(n) {
    return (Number(n) || 0).toLocaleString('vi-VN') + '₫';
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
  function md(text) {
    if (!text) return '';
    let s = escapeHtml(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-ks-teal hover:underline">$1</a>');
    s = s.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>.+<\/li>\n?)+/g, '<ul class="list-disc pl-5 my-2 space-y-1">$&</ul>');
    return s.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
  }
  function setText(selector, text) {
    if (text == null || text === '') return;
    document.querySelectorAll(selector).forEach((el) => { el.textContent = text; });
  }
  function setAttr(selector, attr, value) {
    if (value == null || value === '') return;
    document.querySelectorAll(selector).forEach((el) => { el.setAttribute(attr, value); });
  }

  // -------------------- BOOT --------------------
  async function run() {
    const [site, combos, colors, faq, reviews, tiktok, banners, images, comparison, sections, pas, features, safety, waterproof, steps, objection] = await Promise.all([
      fetchJson('/content/site.json'),
      fetchJson('/content/combos.json'),
      fetchJson('/content/colors.json'),
      fetchJson('/content/faq.json'),
      fetchJson('/content/reviews.json'),
      fetchJson('/content/tiktok.json'),
      fetchJson('/content/banners.json'),
      fetchJson('/content/images.json'),
      fetchJson('/content/comparison.json'),
      fetchJson('/content/sections.json'),
      fetchJson('/content/pas.json'),
      fetchJson('/content/features.json'),
      fetchJson('/content/safety.json'),
      fetchJson('/content/waterproof.json'),
      fetchJson('/content/steps.json'),
      fetchJson('/content/objection.json'),
    ]);

    try { patchImages(images); } catch (e) { console.warn('[cms-patcher] images', e); }
    try { patchSite(site); } catch (e) { console.warn('[cms-patcher] site', e); }
    try { patchBanners(banners); } catch (e) { console.warn('[cms-patcher] banners', e); }
    try { patchCombos(combos); } catch (e) { console.warn('[cms-patcher] combos', e); }
    try { patchColors(colors); } catch (e) { console.warn('[cms-patcher] colors', e); }
    try { patchFaq(faq); } catch (e) { console.warn('[cms-patcher] faq', e); }
    try { patchReviews(reviews); } catch (e) { console.warn('[cms-patcher] reviews', e); }
    try { patchTiktok(tiktok); } catch (e) { console.warn('[cms-patcher] tiktok', e); }
    try { patchComparison(comparison); } catch (e) { console.warn('[cms-patcher] comparison', e); }
    try { patchSections(sections); } catch (e) { console.warn('[cms-patcher] sections', e); }
    try { patchPas(pas); } catch (e) { console.warn('[cms-patcher] pas', e); }
    try { patchFeatures(features); } catch (e) { console.warn('[cms-patcher] features', e); }
    try { patchSafety(safety); } catch (e) { console.warn('[cms-patcher] safety', e); }
    try { patchWaterproof(waterproof); } catch (e) { console.warn('[cms-patcher] waterproof', e); }
    try { patchSteps(steps); } catch (e) { console.warn('[cms-patcher] steps', e); }
    try { patchObjection(objection); } catch (e) { console.warn('[cms-patcher] objection', e); }
  }

  // -------------------- SAFETY (4 small icon cards) --------------------
  function patchSafety(data) {
    if (!data || !Array.isArray(data.items)) return;
    const grid = document.getElementById('cms-safety-grid');
    if (!grid) return;
    grid.innerHTML = data.items.map((it) => `
      <div class="bg-ks-light rounded-xl p-3 flex items-center gap-2">
        <span class="text-2xl">${escapeHtml(it.icon || '')}</span>
        <span class="text-sm font-semibold">${escapeHtml(it.label || '')}</span>
      </div>`).join('');
  }

  // -------------------- WATERPROOF (3 checkmark items) --------------------
  function patchWaterproof(data) {
    if (!data || !Array.isArray(data.items)) return;
    const list = document.getElementById('cms-waterproof-list');
    if (!list) return;
    list.innerHTML = data.items.map((it) => `
      <div class="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-ks-border">
        <span class="w-10 h-10 bg-ks-teal rounded-full flex items-center justify-center text-white font-bold">✓</span>
        <span class="text-sm font-semibold">${escapeHtml(it.label || '')}</span>
      </div>`).join('');
  }

  // -------------------- STEPS WARNING (callout bullets) --------------------
  function patchSteps(data) {
    if (!data) return;
    const wrap = document.getElementById('cms-steps-warning');
    if (!wrap) return;
    if (data.warning_title) {
      const titleEl = wrap.querySelector('p[data-cms-text="steps.warning_title"]');
      if (titleEl) titleEl.textContent = data.warning_title;
    }
    if (Array.isArray(data.warning_items)) {
      const ul = wrap.querySelector('ul');
      if (ul) ul.innerHTML = data.warning_items.map((b) => `<li>• ${escapeHtml(b)}</li>`).join('');
    }
  }

  // -------------------- OBJECTION HANDLING (5 details) --------------------
  function patchObjection(data) {
    if (!data || !Array.isArray(data.items)) return;
    const list = document.getElementById('cms-objection-list');
    if (!list) return;
    list.innerHTML = data.items.map((q) => `
      <details class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <summary class="p-5 flex items-start justify-between gap-4 cursor-pointer">
          <span class="font-bold text-ks-dark">${escapeHtml(q.question || '')}</span>
          <span class="chev text-2xl text-ks-teal flex-shrink-0">⌄</span>
        </summary>
        <div class="p-5 pt-0 text-sm text-ks-dark-text leading-relaxed">${md(q.answer || '')}</div>
      </details>`).join('');
  }

  // -------------------- PAS (3 problem cards) --------------------
  function patchPas(pas) {
    if (!pas || !Array.isArray(pas.items)) return;
    const grid = document.getElementById('cms-pas-grid');
    if (!grid) return;
    const items = pas.items.slice(0, 3);
    if (items.length === 0) return;
    grid.innerHTML = items.map((it) => `
      <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-6 card-hover">
        <div class="text-4xl mb-3">${escapeHtml(it.icon || '')}</div>
        <h3 class="text-lg font-bold text-ks-usa-red mb-2">${escapeHtml(it.title || '')}</h3>
        <ul class="text-sm text-ks-dark-text space-y-1">
          ${(it.bullets || []).map((b) => `<li>✗ ${escapeHtml(b)}</li>`).join('')}
        </ul>
      </div>`).join('');
  }

  // -------------------- FEATURES (5 USP cards) --------------------
  function patchFeatures(features) {
    if (!features || !Array.isArray(features.items)) return;
    const grid = document.getElementById('cms-features-grid');
    if (!grid) return;
    const items = features.items;
    if (items.length === 0) return;
    grid.innerHTML = items.map((it) => {
      const cardCls = it.highlighted
        ? 'bg-gradient-to-br from-ks-teal to-ks-dark-teal text-white rounded-2xl p-5 card-hover'
        : 'bg-white border-2 border-ks-border rounded-2xl p-5 card-hover';
      const titleCls = it.highlighted ? 'font-bold mb-2' : 'font-bold text-ks-dark mb-2';
      const descCls = it.highlighted ? 'text-sm text-white/90' : 'text-sm text-ks-dark-text';
      return `
        <div class="${cardCls}">
          <div class="text-3xl mb-2">${escapeHtml(it.icon || '')}</div>
          <h3 class="${titleCls}">${escapeHtml(it.title || '')}</h3>
          <p class="${descCls}">${escapeHtml(it.description || '')}</p>
        </div>`;
    }).join('');
  }

  // -------------------- SECTIONS (per-key text) --------------------
  function patchSections(sections) {
    if (!sections || typeof sections !== 'object') return;
    document.querySelectorAll('[data-cms-text]').forEach((el) => {
      const key = el.getAttribute('data-cms-text');
      const v = sections[key];
      if (v == null) return;
      // Render as innerHTML so editors can include simple inline tags / entities
      if (el.innerHTML !== v) el.innerHTML = v;
    });
  }

  // -------------------- COMPARISON TABLE --------------------
  function patchComparison(c) {
    if (!c || !Array.isArray(c.headers) || !Array.isArray(c.rows)) return;
    const table = document.getElementById('cms-comparison-table');
    if (!table) return;
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    // Headers
    thead.innerHTML = c.headers.map((h, i) =>
      `<th class="p-3 ${i === 0 ? 'text-left' : 'text-center'}">${escapeHtml(h)}</th>`
    ).join('');
    // Body rows — alternate bg-ks-light
    tbody.innerHTML = c.rows.map((row, i) => {
      const rowCls = i % 2 === 1 ? 'bg-ks-light' : 'border-b border-ks-border';
      const cells = (row.values || []).map((v, vi) => {
        const hl = (row.highlights || [])[vi] || '';
        const colorCls = hl === 'good' ? 'text-green-600 font-bold'
          : hl === 'bad' ? 'text-red-600 font-bold'
          : hl === 'warn' ? 'text-yellow-600 font-semibold' : '';
        return `<td class="p-3 text-center align-middle ${colorCls}">${escapeHtml(v)}</td>`;
      }).join('');
      return `<tr class="${rowCls}"><td class="p-3 font-semibold align-middle">${escapeHtml(row.label || '')}</td>${cells}</tr>`;
    }).join('');
  }

  // -------------------- IMAGES --------------------
  function patchImages(images) {
    if (!images || typeof images !== 'object') return;
    document.querySelectorAll('[data-cms-img]').forEach((el) => {
      const key = el.getAttribute('data-cms-img');
      const url = images[key];
      if (url && el.getAttribute('src') !== url) el.setAttribute('src', url);
    });
  }

  // -------------------- SITE --------------------
  function patchSite(site) {
    if (!site) return;
    const phone = (site.cta && site.cta.phone) || site.hotline || '';
    const phoneDisplay = (site.cta && site.cta.phone_display) || phone;
    const phoneClean = String(phone).replace(/\s/g, '');

    if (phoneClean) {
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => { a.href = 'tel:' + phoneClean; });
    }
    if (phoneDisplay) {
      document.querySelectorAll('[data-cms-cta-label="call"]').forEach((el) => {
        el.textContent = '📞 ' + phoneDisplay;
      });
    }
    // Order/offer button labels
    if (site.cta && site.cta.order_label) {
      document.querySelectorAll('[data-cms-cta="order"]').forEach((el) => { el.textContent = site.cta.order_label; });
    }
    if (site.cta && site.cta.offer_label) {
      document.querySelectorAll('[data-cms-cta-label="offer"]').forEach((el) => { el.textContent = site.cta.offer_label; });
    }
    // Zalo URL
    const zalo = site.cta && (site.cta.zalo || site.zalo_phone);
    if (zalo) {
      document.querySelectorAll('a[href*="zalo.me"]').forEach((a) => {
        const z = String(zalo).replace(/^https?:\/\//, '').replace(/^zalo\.me\//, '');
        a.href = 'https://zalo.me/' + z;
      });
    }
    // Footer / contact info
    if (site.contact) {
      setText('[data-cms="address"]', site.contact.address);
      setText('[data-cms="email"]', site.contact.email);
      setText('[data-cms="hours"]', site.contact.hours);
      if (site.contact.maps_url) setAttr('a[data-cms="maps_url"]', 'href', site.contact.maps_url);
    }
    // Social
    if (site.social) {
      ['facebook', 'tiktok', 'youtube', 'instagram'].forEach((k) => {
        const url = site.social[k];
        if (url) setAttr(`a[data-cms-social="${k}"]`, 'href', url);
      });
    }
    // Tracking IDs (GA4 / FB Pixel) — inject if not already
    if (site.tracking) {
      injectTracking(site.tracking);
    }
  }

  function injectTracking(t) {
    // GA4
    if (t.ga4_id && !document.querySelector('script[data-ga4]')) {
      const s = document.createElement('script');
      s.async = true; s.setAttribute('data-ga4', '1');
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(t.ga4_id);
      document.head.appendChild(s);
      const inl = document.createElement('script');
      inl.setAttribute('data-ga4-init', '1');
      inl.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${t.ga4_id}');`;
      document.head.appendChild(inl);
    }
    // FB Pixel
    if (t.fb_pixel && !window.fbq) {
      const s = document.createElement('script');
      s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.fb_pixel}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }

  // -------------------- BANNERS (FOMO bar) --------------------
  function patchBanners(banners) {
    if (!banners) return;
    const tb = banners.top_bar;
    if (tb) {
      const fomo = document.getElementById('fomoBar');
      if (fomo) {
        if (tb.enabled === false) { fomo.style.display = 'none'; return; }
        // Try to update the visible text node (preserve countdown markup)
        if (tb.text) {
          const firstSpan = fomo.querySelector('span.font-bold');
          if (firstSpan) firstSpan.textContent = tb.text;
        }
        if (tb.bg_color) fomo.style.background = tb.bg_color;
        if (tb.text_color) fomo.style.color = tb.text_color;
      }
    }
  }

  // -------------------- COMBOS --------------------
  function patchCombos(combos) {
    if (!combos || !Array.isArray(combos.items)) return;
    const grid = document.getElementById('comboGrid');
    if (!grid) return;
    const items = combos.items.filter((c) => c.active !== false).slice(0, 3);
    if (items.length === 0) return;

    const featuredIdx = items.findIndex((c) => c.badge);
    const activeIdx = featuredIdx >= 0 ? featuredIdx : (items.length >= 2 ? 1 : 0);

    grid.innerHTML = items.map((c, i) => {
      const isActive = i === activeIdx;
      const saving = (c.original || 0) - (c.price || 0);
      const tagline = c.tagline || (c.area_m2 < 4 ? 'Combo nhỏ' : c.area_m2 < 6 ? 'Combo vừa' : 'Combo lớn');
      const sublineMap = { 3: 'Nhà tắm, ban công', '4.5': 'Phòng ngủ, bếp', 6: 'Phòng khách, văn phòng' };
      const subline = c.subline || sublineMap[c.area_m2] || sublineMap[String(c.area_m2)] || '';
      return `
        <div class="combo-card rounded-2xl p-5 cursor-pointer text-center ${isActive ? 'active' : ''} relative" data-combo="${escapeHtml(c.id || c.area_m2)}" data-price="${c.price || 0}">
          ${c.badge ? `<span class="badge-best absolute top-0 right-0 -mt-2 mr-2 px-3 py-1 rounded-full text-xs">${escapeHtml(c.badge)}</span>` : ''}
          <div class="text-xs font-bold ${isActive ? 'text-ks-teal' : 'text-ks-mid-gray'} uppercase">${escapeHtml(tagline)}</div>
          <div class="display text-3xl text-ks-dark my-2">${escapeHtml(c.label || c.area_m2 + 'm²')}</div>
          <div class="text-xs text-ks-mid-gray mb-2">${escapeHtml(subline)}</div>
          ${c.original ? `<div class="line-through text-ks-mid-gray text-sm">${fmtVnd(c.original)}</div>` : ''}
          <div class="text-ks-teal font-black text-xl">${fmtVnd(c.price)}</div>
          ${saving > 0 ? `<div class="text-xs text-ks-usa-red font-bold mt-1">Tiết kiệm ${fmtVnd(saving)}</div>` : ''}
        </div>`;
    }).join('');

    // Update window.COMBO_DATA for the static price-summary JS
    const data = {};
    items.forEach((c) => {
      const key = String(c.id || c.area_m2);
      data[key] = {
        price: c.price || 0,
        original: c.original || c.price || 0,
        label: c.label || ('Combo ' + c.area_m2 + 'm²'),
        size: c.area_m2,
      };
    });
    window.COMBO_DATA = data;

    // Re-trigger summary if the static UI is already loaded
    if (typeof window.updateSummary === 'function') {
      try { window.updateSummary(); } catch {}
    }
  }

  // -------------------- COLORS --------------------
  function isLightHex(hex) {
    const c = String(hex || '').replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }

  function patchColors(colors) {
    if (!colors || !Array.isArray(colors.items)) return;
    const grid = document.getElementById('colorGrid');
    if (!grid) return;
    const items = colors.items.filter((c) => c.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (items.length === 0) return;

    const selectedIdx = Math.max(0, items.findIndex((c) => c.featured));
    grid.innerHTML = items.map((c, i) => {
      const isSel = i === selectedIdx;
      const styleBg = c.swatch_image
        ? `background:url('${c.swatch_image}') center/cover`
        : `background:${c.hex || '#888888'}`;
      const shortName = (c.name || c.code || '').split(/\s+/).slice(0, 2).join(' ');
      return `
        <div class="swatch ${isSel ? 'selected' : ''} rounded-xl overflow-hidden text-center" data-color="${escapeHtml(c.name || c.code)}">
          <div class="w-full aspect-square rounded-lg" style="${styleBg}"></div>
          <div class="text-xs mt-1 font-semibold">${escapeHtml(shortName)}</div>
        </div>`;
    }).join('');
  }

  // -------------------- FAQ --------------------
  function patchFaq(faq) {
    if (!faq || !Array.isArray(faq.items)) return;
    const section = document.getElementById('faq');
    if (!section) return;
    const list = section.querySelector('.space-y-3');
    if (!list) return;
    const items = faq.items.filter((q) => q.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (items.length === 0) return;
    list.innerHTML = items.map((q) => `
      <details class="bg-ks-light rounded-2xl overflow-hidden">
        <summary class="p-5 flex items-start justify-between gap-4 cursor-pointer">
          <span class="font-semibold text-ks-dark">${escapeHtml(q.question || '')}</span>
          <span class="chev text-xl text-ks-teal flex-shrink-0">⌄</span>
        </summary>
        <div class="p-5 pt-0 text-sm text-ks-dark-text">${md(q.answer || '')}</div>
      </details>`).join('');
  }

  // -------------------- REVIEWS --------------------
  function patchReviews(reviews) {
    if (!reviews || !Array.isArray(reviews.items)) return;
    const section = document.getElementById('reviews');
    if (!section) return;
    const grid = section.querySelector('.grid');
    if (!grid) return;
    const items = reviews.items.filter((r) => r.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (items.length === 0) return;

    const initialsOf = (name) => (name || '').split(' ').filter(Boolean).slice(-2).map((s) => s[0] || '').join('').toUpperCase().slice(0, 2) || '👤';
    const bgList = ['bg-ks-teal', 'bg-ks-gold', 'bg-ks-usa-red', 'bg-ks-dark'];

    grid.innerHTML = items.map((r, i) => {
      const photo = r.image || r.project_photo;
      const initialsBg = bgList[i % bgList.length];
      const stars = '⭐'.repeat(Math.max(1, Math.min(5, Number(r.rating || 5))));
      return `
        <div class="review-card rounded-2xl overflow-hidden shadow-lg card-hover">
          ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(r.name || '')}" class="w-full h-48 object-cover">` : ''}
          <div class="p-5">
            <div class="flex items-center gap-3 mb-3">
              ${r.avatar
                ? `<img src="${escapeHtml(r.avatar)}" alt="${escapeHtml(r.name || '')}" class="w-11 h-11 rounded-full object-cover">`
                : `<div class="w-11 h-11 rounded-full ${initialsBg} flex items-center justify-center text-white font-bold">${escapeHtml(initialsOf(r.name))}</div>`}
              <div class="flex-1 min-w-0">
                <p class="font-bold text-ks-dark truncate">${escapeHtml(r.name || '')}</p>
                <p class="text-xs text-ks-mid-gray truncate">${escapeHtml([r.role, r.location].filter(Boolean).join(' · '))}</p>
              </div>
              <span class="ml-auto text-ks-gold flex-shrink-0">${stars}</span>
            </div>
            <p class="text-sm text-ks-dark-text italic">"${escapeHtml(r.quote || '')}"</p>
            ${(r.combo || r.color) ? `<p class="text-xs text-ks-mid-gray mt-3">📅 Đặt ${escapeHtml(r.combo || '')}${r.color ? ' · Màu ' + escapeHtml(r.color) : ''}${r.date ? ' · ' + escapeHtml(r.date) : ''}</p>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // -------------------- TIKTOK --------------------
  function patchTiktok(tiktok) {
    if (!tiktok || !Array.isArray(tiktok.items)) return;
    const section = document.getElementById('tiktok');
    if (!section) return;
    // Find the existing grid container (tiktok section uses md:grid-cols-3)
    const grid = section.querySelector('.grid');
    if (!grid) return;
    const items = tiktok.items.filter((v) => v.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (items.length === 0) return;
    grid.innerHTML = items.map((v) => `
      <div class="bg-white rounded-2xl overflow-hidden shadow-2xl card-hover">
        <div class="relative aspect-[9/16] bg-black">
          <blockquote class="tiktok-embed" cite="https://www.tiktok.com/${v.author ? '@' + String(v.author).replace(/^@/, '') : '@kingsmenkeo'}/video/${escapeHtml(v.video_id || '')}" data-video-id="${escapeHtml(v.video_id || '')}" style="max-width:100%;min-width:100%">
            <section></section>
          </blockquote>
        </div>
        ${v.caption ? `<div class="p-3 text-sm font-semibold text-ks-dark text-center border-t border-ks-border">${escapeHtml(v.caption)}</div>` : ''}
      </div>`).join('');
    // Re-trigger TikTok embed
    if (window.tiktok && window.tiktok.embed && window.tiktok.embed.lib) {
      try { window.tiktok.embed.lib.render(grid.querySelectorAll('blockquote.tiktok-embed')); } catch {}
    } else {
      // Reload embed.js if not present (script tag exists in static)
      const old = document.querySelector('script[src*="tiktok.com/embed.js"]');
      if (old) {
        const fresh = document.createElement('script');
        fresh.async = true; fresh.src = 'https://www.tiktok.com/embed.js?_=' + Date.now();
        old.parentNode.appendChild(fresh);
      }
    }
  }

  // -------------------- BOOT --------------------
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
