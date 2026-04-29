/**
 * Kingsmen Terrazy — CMS Block Renderer
 * ========================================
 * Reads /content/pages/homepage.json and renders 15 block types
 * built by the Decap CMS Page Builder.
 *
 * ACTIVATION (preview mode):
 *   - URL param ?cms=1           → enable and persist
 *   - URL param ?cms=0           → disable and persist
 *   - localStorage ks_cms_mode   → "on" | "off" (default: off)
 *
 * When active: fetches homepage.json, hides the static sections, and
 * renders dynamic blocks in #cms-blocks-root. Safe by default — if the
 * fetch fails or the JSON is empty, we keep the static HTML.
 *
 * Block types: hero · features · stats · gallery · video · text · cta_banner
 *              testimonials · faq · pricing · brands · color_swatches
 *              contact_form · divider · custom_html
 */
(function () {
  'use strict';

  // ---------- ACTIVATION ----------
  // CMS rendering is OFF by default — the static index.html is the source of
  // truth for the live page. The Page Builder is still functional but acts as
  // a staging area; preview blocks via ?cms=1 (saved to localStorage).
  // The renderers are not yet at parity with the static design, so enabling
  // by default breaks the layout. TODO: rebuild renderers to match static
  // section quality before re-enabling default.
  const url = new URL(window.location.href);
  const cmsParam = url.searchParams.get('cms');
  if (cmsParam === '1') localStorage.setItem('ks_cms_mode', 'on');
  if (cmsParam === '0') localStorage.removeItem('ks_cms_mode');
  const CMS_ACTIVE = localStorage.getItem('ks_cms_mode') === 'on';
  if (!CMS_ACTIVE) return;

  // ---------- UTILITIES ----------
  const h = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    const kids = Array.isArray(children) ? children : [children];
    for (const c of kids) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  };
  const safe = (s, d = '') => (s === undefined || s === null ? d : String(s));
  const escapeHTML = (s) =>
    safe(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Markdown → HTML (headings, tables, HR, bold/italic/links, lists, paragraphs)
  function md(text) {
    if (!text) return '';
    let s = escapeHTML(text);

    // Inline first (bold/italic/links don't interact with block-level patterns)
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-ks-teal hover:underline font-semibold">$1</a>');

    // Headings — line-anchored
    s = s.replace(/^### (.+)$/gm, '<h3 class="text-xl md:text-2xl font-bold mb-3 mt-6 text-ks-dark">$1</h3>');
    s = s.replace(/^## (.+)$/gm, '<h2 class="display text-2xl md:text-3xl font-black mb-4 mt-6 text-ks-dark">$1</h2>');
    s = s.replace(/^# (.+)$/gm, '<h1 class="display text-3xl md:text-4xl font-black mb-4 mt-8 text-ks-dark">$1</h1>');

    // Markdown tables: header line, separator, body lines (each line starts/ends with |)
    s = s.replace(/(^\|.+\|\s*$\n^\|[-:\s|]+\|\s*$\n(?:^\|.+\|\s*$\n?)*)/gm, (block) => {
      const lines = block.trim().split('\n');
      if (lines.length < 2) return block;
      const header = lines[0].split('|').slice(1, -1).map((c) => c.trim());
      const body = lines.slice(2).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
      let out = '<div class="overflow-x-auto my-5 rounded-xl border border-ks-border shadow-sm"><table class="min-w-full border-collapse"><thead><tr class="bg-ks-teal text-white">';
      for (const head of header) out += `<th class="text-left p-3 font-bold text-sm uppercase tracking-wide">${head}</th>`;
      out += '</tr></thead><tbody>';
      body.forEach((row, i) => {
        out += `<tr class="${i % 2 ? 'bg-ks-light/50' : 'bg-white'} border-b border-ks-border">`;
        for (const c of row) out += `<td class="p-3 text-sm text-ks-dark-text">${c}</td>`;
        out += '</tr>';
      });
      out += '</tbody></table></div>';
      return out;
    });

    // Horizontal rule (after tables since tables include |---| but on multiple lines)
    s = s.replace(/^\s*---\s*$/gm, '<hr class="my-6 border-t-2 border-ks-border">');

    // Lists (-, *, or numeric)
    s = s.replace(/^((?:[ \t]*[-*]\s.+(?:\n|$))+)/gm, (block) => {
      const items = block.trim().split(/\n/).map((l) =>
        `<li class="mb-2">${l.replace(/^[ \t]*[-*]\s/, '')}</li>`
      ).join('');
      return `<ul class="list-disc pl-6 my-4 space-y-1">${items}</ul>`;
    });
    s = s.replace(/^((?:[ \t]*\d+\.\s.+(?:\n|$))+)/gm, (block) => {
      const items = block.trim().split(/\n/).map((l) =>
        `<li class="mb-2">${l.replace(/^[ \t]*\d+\.\s/, '')}</li>`
      ).join('');
      return `<ol class="list-decimal pl-6 my-4 space-y-1">${items}</ol>`;
    });

    // Paragraph wrapping (anything that's not already a block element)
    return s.split(/\n{2,}/).map((p) => {
      const t = p.trim();
      if (!t) return '';
      if (/^<(h[1-6]|ul|ol|hr|div|table|p|blockquote|pre)/.test(t)) return t;
      return `<p class="mb-3">${t.replace(/\n/g, '<br>')}</p>`;
    }).join('');
  }

  // Background class helper
  const bgClass = (bg) => {
    switch (bg) {
      case 'teal': return 'bg-ks-teal text-white';
      case 'dark': return 'bg-ks-dark text-white';
      case 'gold': return 'bg-ks-gold text-white';
      case 'light': return 'bg-ks-light';
      case 'gradient': return 'bg-gradient-to-br from-ks-teal to-ks-dark-teal text-white';
      case 'gradient-gold': return 'bg-gradient-to-br from-ks-gold to-ks-teal text-white';
      default: return 'bg-white';
    }
  };
  const padClass = (p) => ({ sm: 'py-8', md: 'py-12', lg: 'py-16', xl: 'py-24' }[p] || 'py-16');

  // CTA button class helper
  const btnClass = (style) => {
    const base = 'inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all hover:-translate-y-0.5 shadow-lg';
    switch (style) {
      case 'gold': return `${base} bg-ks-gold text-white hover:bg-yellow-600`;
      case 'white': return `${base} bg-white text-ks-teal hover:bg-gray-100`;
      case 'outline': return `${base} bg-transparent border-2 border-current hover:bg-white/10`;
      case 'teal':
      default: return `${base} bg-ks-teal text-white hover:bg-ks-dark-teal`;
    }
  };

  // ---------- BLOCK RENDERERS ----------
  const renderers = {
    hero(b) {
      // Faithful rebuild of static hero (index.html lines 307-371).
      // Two-column on lg: left = badges + H1 + sub + social-proof + CTAs + reassurance,
      //                   right = image with floating stamps.
      const bg = b.background_image || '/assets/bucket_pouring.jpg';
      const layout = b.layout || 'split-right';

      // ----- Title gold accent: split on \n, " — ", or "—" / brand-name detection -----
      const title = b.title || '';
      let titleParts = [];
      if (/\n/.test(title)) {
        titleParts = title.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      } else if (/—|–|-—/.test(title)) {
        // "KINGSMEN TERRAZY — Sàn epoxy ..." → 2 parts
        titleParts = title.split(/\s+[—–]\s+/).map(s => s.trim()).filter(Boolean);
      } else if (/^[A-ZÀ-ſ\s]{4,}\s/.test(title)) {
        // "KINGSMEN TERRAZY Sàn epoxy ..." — split on first lowercase
        const m = title.match(/^([A-ZÀ-ſ\s]+?)\s+([a-zà-ỹ].*)$/);
        if (m) titleParts = [m[1].trim(), m[2].trim()];
      }
      if (titleParts.length === 0) titleParts = [title];

      const titleNode = titleParts.length >= 2
        ? h('h1', { class: 'display text-4xl md:text-5xl lg:text-6xl leading-tight mb-4' }, [
            h('span', { class: 'text-ks-gold' }, titleParts[0]), h('br'),
            ...titleParts.slice(1).flatMap((l, i, arr) => i === arr.length - 1
              ? [h('span', { class: 'text-white' }, l)]
              : [h('span', { class: 'text-white' }, l), h('br')]),
          ])
        : h('h1', { class: 'display text-4xl md:text-5xl lg:text-6xl leading-tight mb-4 text-white' }, title);

      // ----- Trust badges row (USA-style if first one mentions USA/Mỹ) -----
      const badges = (b.trust_badges || []).slice(0, 4).map((t, i) => {
        const text = `${t.icon ? t.icon + ' ' : ''}${t.text || ''}`.trim();
        const usaLike = i === 0 && /M(ỹ|y)|USA|🇺🇸/i.test(text);
        if (usaLike) return h('span', { class: 'usa-badge text-xs px-3 py-1 rounded' }, text);
        if (i === 1) return h('span', { class: 'bg-ks-gold text-ks-dark text-xs px-3 py-1 rounded font-bold' }, text);
        return h('span', { class: 'bg-white/20 text-white text-xs px-3 py-1 rounded border border-white/30' }, text);
      });

      // ----- Social proof: avatar stack + count -----
      const socialProof = h('div', { class: 'flex flex-wrap items-center gap-3 mb-6 text-sm' }, [
        h('div', { class: 'flex -space-x-2' }, [
          h('div', { class: 'w-8 h-8 rounded-full bg-ks-gold border-2 border-white flex items-center justify-center text-white text-xs font-bold' }, 'NH'),
          h('div', { class: 'w-8 h-8 rounded-full bg-ks-teal border-2 border-white flex items-center justify-center text-white text-xs font-bold' }, 'TL'),
          h('div', { class: 'w-8 h-8 rounded-full bg-ks-usa-red border-2 border-white flex items-center justify-center text-white text-xs font-bold' }, 'MT'),
          h('div', { class: 'w-8 h-8 rounded-full bg-ks-dark border-2 border-white flex items-center justify-center text-white text-xs font-bold' }, '+'),
        ]),
        h('div', { class: 'text-white/90' }, [
          h('span', { class: 'text-ks-gold font-bold' }, '12.000+ đơn hàng'),
          ' · ',
          h('span', { class: 'font-bold' }, '⭐ 4.9/5'),
          ' (3.500+ đánh giá)',
        ]),
      ]);

      // ----- CTAs -----
      const cta1 = b.cta_primary?.label
        ? h('a', { href: b.cta_primary.url || '#order', class: 'bg-ks-gold text-ks-dark px-8 py-4 rounded-full font-black text-center hover:brightness-110 transition shadow-xl text-lg' },
            h('span', {}, b.cta_primary.label))
        : null;
      const cta2 = b.cta_secondary?.label
        ? h('a', { href: b.cta_secondary.url || '#', class: 'bg-white/10 backdrop-blur border border-white/30 text-white px-6 py-4 rounded-full font-bold text-center hover:bg-white/20 transition' },
            h('span', {}, b.cta_secondary.label))
        : null;
      const ctas = h('div', { class: 'flex flex-col sm:flex-row gap-3' }, [cta1, cta2]);

      // ----- Reassurance line -----
      const reassurance = h('p', { class: 'text-white/70 text-sm mt-4' }, '✓ Giao 24h nội thành · ✓ Hỗ trợ thi công · ✓ Bảo hành 10 năm');

      // ----- Right column: image with stamps -----
      const image = h('div', { class: 'relative reveal', style: { animationDelay: '0.2s' } }, [
        h('div', { class: 'hero-blob w-80 h-80 -top-10 -left-10' }),
        h('img', { src: bg, alt: 'Kingsmen Terrazy', class: 'relative rounded-3xl hero-glow w-full max-w-md mx-auto border-4 border-white/20' }),
        h('div', { class: 'absolute -bottom-4 -right-4 md:right-4 bg-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 float-anim' }, [
          h('div', { class: 'text-3xl' }, '⏱️'),
          h('div', {}, [
            h('div', { class: 'text-ks-teal font-black text-xl' }, '24-48h'),
            h('div', { class: 'text-xs text-ks-mid-gray font-semibold' }, 'HOÀN THIỆN'),
          ]),
        ]),
        h('div', { class: 'absolute -top-4 left-4 bg-ks-gold rounded-2xl p-3 shadow-2xl float-anim', style: { animationDelay: '1s' } },
          h('div', { class: 'text-white font-black text-sm' }, 'KHÔNG ĐỤC PHÁ')),
      ]);

      // ----- Left column: text content -----
      const left = h('div', { class: 'text-white reveal' }, [
        badges.length ? h('div', { class: 'flex items-center gap-3 mb-4 flex-wrap' }, badges) : null,
        titleNode,
        b.subtitle ? h('p', { class: 'text-lg md:text-xl text-white/90 mb-6 leading-relaxed', html: md(b.subtitle).replace(/<p[^>]*>|<\/p>/g, '') }) : null,
        socialProof,
        ctas,
        reassurance,
      ]);

      // ----- Section wrapper -----
      const inner = h('div', { class: 'relative max-w-7xl mx-auto px-4 py-12 md:py-20 grid lg:grid-cols-2 gap-10 items-center' },
        layout === 'split-left' ? [image, left] : [left, image]);

      return h('section', { class: 'relative bg-hero-gradient overflow-hidden' }, [
        h('div', {
          class: 'absolute inset-0 opacity-10',
          style: { backgroundImage: 'radial-gradient(circle at 20% 20%, #C9A84C 0, transparent 50%), radial-gradient(circle at 80% 80%, #0C7B6F 0, transparent 50%)' },
        }),
        h('div', { class: 'hero-blob w-96 h-96 top-10 -right-20' }),
        inner,
      ]);
    },

    stats(b) {
      const cols = { '2': 'md:grid-cols-2', '3': 'md:grid-cols-3', '4': 'md:grid-cols-4', '5': 'md:grid-cols-5' }[String(b.columns || 4)] || 'md:grid-cols-4';
      const bg = bgClass(b.background || 'teal');
      const items = (b.items || []).map((s) =>
        h('div', { class: 'text-center' }, [
          s.icon ? h('div', { class: 'text-4xl mb-2' }, s.icon) : null,
          h('div', { class: 'text-4xl md:text-5xl font-black' }, `${s.value || ''}${s.suffix ? ' ' + s.suffix : ''}`),
          h('div', { class: 'text-sm md:text-base opacity-90 mt-1' }, s.label || ''),
        ])
      );
      return h('section', { class: `${bg} ${padClass(b.padding)}` },
        h('div', { class: 'container mx-auto px-6' }, h('div', { class: `grid grid-cols-2 ${cols} gap-8` }, items)));
    },

    features(b) {
      const itemCount = (b.items || []).length;
      // Auto-pick columns: respect b.columns when set, else use item count
      const declaredCols = String(b.columns || '');
      const autoCols = itemCount === 5 ? '5' : itemCount === 6 ? '3' : itemCount === 4 ? '4' : itemCount <= 2 ? '2' : '3';
      const colKey = declaredCols || autoCols;
      const cols = {
        '2': 'md:grid-cols-2',
        '3': 'md:grid-cols-3',
        '4': 'md:grid-cols-2 lg:grid-cols-4',
        '5': 'md:grid-cols-3 lg:grid-cols-5',
        '6': 'md:grid-cols-3 lg:grid-cols-6',
      }[colKey] || 'md:grid-cols-3';
      const cardStyle = b.card_style || 'bordered';
      const iconStyle = b.icon_style || 'circle-teal';
      const isDark = ['teal','dark','gradient'].includes(b.background);

      const cardCls = {
        'bordered':       'bg-white rounded-2xl p-6 border-2 border-ks-border hover:border-ks-teal hover:shadow-xl transition-all card-hover',
        'filled-light':   'bg-ks-light rounded-2xl p-6 hover:shadow-lg transition-all card-hover',
        'filled-teal':    'bg-ks-teal text-white rounded-2xl p-6 hover:scale-105 transition-all',
        'shadow':         'bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all card-hover',
        'minimal':        'p-2',
        'flat':           'p-4',
        'gradient':       'rounded-2xl p-6 bg-gradient-to-br from-ks-teal/5 to-ks-gold/5 border border-ks-teal/10 card-hover',
      }[cardStyle] || 'bg-white rounded-2xl p-6 border border-ks-border card-hover';

      const iconCls = {
        'circle-teal': 'w-14 h-14 rounded-full bg-ks-teal text-white text-2xl flex items-center justify-center mb-4 mx-auto',
        'circle-gold': 'w-14 h-14 rounded-full bg-ks-gold text-white text-2xl flex items-center justify-center mb-4 mx-auto',
        'square-dark': 'w-14 h-14 rounded-xl bg-ks-dark text-white text-2xl flex items-center justify-center mb-4 mx-auto',
        'square-teal': 'w-14 h-14 rounded-xl bg-ks-teal text-white text-2xl flex items-center justify-center mb-4 mx-auto',
        'plain':       'text-5xl mb-4 text-center',
      }[iconStyle] || 'text-5xl mb-4 text-center';

      const titleColorOnCard = cardStyle === 'filled-teal' ? 'text-white' : 'text-ks-dark';
      const descColorOnCard = cardStyle === 'filled-teal' ? 'text-white/90' : 'text-ks-mid-gray';

      const items = (b.items || []).map((it) =>
        h('div', { class: cardCls + ' text-center' }, [
          (it.icon || it.image) ? (
            it.image
              ? h('img', { src: it.image, alt: it.title || '', class: 'w-16 h-16 object-cover rounded-xl mb-4 mx-auto' })
              : h('div', { class: iconCls }, it.icon)
          ) : null,
          h('h3', { class: `text-lg md:text-xl font-bold mb-2 ${titleColorOnCard}` }, it.title || ''),
          h('p', { class: `${descColorOnCard} leading-relaxed text-sm md:text-base` }, it.description || ''),
          it.url ? h('a', { href: it.url, class: 'inline-block mt-3 text-ks-teal font-semibold text-sm hover:underline' }, 'Tìm hiểu thêm →') : null,
        ])
      );

      const eyebrowCls = isDark ? 'text-ks-gold' : 'text-ks-teal';
      const titleCls = isDark ? 'text-white' : 'text-ks-dark';
      const subCls = isDark ? 'text-white/80' : 'text-ks-mid-gray';

      return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}` },
        h('div', { class: 'container mx-auto px-6' }, [
          b.eyebrow ? h('div', { class: `${eyebrowCls} font-bold uppercase tracking-widest text-sm text-center mb-3` }, b.eyebrow) : null,
          b.title ? h('h2', { class: `display text-3xl md:text-4xl lg:text-5xl font-black text-center mb-3 ${titleCls}` }, b.title) : null,
          b.subtitle ? h('p', { class: `text-center ${subCls} max-w-2xl mx-auto mb-10 text-base md:text-lg` }, b.subtitle) : null,
          h('div', { class: `grid grid-cols-1 sm:grid-cols-2 ${cols} gap-4 md:gap-6 max-w-6xl mx-auto` }, items),
        ]));
    },

    gallery(b) {
      const layout = b.layout || 'grid-3';
      const items = b.items || [];
      const isDark = ['teal','dark','gradient'].includes(b.background);
      const eyebrowCls = isDark ? 'text-ks-gold' : 'text-ks-teal';
      const titleCls = isDark ? 'text-white' : 'text-ks-dark';
      const subCls = isDark ? 'text-white/80' : 'text-ks-mid-gray';

      const header = h('div', { class: 'text-center mb-8' }, [
        b.eyebrow ? h('span', { class: `${eyebrowCls} font-bold text-sm uppercase tracking-wider` }, b.eyebrow) : null,
        b.title ? h('h2', { class: `display text-3xl md:text-4xl ${titleCls} mt-2` }, b.title) : null,
        b.subtitle ? h('p', { class: `${subCls} mt-2 max-w-2xl mx-auto` }, b.subtitle) : null,
      ]);

      // BEFORE/AFTER layout
      if (layout === 'before-after' && items.length >= 2) {
        return h('section', { class: `${bgClass(b.background || 'light')} ${padClass(b.padding || 'lg')}` },
          h('div', { class: 'max-w-7xl mx-auto px-4' }, [
            header,
            h('div', { class: 'grid md:grid-cols-2 gap-6 max-w-5xl mx-auto' }, items.slice(0, 4).map((it, i) =>
              h('div', { class: 'relative rounded-2xl overflow-hidden shadow-xl card-hover' }, [
                it.image_before ? h('div', { class: 'grid grid-cols-2' }, [
                  h('div', { class: 'relative' }, [
                    h('img', { src: it.image_before, alt: 'Trước', class: 'w-full h-64 object-cover' }),
                    h('div', { class: 'absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full' }, 'TRƯỚC'),
                  ]),
                  h('div', { class: 'relative' }, [
                    h('img', { src: it.image, alt: 'Sau', class: 'w-full h-64 object-cover' }),
                    h('div', { class: 'absolute top-3 left-3 bg-ks-teal text-white text-xs font-bold px-3 py-1 rounded-full' }, 'SAU'),
                  ]),
                ]) : h('img', { src: it.image, alt: it.alt || '', class: 'w-full h-72 object-cover' }),
                it.caption ? h('div', { class: 'p-4 bg-white' }, h('p', { class: 'text-ks-dark font-semibold' }, it.caption)) : null,
              ]))),
          ]));
      }

      // CAROUSEL — horizontal scroll
      if (layout === 'carousel') {
        return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}` },
          h('div', { class: 'max-w-7xl mx-auto px-4' }, [
            header,
            h('div', { class: 'flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory' }, items.map((it) =>
              h('figure', { class: 'snap-start flex-shrink-0 w-72 md:w-96 rounded-2xl overflow-hidden shadow-lg' }, [
                h('img', { src: it.image, alt: it.alt || it.caption || '', class: 'w-full h-64 object-cover' }),
                it.caption ? h('figcaption', { class: 'p-3 bg-white text-sm text-ks-dark font-medium' }, it.caption) : null,
              ]))),
          ]));
      }

      // GRID layouts (2/3/4 cols, masonry) — auto-shrink if too few items
      let cols = { 'grid-2': 'md:grid-cols-2', 'grid-3': 'md:grid-cols-3', 'grid-4': 'md:grid-cols-4', 'masonry': 'md:grid-cols-3' }[layout] || 'md:grid-cols-3';
      if (items.length <= 2 && cols !== 'md:grid-cols-2') cols = 'md:grid-cols-2';
      const tile = (it) => {
        const fig = h('figure', { class: 'relative rounded-2xl overflow-hidden group shadow-lg card-hover' }, [
          h('img', { src: it.image, alt: it.alt || it.caption || '', class: 'w-full h-56 md:h-64 object-cover group-hover:scale-105 transition-transform duration-500' }),
          it.caption ? h('figcaption', { class: 'absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white text-sm font-semibold' }, it.caption) : null,
        ]);
        return it.link ? h('a', { href: it.link, class: 'block' }, fig) : fig;
      };

      return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}` },
        h('div', { class: 'max-w-7xl mx-auto px-4' }, [
          header,
          h('div', { class: `grid grid-cols-2 ${cols} gap-3 md:gap-5` }, items.map(tile)),
        ]));
    },

    video(b) {
      const url = b.url || '';
      let embed = url;
      if (url.includes('youtube.com/watch?v=')) embed = url.replace('watch?v=', 'embed/');
      if (url.includes('youtu.be/')) embed = 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1];

      return h('section', { class: `${bgClass(b.background || 'dark')} ${padClass(b.padding)}` },
        h('div', { class: 'container mx-auto px-6 max-w-4xl' }, [
          b.title ? h('h2', { class: 'text-3xl md:text-5xl font-black text-center mb-8 text-white' }, b.title) : null,
          h('div', { class: 'aspect-video rounded-2xl overflow-hidden shadow-2xl' },
            h('iframe', { src: embed, class: 'w-full h-full', frameborder: '0', allowfullscreen: 'true' })),
        ]));
    },

    text(b) {
      const align = b.align === 'center' ? 'text-center' : (b.align === 'right' ? 'text-right' : 'text-left');
      const widthCls = {
        narrow: 'max-w-2xl', medium: 'max-w-3xl', wide: 'max-w-5xl', full: 'max-w-7xl',
      }[b.width] || 'max-w-3xl';
      const isDark = ['teal','dark','gradient'].includes(b.background);
      const proseColor = isDark ? 'text-white' : 'text-ks-dark-text';
      const titleColor = isDark ? 'text-white' : 'text-ks-dark';
      const subColor = isDark ? 'text-white/80' : 'text-ks-mid-gray';
      const eyebrowColor = isDark ? 'text-ks-gold' : 'text-ks-teal';
      return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}` },
        h('div', { class: `container mx-auto px-6 ${widthCls} ${align}` }, [
          b.eyebrow ? h('div', { class: `${eyebrowColor} font-bold uppercase tracking-wider text-sm mb-3` }, b.eyebrow) : null,
          b.title ? h('h2', { class: `display text-3xl md:text-4xl lg:text-5xl mb-4 ${titleColor}` }, b.title) : null,
          b.subtitle ? h('p', { class: `text-lg ${subColor} mb-6 max-w-2xl ${align === 'text-center' ? 'mx-auto' : ''}` }, b.subtitle) : null,
          b.content ? h('div', { class: `${proseColor} leading-relaxed text-base md:text-lg`, html: md(b.content) }) : null,
        ]));
    },

    cta_banner(b) {
      // Map style → gradient/solid/image bg
      const style = b.style || 'teal';
      let sectionCls;
      if (style === 'image' && b.bg_image) {
        sectionCls = 'relative bg-cover bg-center text-white';
      } else if (style === 'gold') {
        sectionCls = 'bg-gradient-to-br from-ks-gold to-yellow-600 text-white';
      } else if (style === 'dark') {
        sectionCls = 'bg-gradient-to-br from-ks-dark to-ks-dark-teal text-white';
      } else if (style === 'gradient') {
        sectionCls = 'bg-ks-gradient text-white';
      } else {
        sectionCls = 'bg-gradient-to-br from-ks-teal to-ks-dark-teal text-white';
      }

      const buttons = (b.buttons || []).map((btn) => {
        const baseBtn = 'inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-black text-base shadow-xl transition hover:-translate-y-0.5';
        let btnCls;
        switch (btn.style) {
          case 'gold':    btnCls = `${baseBtn} bg-ks-gold text-ks-dark hover:brightness-110`; break;
          case 'teal':    btnCls = `${baseBtn} bg-ks-teal text-white hover:bg-ks-dark-teal`; break;
          case 'dark':    btnCls = `${baseBtn} bg-ks-dark text-white hover:bg-ks-dark-teal`; break;
          case 'outline': btnCls = `${baseBtn} bg-transparent border-2 border-white text-white hover:bg-white/10`; break;
          default:        btnCls = `${baseBtn} bg-white text-ks-teal hover:bg-gray-100`;
        }
        return h('a', { href: btn.url || '#', class: btnCls },
          `${btn.icon ? btn.icon + ' ' : ''}${btn.label || ''}`.trim());
      });

      const layoutCls = b.layout === 'left-align' ? 'text-left max-w-3xl' : 'text-center mx-auto';
      const buttonsAlign = b.layout === 'left-align' ? 'justify-start' : 'justify-center';

      const sectionStyle = (style === 'image' && b.bg_image) ? { backgroundImage: `url(${b.bg_image})` } : null;

      return h('section', { class: `${sectionCls} ${padClass(b.padding || 'xl')}`, style: sectionStyle }, [
        // dark overlay if image bg
        (style === 'image' && b.bg_image) ? h('div', { class: 'absolute inset-0 bg-black/50' }) : null,
        h('div', { class: `relative container mx-auto px-6 ${layoutCls}` }, [
          b.eyebrow ? h('div', { class: 'inline-block px-4 py-1 mb-4 rounded-full bg-white/20 backdrop-blur text-white text-xs font-bold uppercase tracking-widest' }, b.eyebrow) : null,
          b.title ? h('h2', { class: 'display text-3xl md:text-4xl lg:text-5xl font-black mb-4 leading-tight' }, b.title) : null,
          b.description ? h('p', { class: 'text-lg md:text-xl opacity-95 mb-8 max-w-2xl leading-relaxed' + (b.layout === 'left-align' ? '' : ' mx-auto') }, b.description) : null,
          buttons.length ? h('div', { class: `flex flex-col sm:flex-row gap-3 ${buttonsAlign} flex-wrap` }, buttons) : null,
        ]),
      ]);
    },

    testimonials(b) {
      // Faithful to static reviews section (lines 950-1070): cards with photo
      // top, then row of avatar + name + location + stars + quote + footer line.
      const items = b.items || [];
      const layout = b.layout || 'grid-3';
      const cols =
        layout === 'grid-2' ? 'md:grid-cols-2' :
        layout === 'single' ? '' :
        layout === 'carousel' ? 'md:grid-cols-2 lg:grid-cols-3' :
        'md:grid-cols-2 lg:grid-cols-3';
      const isDark = ['teal','dark','gradient'].includes(b.background);
      const eyebrowCls = isDark ? 'text-ks-gold' : 'text-ks-gold';
      const titleCls = isDark ? 'text-white' : 'text-ks-dark';

      // Compute average rating for header
      const ratings = items.map(r => Number(r.rating || 5)).filter(Boolean);
      const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : '4.9';

      const initialsOf = (name) => (name || '').split(' ').filter(Boolean).slice(-2).map(s => s[0] || '').join('').toUpperCase().slice(0,2) || '👤';

      const card = (r) => {
        const photo = r.image || r.project_photo;
        const initialsBgList = ['bg-ks-teal','bg-ks-gold','bg-ks-usa-red','bg-ks-dark'];
        const initialsBg = initialsBgList[(items.indexOf(r)) % initialsBgList.length];
        return h('div', { class: 'review-card rounded-2xl overflow-hidden shadow-lg card-hover bg-white' }, [
          photo ? h('img', { src: photo, alt: r.name || '', class: 'w-full h-48 object-cover' }) : null,
          h('div', { class: 'p-5' }, [
            r.headline ? h('h3', { class: 'text-base md:text-lg font-bold mb-2 text-ks-dark' }, r.headline) : null,
            h('div', { class: 'flex items-center gap-3 mb-3' }, [
              r.avatar
                ? h('img', { src: r.avatar, alt: r.name || '', class: 'w-11 h-11 rounded-full object-cover' })
                : h('div', { class: `w-11 h-11 rounded-full ${initialsBg} flex items-center justify-center text-white font-bold` }, initialsOf(r.name)),
              h('div', { class: 'flex-1 min-w-0' }, [
                h('p', { class: 'font-bold text-ks-dark truncate' }, r.name || ''),
                h('p', { class: 'text-xs text-ks-mid-gray truncate' }, [
                  r.role ? r.role + ' · ' : '',
                  r.location || '',
                ].filter(Boolean).join('')),
              ]),
              h('span', { class: 'text-ks-gold flex-shrink-0' }, '★'.repeat(Number(r.rating || 5))),
            ]),
            h('p', { class: 'text-sm text-ks-dark-text italic leading-relaxed' }, `"${r.quote || r.content || ''}"`),
            (r.combo || r.color || r.date) ? h('p', { class: 'text-xs text-ks-mid-gray mt-3' }, [
              '📅 ',
              r.combo ? `Đặt ${r.combo}` : '',
              r.color ? ` · Màu ${r.color}` : '',
              r.date ? ` · ${r.date}` : '',
            ].filter(Boolean).join('')) : null,
          ]),
        ]);
      };

      const header = h('div', { class: 'text-center mb-10' }, [
        b.eyebrow ? h('span', { class: `${eyebrowCls} font-bold text-sm uppercase tracking-wider` }, b.eyebrow) : null,
        b.title ? h('h2', { class: `display text-3xl md:text-4xl ${titleCls} mt-2` }, b.title) : null,
        items.length ? h('div', { class: 'flex justify-center items-center gap-2 mt-3' }, [
          h('span', { class: 'text-2xl' }, '⭐⭐⭐⭐⭐'),
          h('span', { class: `font-bold ${titleCls}` }, avgRating + '/5'),
          h('span', { class: 'text-ks-mid-gray text-sm' }, ` · ${items.length} đánh giá`),
        ]) : null,
      ]);

      return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}` },
        h('div', { class: 'max-w-7xl mx-auto px-4' }, [
          header,
          h('div', { class: `grid grid-cols-1 ${cols} gap-5` }, items.map(card)),
        ]));
    },

    faq(b) {
      // Match static FAQ section (lines 1210-1280): light gray collapsed cards
      // with chevron, expand to show answer.
      const items = (b.items || []).filter(q => q.active !== false);
      const layout = b.layout || 'accordion';
      const isDark = ['teal','dark','gradient'].includes(b.background);
      const eyebrowCls = isDark ? 'text-ks-gold' : 'text-ks-teal';
      const titleCls = isDark ? 'text-white' : 'text-ks-dark';

      const header = h('div', { class: 'text-center mb-8' }, [
        b.eyebrow ? h('span', { class: `${eyebrowCls} font-bold text-sm uppercase tracking-wider` }, b.eyebrow || 'FAQ') : null,
        b.title ? h('h2', { class: `display text-3xl md:text-4xl ${titleCls} mt-2` }, b.title) : null,
        b.subtitle ? h('p', { class: 'text-ks-mid-gray mt-2 max-w-2xl mx-auto' }, b.subtitle) : null,
      ]);

      const card = (q) => h('details', { class: 'bg-ks-light rounded-2xl overflow-hidden group' }, [
        h('summary', { class: 'p-5 flex items-start justify-between gap-4 cursor-pointer list-none' }, [
          h('span', { class: 'font-semibold text-ks-dark' }, q.question || ''),
          h('span', { class: 'chev text-xl text-ks-teal flex-shrink-0 group-open:rotate-180 transition-transform' }, '⌄'),
        ]),
        h('div', { class: 'p-5 pt-0 text-sm text-ks-dark-text leading-relaxed', html: md(q.answer || '') }),
      ]);

      // Two-column layout
      if (layout === 'two-column') {
        const half = Math.ceil(items.length / 2);
        return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}` },
          h('div', { class: 'max-w-6xl mx-auto px-4' }, [
            header,
            h('div', { class: 'grid md:grid-cols-2 gap-3' }, [
              h('div', { class: 'space-y-3' }, items.slice(0, half).map(card)),
              h('div', { class: 'space-y-3' }, items.slice(half).map(card)),
            ]),
          ]));
      }

      // Default accordion / single column
      return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}`, id: 'faq' },
        h('div', { class: 'max-w-4xl mx-auto px-4' }, [
          header,
          h('div', { class: 'space-y-3' }, items.map(card)),
        ]));
    },

    pricing(b) {
      // Accept both `tiers` (admin Page Builder + collection mapping) and `items` (legacy)
      const items = b.tiers || b.items || [];
      const cols = items.length <= 2 ? 'md:grid-cols-2' : items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4';
      return h('section', { class: `${bgClass(b.background || 'light')} ${padClass(b.padding)}`, id: 'pricing' },
        h('div', { class: 'container mx-auto px-6' }, [
          b.eyebrow ? h('div', { class: 'text-ks-teal font-bold uppercase tracking-wider text-center mb-2' }, b.eyebrow) : null,
          b.title ? h('h2', { class: 'text-3xl md:text-5xl font-black text-center mb-2 text-ks-dark' }, b.title) : null,
          b.subtitle ? h('p', { class: 'text-center text-ks-mid-gray max-w-2xl mx-auto mb-10' }, b.subtitle) : null,
          h('div', { class: `grid grid-cols-1 ${cols} gap-6 max-w-5xl mx-auto` }, items.map((p) => {
            const featured = !!(p.highlighted || p.featured);
            return h('div', { class: `rounded-2xl p-6 shadow-xl relative ${featured ? 'bg-gradient-to-br from-ks-teal to-ks-dark-teal text-white md:scale-105' : 'bg-white border border-ks-border'}` }, [
              p.badge ? h('div', { class: `inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${featured ? 'bg-ks-gold text-white' : 'bg-ks-teal/10 text-ks-teal'}` }, p.badge) : null,
              h('h3', { class: 'text-2xl font-black mb-2' }, p.name || ''),
              p.description ? h('p', { class: `mb-4 text-sm ${featured ? 'text-white/90' : 'text-ks-mid-gray'}` }, p.description) : null,
              h('div', { class: 'mb-4 flex items-baseline gap-2 flex-wrap' }, [
                h('span', { class: 'text-3xl md:text-4xl font-black' }, p.price || ''),
                p.suffix ? h('span', { class: 'text-sm opacity-80' }, '/' + p.suffix) : (p.unit ? h('span', { class: 'text-sm opacity-80' }, '/' + p.unit) : null),
                p.original ? h('span', { class: `text-sm line-through ${featured ? 'text-white/70' : 'text-ks-mid-gray'}` }, p.original) : null,
              ]),
              (p.features || []).length ? h('ul', { class: 'space-y-2 mb-6' }, (p.features || []).map((f) =>
                h('li', { class: 'flex items-start gap-2 text-sm' }, [
                  h('span', { class: featured ? 'text-ks-gold' : 'text-ks-teal' }, '✓'),
                  h('span', {}, typeof f === 'string' ? f : (f.feature || '')),
                ]))) : null,
              (p.cta_label || p.cta?.label) ? h('a', {
                href: p.cta_url || p.cta?.url || '#order',
                class: btnClass(featured ? 'gold' : 'teal') + ' w-full justify-center'
              }, p.cta_label || p.cta?.label) : null,
            ]);
          })),
        ]));
    },

    tiktok(b) {
      const items = (b.items || []).filter(v => v.active !== false);
      const layout = b.layout || 'grid-3';
      const cols = layout === 'grid-2' ? 'md:grid-cols-2' : 'md:grid-cols-3';
      const isDark = ['teal','dark','gradient'].includes(b.background) || !b.background;  // tiktok defaults to dark
      const finalBg = b.background || 'dark';
      const eyebrowCls = isDark ? 'text-ks-gold' : 'text-ks-teal';
      const titleCls = isDark ? 'text-white' : 'text-ks-dark';
      const subCls = isDark ? 'text-white/80' : 'text-ks-mid-gray';

      return h('section', { class: `${bgClass(finalBg)} ${padClass(b.padding || 'lg')}`, id: 'tiktok' },
        h('div', { class: 'max-w-7xl mx-auto px-4' }, [
          h('div', { class: 'text-center mb-10' }, [
            b.eyebrow ? h('span', { class: `${eyebrowCls} font-bold text-sm uppercase tracking-wider` }, b.eyebrow) : null,
            b.title ? h('h2', { class: `display text-3xl md:text-4xl ${titleCls} mt-2` }, b.title) : null,
            b.subtitle ? h('p', { class: `${subCls} mt-2 max-w-2xl mx-auto` }, b.subtitle) : null,
          ]),
          h('div', { class: `grid grid-cols-1 sm:grid-cols-2 ${cols} gap-4 md:gap-6 max-w-5xl mx-auto` }, items.map((v) =>
            h('div', { class: 'bg-white rounded-2xl overflow-hidden shadow-2xl card-hover' }, [
              h('div', { class: 'relative aspect-[9/16] bg-black' },
                h('blockquote', {
                  class: 'tiktok-embed', cite: `https://www.tiktok.com/${v.author ? '@' + v.author.replace(/^@/, '') : '@user'}/video/${v.video_id || ''}`,
                  'data-video-id': v.video_id || '', style: { maxWidth: '100%', minWidth: '100%' }
                }, h('section', {}))),
              v.caption ? h('div', { class: 'p-3 text-sm font-semibold text-ks-dark text-center border-t border-ks-border' }, v.caption) : null,
            ]))),
          h('script', { async: 'true', src: 'https://www.tiktok.com/embed.js' }),
        ]));
    },

    brands(b) {
      // Match static trust-stamps row (lines 374-386): pill stamps with emoji
      // labels OR transparent logos depending on .style.
      const items = b.logos || b.items || [];
      const style = b.style || 'grayscale';

      // Optional autoscroll marquee
      const isMarquee = !!b.autoscroll;

      const stampNode = (br) => {
        // Prefer logo image when available; else show emoji + alt text as a pill
        if (br.logo) {
          return h('div', { class: 'h-10 md:h-12 flex items-center' },
            h('img', {
              src: br.logo, alt: br.alt || br.name || '',
              class: 'h-full object-contain ' + (style === 'grayscale' ? 'grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition' : ''),
            }));
        }
        // Stamp-style label
        return h('span', { class: 'stamp' }, br.alt || br.name || '');
      };

      const innerCls = isMarquee
        ? 'flex items-center gap-3 md:gap-4 animate-[scroll_30s_linear_infinite] whitespace-nowrap'
        : 'flex flex-wrap justify-center items-center gap-3 md:gap-4';

      const isDark = style === 'white-on-dark' || ['teal','dark','gradient'].includes(b.background);
      const titleCls = isDark ? 'text-white/70' : 'text-ks-mid-gray';
      const sectionBg = b.background ? bgClass(b.background) : (style === 'white-on-dark' ? 'bg-ks-dark text-white' : 'bg-ks-light border-y border-ks-border');

      return h('section', { class: `${sectionBg} ${padClass(b.padding || 'sm')}` },
        h('div', { class: 'max-w-7xl mx-auto px-4' }, [
          b.title ? h('p', { class: `text-center text-xs uppercase tracking-widest font-bold mb-5 ${titleCls}` }, b.title) : null,
          h('div', { class: innerCls }, items.map((br) =>
            br.url ? h('a', { href: br.url, target: '_blank', class: 'inline-flex items-center' }, stampNode(br)) : stampNode(br))),
        ]));
    },

    color_swatches(b) {
      const items = (b.items || []).filter(c => c.active !== false);
      const layout = b.layout || 'grid-4';
      const colsCls = {
        'grid-3': 'grid-cols-2 sm:grid-cols-3',
        'grid-4': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
        'grid-6': 'grid-cols-3 md:grid-cols-6',
        'list':   'grid-cols-1',
      }[layout] || 'grid-cols-3 md:grid-cols-6';
      const isDark = ['teal','dark','gradient'].includes(b.background);
      const eyebrowCls = isDark ? 'text-ks-gold' : 'text-ks-teal';
      const titleCls = isDark ? 'text-white' : 'text-ks-dark';
      const subCls = isDark ? 'text-white/80' : 'text-ks-mid-gray';

      return h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'lg')}`, id: 'colors' },
        h('div', { class: 'max-w-7xl mx-auto px-4' }, [
          h('div', { class: 'text-center mb-8' }, [
            b.eyebrow ? h('span', { class: `${eyebrowCls} font-bold text-sm uppercase tracking-wider` }, b.eyebrow) : null,
            b.title ? h('h2', { class: `display text-3xl md:text-4xl ${titleCls} mt-2` }, b.title) : null,
            b.subtitle ? h('p', { class: `${subCls} mt-2 max-w-2xl mx-auto` }, b.subtitle) : null,
          ]),
          h('div', { class: `grid ${colsCls} gap-4` }, items.map((c) =>
            h('div', { class: 'text-center group cursor-pointer' }, [
              h('div', { class: 'relative rounded-xl mb-2 overflow-hidden shadow group-hover:shadow-xl group-hover:scale-105 transition-all' }, [
                c.swatch_image
                  ? h('img', { src: c.swatch_image, alt: c.name || '', class: 'w-full aspect-square object-cover' })
                  : h('div', { class: 'w-full aspect-square', style: { backgroundColor: c.hex || '#999' } }),
                c.featured ? h('div', { class: 'absolute top-1 right-1 bg-ks-gold text-white text-[10px] font-bold px-2 py-0.5 rounded' }, 'NEW') : null,
              ]),
              h('div', { class: `text-sm font-bold ${isDark ? 'text-white' : 'text-ks-dark'}` }, c.name || ''),
              c.code ? h('div', { class: `text-xs ${isDark ? 'text-white/60' : 'text-ks-mid-gray'}` }, c.code) : null,
            ]))),
        ]));
    },

    contact_form(b) {
      return h('section', { class: `${bgClass(b.background || 'light')} ${padClass(b.padding)}`, id: 'contact' },
        h('div', { class: 'container mx-auto px-6 max-w-2xl' }, [
          b.eyebrow ? h('div', { class: 'text-ks-teal font-bold uppercase tracking-wider text-center mb-2' }, b.eyebrow) : null,
          b.title ? h('h2', { class: 'text-3xl md:text-5xl font-black text-center mb-3 text-ks-dark' }, b.title) : null,
          b.description ? h('p', { class: 'text-center text-ks-mid-gray mb-8' }, b.description) : null,
          h('form', { class: 'bg-white rounded-2xl p-6 shadow-lg space-y-4', onsubmit: (e) => { e.preventDefault(); alert('Cảm ơn! Đội Kingsmen sẽ liên hệ trong 2 giờ.'); } }, [
            h('input', { type: 'text', placeholder: 'Họ và tên', required: 'true', class: 'w-full px-4 py-3 rounded-lg border border-ks-border focus:border-ks-teal outline-none' }),
            h('input', { type: 'tel', placeholder: 'Số điện thoại', required: 'true', class: 'w-full px-4 py-3 rounded-lg border border-ks-border focus:border-ks-teal outline-none' }),
            h('textarea', { placeholder: 'Nội dung (diện tích cần cải tạo, địa điểm...)', rows: '4', class: 'w-full px-4 py-3 rounded-lg border border-ks-border focus:border-ks-teal outline-none' }),
            h('button', { type: 'submit', class: btnClass('teal') + ' w-full justify-center' }, b.submit_label || 'Gửi yêu cầu báo giá'),
          ]),
        ]));
    },

    divider(b) {
      const style = b.style || 'line';
      if (style === 'space') return h('div', { class: padClass(b.padding || 'md') });
      if (style === 'gradient') return h('div', { class: 'h-1 bg-gradient-to-r from-transparent via-ks-teal to-transparent my-8' });
      return h('div', { class: 'container mx-auto px-6' }, h('hr', { class: 'border-ks-border my-8' }));
    },

    custom_html(b) {
      const wrap = h('section', { class: `${bgClass(b.background || 'white')} ${padClass(b.padding || 'md')}` },
        h('div', { class: 'container mx-auto px-6' }, h('div', { html: b.html || '' })));
      return wrap;
    },
  };

  // ---------- RENDERER CORE ----------
  async function fetchJson(url) {
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      console.warn('[cms-renderer] fetch failed:', url, e);
      return null;
    }
  }

  async function fetchHomepage() {
    return (await fetchJson('/content/pages/homepage.json')) || null;
  }

  // Resolve "source: collection" by replacing block.items with collection data.
  async function resolveCollectionSources(page) {
    if (!page || !Array.isArray(page.blocks)) return page;
    const needs = {
      color_swatches: { file: '/content/colors.json',  key: 'items' },
      testimonials:   { file: '/content/reviews.json', key: 'items' },
      faq:            { file: '/content/faq.json',     key: 'items' },
      tiktok:         { file: '/content/tiktok.json',  key: 'items' },
      pricing:        { file: '/content/combos.json',  key: 'tiers' },
    };
    const cache = {};
    for (const block of page.blocks) {
      const def = needs[block.block_type];
      if (!def) continue;
      if (block.source && block.source !== 'collection') continue; // manual mode honored
      // collection mode (default for these block types)
      if (!cache[def.file]) cache[def.file] = await fetchJson(def.file);
      const data = cache[def.file];
      const collItems = (data && Array.isArray(data.items)) ? data.items.filter(it => it.active !== false) : [];
      // Map combos.json (tiers) into pricing block format if needed
      if (block.block_type === 'pricing') {
        block.tiers = collItems.map(c => ({
          name: c.label || (c.area_m2 + 'm²'),
          badge: c.badge || '',
          price: typeof c.price === 'number' ? c.price.toLocaleString('vi-VN') + '₫' : (c.price || ''),
          original: typeof c.original === 'number' ? c.original.toLocaleString('vi-VN') + '₫' : (c.original || ''),
          highlighted: !!c.badge,
          description: c.tagline || '',
          cta_label: 'Đặt ngay',
          cta_url: '#order',
        }));
      } else {
        block.items = collItems;
      }
    }
    return page;
  }

  // Sections in static HTML that we want to keep alive even when CMS renders blocks
  // (interactive elements that aren't yet block-driven)
  const KEEP_SECTION_IDS = new Set(['order', 'cms-blocks-root']);

  function renderBlocks(page) {
    const root = document.getElementById('cms-blocks-root');
    if (!root) {
      console.warn('[cms-renderer] #cms-blocks-root not found; cannot render CMS blocks');
      return;
    }

    if (!page || !Array.isArray(page.blocks) || page.blocks.length === 0) {
      showBanner('warn', 'Chưa có block nào trên trang chủ — bạn đang xem bản tĩnh. Mở /admin/#/collections/pages để thêm block.');
      return;
    }

    // SEO
    if (page.seo?.title) document.title = page.seo.title;

    // Hide all main sections except header/footer + KEEP_SECTION_IDS
    document.querySelectorAll('body > section, body > main > section, body > main').forEach((el) => {
      if (el.contains(root)) return;
      if (el.matches('header, footer')) return;
      if (KEEP_SECTION_IDS.has(el.id)) return;
      if (el.closest('#cms-blocks-root')) return;
      el.style.display = 'none';
    });

    // Render — each block gets id="cms-block-N" for postMessage scroll/highlight
    root.innerHTML = '';
    page.blocks.forEach((block, idx) => {
      const type = block.block_type;
      const fn = renderers[type];
      let node;
      if (!fn) {
        node = h('div', { class: 'container mx-auto px-6 py-4 text-center text-sm text-red-600' },
          `[Block chưa render được: "${type}"]`);
      } else {
        try { node = fn(block); }
        catch (err) {
          console.error('[cms-renderer] block error:', block.block_type, err);
          node = h('div', { class: 'container mx-auto px-6 py-4 text-center text-sm text-red-600' },
            `[Lỗi render block "${block.block_type}": ${err.message}]`);
        }
      }
      if (node && node.setAttribute) {
        node.setAttribute('id', 'cms-block-' + idx);
        node.setAttribute('data-block-index', String(idx));
        node.setAttribute('data-block-type', type || '');
      }
      root.appendChild(node);
    });

    showBanner('ok', `Preview CMS · ${page.blocks.length} block đã render · <a href="?cms=0" class="underline font-bold">Tắt</a> · <a href="/admin/" class="underline font-bold">Sửa trong admin</a>`);
  }

  // Listen for postMessage from admin to highlight/scroll to specific block
  let _highlightBlockEl = null;
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'cms:focus-block') return;
    const idx = data.index;
    const target = document.getElementById('cms-block-' + idx);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (_highlightBlockEl) _highlightBlockEl.style.boxShadow = '';
    target.style.boxShadow = '0 0 0 4px #C9A84C, 0 0 24px rgba(201,168,76,0.4)';
    target.style.transition = 'box-shadow 0.3s';
    _highlightBlockEl = target;
    setTimeout(() => { if (target.style) target.style.boxShadow = ''; }, 2400);
  });

  function showBanner(kind, html) {
    let bar = document.getElementById('ks-cms-preview-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ks-cms-preview-bar';
      bar.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;padding:10px 16px;border-radius:12px;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18);max-width:340px;';
      document.body.appendChild(bar);
    }
    const colors = {
      ok: 'background:#0C7B6F;color:#fff;',
      warn: 'background:#C9A84C;color:#fff;',
      err: 'background:#C41E3A;color:#fff;',
    };
    bar.setAttribute('style', bar.getAttribute('style').split('background')[0] + colors[kind]);
    bar.innerHTML = html;
  }

  // ---------- BOOT ----------
  function boot() {
    const root = document.getElementById('cms-blocks-root');
    if (!root) {
      console.warn('[cms-renderer] Container #cms-blocks-root missing from page');
      return;
    }
    fetchHomepage()
      .then((page) => resolveCollectionSources(page))
      .then((page) => renderBlocks(page));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
