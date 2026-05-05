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

  // -------------------- PRODUCT CONTEXT DETECTION --------------------
  // Single codebase serves both Terrazy + Finex. Detect which product this
  // page belongs to so we read content from the right folder.
  //
  // Signal priority:
  //   1. window.KS_PRODUCT (if landing HTML hardcodes it)
  //   2. URL path /finex.html
  //   3. Hostname starts with "finex." (future custom domain)
  //   4. Default = terrazy
  function detectProduct() {
    if (typeof window !== 'undefined' && window.KS_PRODUCT) return String(window.KS_PRODUCT);
    const path = (location.pathname || '').toLowerCase();
    if (/\/finex(\.html?)?$/.test(path) || /^\/finex\//.test(path)) return 'finex';
    const host = (location.hostname || '').toLowerCase();
    if (host === 'finex.vuakeoxaydung.vn' || host.startsWith('finex.')) return 'finex';
    return 'terrazy';
  }
  const PRODUCT = detectProduct();
  const CONTENT_BASE = (PRODUCT === 'finex') ? '/content-finex' : '/content';
  // Expose so finex.html and tracking can tag the form payload + events
  window.KS_PRODUCT = PRODUCT;
  window.KS_CONTENT_BASE = CONTENT_BASE;
  console.log(`[cms-patcher] product=${PRODUCT}, content_base=${CONTENT_BASE}`);

  // -------------------- HELPERS --------------------
  function fetchJson(pathOrUrl) {
    // Accept either an absolute URL ("/content/foo.json") OR a bare filename
    // ("foo.json" → resolve under CONTENT_BASE so caller doesn't have to).
    const url = pathOrUrl.startsWith('/') || /^https?:/.test(pathOrUrl)
      ? pathOrUrl
      : `${CONTENT_BASE}/${pathOrUrl}`;
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
    const [site, combos, colors, faq, reviews, tiktok, banners, images, comparison, sections, pas, features, safety, waterproof, steps, objection, menus, trustStamps, gifts, comboDetails] = await Promise.all([
      fetchJson('site.json'),
      fetchJson('combos.json'),
      fetchJson('colors.json'),
      fetchJson('faq.json'),
      fetchJson('reviews.json'),
      fetchJson('tiktok.json'),
      fetchJson('banners.json'),
      fetchJson('images.json'),
      fetchJson('comparison.json'),
      fetchJson('sections.json'),
      fetchJson('pas.json'),
      fetchJson('features.json'),
      fetchJson('safety.json'),
      fetchJson('waterproof.json'),
      fetchJson('steps.json'),
      fetchJson('objection.json'),
      fetchJson('menus.json'),
      fetchJson('trust_stamps.json'),
      fetchJson('gifts.json'),
      fetchJson('combo_details.json'),
    ]);

    try { patchImages(images); } catch (e) { console.warn('[cms-patcher] images', e); }
    try { patchSite(site); } catch (e) { console.warn('[cms-patcher] site', e); }
    try { patchBanners(banners); } catch (e) { console.warn('[cms-patcher] banners', e); }
    try { patchSections(sections); } catch (e) { console.warn('[cms-patcher] sections', e); }
    try { patchFomo(sections, site); } catch (e) { console.warn('[cms-patcher] fomo', e); }
    try { patchHeaderMenu(menus); } catch (e) { console.warn('[cms-patcher] menu', e); }
    try { patchFloatingCtas(site); } catch (e) { console.warn('[cms-patcher] floating', e); }
    // patchComboDetails MUST run before patchCombos so combo cards know which
    // combos have a detail card to link to (renders "Xem chi tiết" button).
    try { patchComboDetails(comboDetails); } catch (e) { console.warn('[cms-patcher] combo_details', e); }
    try { patchCombos(combos); } catch (e) { console.warn('[cms-patcher] combos', e); }
    try { patchColors(colors); } catch (e) { console.warn('[cms-patcher] colors', e); }
    try { patchFaq(faq); } catch (e) { console.warn('[cms-patcher] faq', e); }
    try { patchReviews(reviews); } catch (e) { console.warn('[cms-patcher] reviews', e); }
    try { patchTiktok(tiktok); } catch (e) { console.warn('[cms-patcher] tiktok', e); }
    try { patchComparison(comparison); } catch (e) { console.warn('[cms-patcher] comparison', e); }
    try { patchPas(pas); } catch (e) { console.warn('[cms-patcher] pas', e); }
    try { patchFeatures(features); } catch (e) { console.warn('[cms-patcher] features', e); }
    try { patchSafety(safety); } catch (e) { console.warn('[cms-patcher] safety', e); }
    try { patchWaterproof(waterproof); } catch (e) { console.warn('[cms-patcher] waterproof', e); }
    try { patchSteps(steps); } catch (e) { console.warn('[cms-patcher] steps', e); }
    try { patchObjection(objection); } catch (e) { console.warn('[cms-patcher] objection', e); }
    try { patchSuccessModal(sections); } catch (e) { console.warn('[cms-patcher] success', e); }
    try { patchTrustStamps(trustStamps); } catch (e) { console.warn('[cms-patcher] trust_stamps', e); }
    try { patchGifts(gifts); } catch (e) { console.warn('[cms-patcher] gifts', e); }
  }

  // -------------------- GIFTS / BONUSES --------------------
  function patchGifts(data) {
    const grid = document.getElementById('cms-gifts-grid');
    if (!grid) return;
    if (!data || !Array.isArray(data.items)) {
      // Hide whole section if no data
      const section = document.getElementById('gifts');
      if (section) section.style.display = 'none';
      return;
    }
    const items = data.items.filter((it) => it.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (items.length === 0) {
      const section = document.getElementById('gifts');
      if (section) section.style.display = 'none';
      return;
    }
    grid.innerHTML = items.map((it) => {
      const valueText = it.value && Number(it.value) > 0
        ? `<div class="text-ks-gold font-bold text-sm mt-2">Trị giá ${fmtVnd(it.value)}</div>`
        : '';
      const imgBlock = it.image
        ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.title||'')}" class="w-full h-32 object-cover rounded-xl mb-3" loading="lazy">`
        : `<div class="w-full h-32 flex items-center justify-center text-5xl bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl mb-3">${escapeHtml(it.icon || '🎁')}</div>`;
      return `
        <div class="bg-white border-2 border-amber-200 rounded-2xl p-4 card-hover hover:border-ks-gold transition">
          ${imgBlock}
          <h3 class="font-bold text-ks-dark mb-1">${escapeHtml(it.title || '')}</h3>
          <p class="text-xs text-ks-mid-gray mb-2">${escapeHtml(it.subtitle || '')}</p>
          ${valueText}
          ${it.condition ? `<p class="text-xs text-ks-mid-gray mt-2 italic">${escapeHtml(it.condition)}</p>` : ''}
        </div>`;
    }).join('');
  }

  // -------------------- COMBO DETAILS --------------------
  // Lưu data dạng map keyed by combo_id để combo cards có thể trigger modal
  // hiển thị chi tiết tương ứng. Section #combo-details mặc định ẩn — chỉ
  // public render khi user bấm "Xem chi tiết" hoặc trong success modal.
  function patchComboDetails(data) {
    const grid = document.getElementById('cms-combo-details-grid');
    if (!data || !Array.isArray(data.items)) {
      window.KS_COMBO_DETAILS = {};
      window.KS_COMBO_DETAILS_LIST = [];
      return;
    }
    const items = data.items.filter((it) => it.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    // Build a lookup by combo_id (string) — used by combo cards' "Xem chi tiết" button
    const map = {};
    for (const it of items) {
      const key = String(it.combo_id || '').trim();
      if (key) map[key] = it;
    }
    window.KS_COMBO_DETAILS = map;
    window.KS_COMBO_DETAILS_LIST = items;
    // Expose render helper so other code (success modal, deeplink) can re-use
    window.KS_renderComboDetail = renderComboDetailHTML;
    // Section grid still gets populated (in case admin enables it via CSS or
    // a "Xem tất cả combo" button is added later) — but section itself stays hidden.
    if (grid) {
      grid.innerHTML = items.map((it) => `<div class="combo-detail-card">${renderComboDetailHTML(it)}</div>`).join('');
    }
  }

  // Build the inner HTML for a single combo detail card. Used by:
  //  - hidden section #cms-combo-details-grid (cached for later use)
  //  - "Xem chi tiết" modal triggered from combo cards
  //  - Success modal after order submission
  function renderComboDetailHTML(it) {
    if (!it) return '';
    const components = (it.components || []).map((c) =>
      `<li class="flex justify-between gap-2 py-0.5"><span>${escapeHtml(c.name || '')}</span><strong class="text-ks-teal">${escapeHtml(c.qty || '')}</strong></li>`
    ).join('');
    const tools = (it.tools_included || []).map((t) =>
      `<li class="flex items-start gap-1.5"><span class="text-ks-teal">✓</span><span>${escapeHtml(t)}</span></li>`
    ).join('');
    const specs = (it.specs || []).map((s) =>
      `<div class="flex justify-between text-sm border-b border-ks-border last:border-0 py-1.5"><span class="text-ks-mid-gray">${escapeHtml(s.label || '')}</span><strong>${escapeHtml(s.value || '')}</strong></div>`
    ).join('');
    const imgBlock = it.image
      ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.title||'')}" class="w-full h-48 object-cover rounded-2xl mb-4" loading="lazy">`
      : `<div class="w-full h-32 bg-gradient-to-br from-ks-teal to-ks-dark-teal rounded-2xl flex items-center justify-center text-white mb-4"><div class="text-center"><div class="text-5xl mb-1">📦</div><div class="text-sm font-bold">${escapeHtml(it.title || 'Combo')}</div></div></div>`;
    const links = [];
    if (it.datasheet_url)    links.push(`<a href="${escapeHtml(it.datasheet_url)}" target="_blank" class="text-ks-teal text-xs hover:underline">📄 Tải datasheet</a>`);
    if (it.instructions_url) links.push(`<a href="${escapeHtml(it.instructions_url)}" target="_blank" class="text-ks-teal text-xs hover:underline">📖 Hướng dẫn DIY</a>`);
    return `
      ${imgBlock}
      <h3 class="font-bold text-ks-dark text-xl mb-1">${escapeHtml(it.title || '')}</h3>
      ${it.tagline ? `<p class="text-sm text-ks-teal font-semibold mb-3">${escapeHtml(it.tagline)}</p>` : ''}
      <div class="space-y-3 text-sm">
        ${it.coverage ? `<div><span class="text-xs uppercase font-bold text-ks-mid-gray tracking-wider">📐 Diện tích</span><div>${escapeHtml(it.coverage)}</div></div>` : ''}
        ${it.duration ? `<div><span class="text-xs uppercase font-bold text-ks-mid-gray tracking-wider">⏱️ Thời gian thi công</span><div class="text-xs">${escapeHtml(it.duration)}</div></div>` : ''}
        ${components ? `<div><span class="text-xs uppercase font-bold text-ks-mid-gray tracking-wider">🧪 Thành phần</span><ul class="text-xs space-y-0.5 mt-1">${components}</ul></div>` : ''}
        ${tools ? `<div><span class="text-xs uppercase font-bold text-ks-mid-gray tracking-wider">🛠️ Dụng cụ kèm theo</span><ul class="text-xs space-y-0.5 mt-1">${tools}</ul></div>` : ''}
        ${specs ? `<div><span class="text-xs uppercase font-bold text-ks-mid-gray tracking-wider">⚙️ Thông số kỹ thuật</span><div class="mt-1">${specs}</div></div>` : ''}
        ${it.warranty ? `<div class="bg-amber-50 border-l-2 border-ks-gold p-2 rounded text-xs"><strong>🛡️</strong> ${escapeHtml(it.warranty)}</div>` : ''}
        ${links.length ? `<div class="flex flex-wrap gap-3 pt-1">${links.join('')}</div>` : ''}
      </div>
    `;
  }

  // Modal open/close helpers (exposed globally so onclick attributes + the
  // success-modal flow in index.html can call them).
  window.KS_openComboDetailModal = function (comboId) {
    const modal = document.getElementById('comboDetailModal');
    const body  = document.getElementById('comboDetailModalBody');
    if (!modal || !body) return;
    const detail = (window.KS_COMBO_DETAILS || {})[String(comboId).trim()];
    if (!detail) {
      body.innerHTML = '<p class="text-center text-ks-mid-gray py-8">Chưa có chi tiết cho combo này. Liên hệ hotline để được tư vấn.</p>';
    } else {
      body.innerHTML = window.KS_renderComboDetail(detail);
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };
  window.KS_closeComboDetailModal = function () {
    const modal = document.getElementById('comboDetailModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  // -------------------- FOMO BAR (text + countdown + CTA + colors + visibility) --------------------
  function patchFomo(sections, site) {
    const fomo = document.getElementById('fomoBar');
    if (!fomo) return;
    const cfg = (site && site.fomo) || {};
    // Visibility toggle (site.fomo.enabled)
    if (cfg.enabled === false) { fomo.style.display = 'none'; return; }
    fomo.style.display = '';
    // Background / text color
    if (cfg.bg_color) fomo.style.background = cfg.bg_color;
    if (cfg.text_color) fomo.style.color = cfg.text_color;
    // Countdown end time — drives the ticker. Use site.fomo.countdown_end (ISO datetime),
    // or site.fomo.countdown_hours (number, hours-from-now-on-each-page-load),
    // or default end-of-day (existing behavior).
    let endMs = null;
    if (cfg.countdown_end) {
      const t = Date.parse(cfg.countdown_end);
      if (!isNaN(t)) endMs = t;
    }
    if (!endMs && (cfg.countdown_hours || site && site.fomo_countdown_hours)) {
      const h = Number(cfg.countdown_hours || site.fomo_countdown_hours);
      if (h > 0) endMs = Date.now() + h * 3600000;
    }
    if (endMs) window.KS_FOMO_END_MS = endMs;
  }

  // -------------------- HEADER NAV MENU (from menus.header[]) --------------------
  function patchHeaderMenu(menus) {
    if (!menus || !Array.isArray(menus.header)) return;
    const wrap = document.getElementById('headerNavMenu');
    if (!wrap) return;
    const items = menus.header.filter((m) => m && m.label && m.url);
    if (items.length === 0) return;
    wrap.innerHTML = items.map((m) => {
      const target = m.target === '_blank' ? ' target="_blank" rel="noopener"' : '';
      const icon = m.icon ? `${escapeHtml(m.icon)} ` : '';
      return `<a href="${escapeHtml(m.url)}" class="hover:text-ks-teal"${target}>${icon}${escapeHtml(m.label)}</a>`;
    }).join('');
  }

  // -------------------- FLOATING CTAs (visibility per button) --------------------
  function patchFloatingCtas(site) {
    const wrap = document.getElementById('floatingCtas');
    if (!wrap) return;
    const f = (site && site.floating_ctas) || {};
    // Per-button visibility (default = visible)
    [['call', 'show_call'], ['zalo', 'show_zalo'], ['order', 'show_order']].forEach(([fab, key]) => {
      const btn = wrap.querySelector(`[data-fab="${fab}"]`);
      if (!btn) return;
      if (f[key] === false) btn.style.display = 'none';
      else btn.style.display = '';
    });
    // Hide whole strip if all off OR explicit toggle
    if (f.enabled === false) wrap.style.display = 'none';
    else wrap.style.display = '';
  }

  // -------------------- SUCCESS MODAL TEXT (from sections.success.*) --------------------
  function patchSuccessModal(sections) {
    if (!sections) return;
    const modal = document.getElementById('successModal');
    if (!modal) return;
    const map = [
      ['success.emoji', 'data-cms-text'],
      ['success.title', 'data-cms-text'],
      ['success.body',  'data-cms-html'],
      ['success.btn_close', 'data-cms-text'],
    ];
    map.forEach(([key, attr]) => {
      const el = modal.querySelector(`[${attr}="${key}"]`);
      const v = sections[key];
      if (el && v != null && v !== '') {
        if (attr === 'data-cms-html') el.innerHTML = v;
        else el.textContent = v;
      }
    });
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
    // [data-cms-text] — innerHTML (cho phép simple inline tags)
    document.querySelectorAll('[data-cms-text]').forEach((el) => {
      const key = el.getAttribute('data-cms-text');
      const v = sections[key];
      if (v == null || v === '') return;
      if (el.innerHTML !== v) el.innerHTML = v;
    });
    // [data-cms-html] — alias of data-cms-text (semantically rõ hơn cho HTML)
    document.querySelectorAll('[data-cms-html]').forEach((el) => {
      const key = el.getAttribute('data-cms-html');
      const v = sections[key];
      if (v == null || v === '') return;
      if (el.innerHTML !== v) el.innerHTML = v;
    });
    // [data-cms-placeholder] — input placeholder text
    document.querySelectorAll('[data-cms-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-cms-placeholder');
      const v = sections[key];
      if (v == null || v === '') return;
      el.setAttribute('placeholder', v);
    });
    // [data-cms-attr-href] — anchor href driven by sections.json key
    document.querySelectorAll('[data-cms-attr-href]').forEach((el) => {
      const key = el.getAttribute('data-cms-attr-href');
      const v = sections[key];
      if (v == null || v === '') return;
      el.setAttribute('href', v);
    });
  }

  // -------------------- TRUST STAMPS (pills under hero) --------------------
  function patchTrustStamps(stamps) {
    if (!stamps || !Array.isArray(stamps.items)) return;
    const wrap = document.getElementById('cms-trust-stamps');
    if (!wrap) return;
    const items = stamps.items
      .filter((it) => it.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (items.length === 0) return;
    wrap.innerHTML = items.map((it) => `<span class="stamp">${escapeHtml(it.label || '')}</span>`).join('');
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
    // Order/offer button labels — but skip elements marked data-keep-content
    // (icon-only floating buttons shouldn't get overwritten with text) and skip
    // elements managed by sections.json via data-cms-text (those handle their own copy).
    if (site.cta && site.cta.order_label) {
      document.querySelectorAll('[data-cms-cta="order"]').forEach((el) => {
        if (el.hasAttribute('data-keep-content')) return;
        if (el.hasAttribute('data-cms-text')) return;
        el.textContent = site.cta.order_label;
      });
    }
    if (site.cta && site.cta.offer_label) {
      document.querySelectorAll('[data-cms-cta-label="offer"]').forEach((el) => {
        if (el.hasAttribute('data-keep-content')) return;
        el.textContent = site.cta.offer_label;
      });
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
      // TikTok follow CTA at bottom of #tiktok section — show only if URL set
      const tkUrl = site.social.tiktok || '';
      const followBox = document.getElementById('tiktok-follow-cta');
      if (followBox) {
        if (tkUrl) {
          const link = document.getElementById('tiktok-follow-link');
          if (link) link.href = tkUrl;
          // Pull @handle from URL for nicer label
          const m = tkUrl.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
          const handleEl = document.getElementById('tiktok-follow-text');
          if (handleEl) handleEl.textContent = m ? `Theo dõi @${m[1]} · Xem tất cả video` : 'Theo dõi kênh TikTok';
          followBox.style.display = '';
        } else {
          followBox.style.display = 'none';
        }
      }
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
      const comboKey = String(c.id || c.area_m2 || '').trim();
      // "Xem chi tiết" only renders if there's a matching combo_details entry
      const hasDetail = window.KS_COMBO_DETAILS && window.KS_COMBO_DETAILS[comboKey];
      const detailBtn = hasDetail
        ? `<button type="button" class="combo-detail-btn mt-3 text-xs text-ks-teal underline hover:text-ks-dark-teal" data-combo-detail="${escapeHtml(comboKey)}" onclick="event.stopPropagation()">🔍 Xem chi tiết</button>`
        : '';
      return `
        <div class="combo-card rounded-2xl p-5 cursor-pointer text-center ${isActive ? 'active' : ''} relative" data-combo="${escapeHtml(c.id || c.area_m2)}" data-price="${c.price || 0}">
          ${c.badge ? `<span class="badge-best absolute top-0 right-0 -mt-2 mr-2 px-3 py-1 rounded-full text-xs">${escapeHtml(c.badge)}</span>` : ''}
          <div class="text-xs font-bold ${isActive ? 'text-ks-teal' : 'text-ks-mid-gray'} uppercase">${escapeHtml(tagline)}</div>
          <div class="display text-3xl text-ks-dark my-2">${escapeHtml(c.label || c.area_m2 + 'm²')}</div>
          <div class="text-xs text-ks-mid-gray mb-2">${escapeHtml(subline)}</div>
          ${c.original ? `<div class="line-through text-ks-mid-gray text-sm">${fmtVnd(c.original)}</div>` : ''}
          <div class="text-ks-teal font-black text-xl">${fmtVnd(c.price)}</div>
          ${saving > 0 ? `<div class="text-xs text-ks-usa-red font-bold mt-1">Tiết kiệm ${fmtVnd(saving)}</div>` : ''}
          ${detailBtn}
        </div>`;
    }).join('');

    // Wire "Xem chi tiết" buttons → open modal. event.stopPropagation in HTML
    // prevents the click from also selecting the combo (cursor-pointer on parent).
    grid.querySelectorAll('button[data-combo-detail]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.KS_openComboDetailModal === 'function') {
          window.KS_openComboDetailModal(btn.dataset.comboDetail);
        }
      });
    });

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
  // Extract a 19-digit TikTok video id from anything the user might paste:
  // - bare id "7345678901234567890"
  // - full URL "https://www.tiktok.com/@user/video/7345678901234567890[?...]"
  // - share link "https://vm.tiktok.com/ZSxxxxx" (cannot resolve client-side; ignored)
  function extractTiktokId(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    if (/^\d{6,}$/.test(s)) return s;
    const m = s.match(/\/video\/(\d{6,})/);
    return m ? m[1] : '';
  }
  function extractTiktokAuthor(raw, fallback) {
    if (!raw) return fallback || 'kingsmenkeo';
    const s = String(raw).trim().replace(/^@/, '');
    if (/^[a-zA-Z0-9._]+$/.test(s)) return s;
    const m = s.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
    return m ? m[1] : (fallback || 'kingsmenkeo');
  }

  function patchTiktok(tiktok) {
    if (!tiktok || !Array.isArray(tiktok.items)) return;
    const section = document.getElementById('tiktok');
    if (!section) return;
    const grid = section.querySelector('.grid');
    if (!grid) return;

    // Normalize + filter: must be active AND have a valid numeric video id
    const items = tiktok.items
      .filter((v) => v.active !== false)
      .map((v) => ({
        ...v,
        video_id: extractTiktokId(v.video_id),
        author: extractTiktokAuthor(v.author || v.video_id, 'vuakeoxaydung'),
      }))
      .filter((v) => v.video_id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (items.length === 0) {
      // Không có video hợp lệ → giữ nguyên defaults trong HTML (không ẩn section)
      return;
    }
    section.style.display = '';

    // Render bằng IFRAME chính chủ TikTok player — không phụ thuộc embed.js,
    // luôn hiển thị được kể cả khi embed.js không re-process được DOM mới.
    grid.innerHTML = items.map((v) => {
      const playerUrl = `https://www.tiktok.com/player/v1/${encodeURIComponent(v.video_id)}?music_info=1&description=0&rel=0`;
      const videoUrl  = `https://www.tiktok.com/@${encodeURIComponent(v.author)}/video/${encodeURIComponent(v.video_id)}`;
      const caption   = v.caption || '';
      return `
        <div class="bg-white rounded-2xl overflow-hidden shadow-2xl card-hover flex flex-col">
          <div class="tiktok-iframe-wrap" style="position:relative;width:100%;padding-bottom:177.78%;background:#000;">
            <iframe
              src="${playerUrl}"
              allow="accelerometer; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
              allowfullscreen
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
              style="position:absolute;inset:0;width:100%;height:100%;border:0;"
              title="TikTok ${escapeHtml(caption)}"></iframe>
          </div>
          <div class="p-4">
            ${caption ? `<p class="text-center text-ks-dark text-sm font-semibold">${escapeHtml(caption)}</p>` : ''}
            <p class="text-center mt-2"><a href="${videoUrl}" target="_blank" rel="noopener" class="text-xs text-ks-teal underline">Mở trên TikTok →</a></p>
          </div>
        </div>`;
    }).join('');

    // Gỡ embed.js cũ nếu lỡ nạp — không cần nữa
    document.querySelectorAll('script[src*="tiktok.com/embed.js"]').forEach((s) => s.remove());
  }

  // -------------------- BOOT --------------------
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
