// assets/js/tracking.js — lightweight behavior tracking + analytics
// Beacons events to /api/events (own backend) + GA4 + Microsoft Clarity (if configured).
// Safe to load defer.

(function () {
  'use strict';

  // ---------- visitor + session IDs ----------
  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function getOrCreate(key, ttl, storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const obj = JSON.parse(raw);
        if (!ttl || Date.now() - obj.t < ttl) return obj.v;
      }
    } catch {}
    const v = uuid();
    try { storage.setItem(key, JSON.stringify({ v, t: Date.now() })); } catch {}
    return v;
  }
  const VISITOR_ID = getOrCreate('ks_vid', 365 * 86400000, localStorage);
  const SESSION_ID = getOrCreate('ks_sid', 30 * 60000, sessionStorage);

  // ---------- UTM persistence ----------
  function parseQuery() {
    const out = {};
    const q = location.search.replace(/^\?/, '');
    if (!q) return out;
    for (const part of q.split('&')) {
      const [k, v] = part.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
    return out;
  }
  function captureUtm() {
    const q = parseQuery();
    const utm = {};
    for (const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
      if (q[k]) utm[k] = q[k];
    }
    if (Object.keys(utm).length) {
      try { localStorage.setItem('ks_utm', JSON.stringify({ ...utm, ts: Date.now() })); } catch {}
      return utm;
    }
    try {
      const cached = JSON.parse(localStorage.getItem('ks_utm') || '{}');
      // expire after 30 days
      if (cached.ts && Date.now() - cached.ts < 30 * 86400000) return cached;
    } catch {}
    return {};
  }
  const UTM = captureUtm();
  // Expose to other scripts (form posting reads window.KS_UTM)
  window.KS_UTM = UTM;
  window.KS_REFERRER = document.referrer || '';
  window.KS_VISITOR_ID = VISITOR_ID;
  window.KS_SESSION_ID = SESSION_ID;

  // ---------- Event queue + flush ----------
  const queue = [];
  let flushTimer = null;
  const FLUSH_INTERVAL = 5000;
  const FLUSH_THRESHOLD = 5;

  function track(type, target, extra) {
    queue.push({
      type, target,
      ...extra,
      at: Date.now()
    });
    if (queue.length >= FLUSH_THRESHOLD) flush();
    else scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, FLUSH_INTERVAL);
  }

  function flush(useBeacon) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (queue.length === 0) return;
    const batch = queue.splice(0, queue.length);
    const body = JSON.stringify({
      session_id: SESSION_ID,
      visitor_id: VISITOR_ID,
      page_path: location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      ...UTM,
      events: batch
    });
    // Cross-domain: Finex landing pings the shared CRM events endpoint.
    const EVT_BASE = (typeof window !== 'undefined' && window.CRM_API_BASE) || 'https://kingsmen-terrazy.pages.dev';
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(EVT_BASE + '/api/events', new Blob([body], { type: 'application/json' }));
    } else {
      fetch(EVT_BASE + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        mode: 'cors'
      }).catch(() => { /* swallow */ });
    }
  }

  // ---------- Pageview ----------
  track('pageview', location.pathname);

  // ---------- Scroll depth (25/50/75/100%) ----------
  const reachedDepths = new Set();
  function checkScroll() {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    if (total <= 0) return;
    const depth = Math.round((h.scrollTop / total) * 100);
    for (const d of [25, 50, 75, 100]) {
      if (depth >= d && !reachedDepths.has(d)) {
        reachedDepths.add(d);
        track('scroll', `depth_${d}`, { scroll_depth: d });
      }
    }
  }
  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      checkScroll();
    }, 250);
  }, { passive: true });

  // ---------- CTA + button clicks ----------
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a, button');
    if (!link) return;

    // Phone / Zalo / order CTAs
    const cta = link.getAttribute('data-cms-cta') || '';
    const text = (link.innerText || '').trim().slice(0, 60);

    if (cta) {
      track('cta_click', cta, { metadata: { text } });
    } else if (link.tagName === 'A' && link.getAttribute('href')?.startsWith('tel:')) {
      track('cta_click', 'tel', { metadata: { phone: link.getAttribute('href').slice(4) } });
    } else if (link.tagName === 'A' && link.getAttribute('href')?.includes('zalo.me')) {
      track('cta_click', 'zalo');
    } else if (link.tagName === 'A' && link.getAttribute('href')?.startsWith('#')) {
      track('click', `anchor:${link.getAttribute('href')}`, { metadata: { text } });
    } else if (link.classList?.contains('combo-card')) {
      track('combo_select', link.getAttribute('data-combo'), {
        metadata: { price: link.getAttribute('data-price') }
      });
    } else if (link.classList?.contains('swatch')) {
      track('color_select', link.getAttribute('data-color'));
    }
  }, { capture: true, passive: true });

  // ---------- Form interactions ----------
  let formStarted = false;
  let formSubmitted = false;
  const formEl = document.querySelector('#orderForm, form#order-form, form[name="order"]');
  if (formEl) {
    const onFirstInput = () => {
      if (formStarted) return;
      formStarted = true;
      track('form_start', formEl.id || 'order');
    };
    formEl.addEventListener('input', onFirstInput, { once: true });
    formEl.addEventListener('submit', () => {
      formSubmitted = true;
      track('form_submit', formEl.id || 'order');
      flush();
    });
  }

  // ---------- Form abandonment on unload ----------
  window.addEventListener('beforeunload', () => {
    if (formStarted && !formSubmitted) {
      track('form_abandon', 'order');
    }
    flush(true);
  });

  // ---------- Visibility flush on tab hide ----------
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });

  // Expose helpers for other scripts (eg. order form to call track on success)
  window.KS_TRACK = track;
  window.KS_FLUSH = flush;
})();
