# Finex F300 — Sàn Epoxy Tự Phẳng (Landing)

Landing page bán bộ thi công Finex F300 — Sàn epoxy tự phẳng "Finish Made Easy".
Phân phối bởi Masfico Việt Nam.

## Stack

- **Static HTML + Tailwind CDN** — `index.html` là master design.
- **CMS Patcher** — `assets/js/cms-patcher.js` đọc `content/*.json` và patch DOM theo `data-cms-text="<key>"` / `data-cms-img="<key>"` (kế thừa từ Terrazy).
- **Cloudflare Pages** — auto deploy mỗi push lên `main`.
- **Backend (CRM/orders)** — KHÔNG host ở project này. Form `submitOrder` POST cross-domain về `https://kingsmen-terrazy.pages.dev/api/orders` với `product: "finex"` để gom đơn về CRM chung của Masfico.

## Folder

```
.
├── index.html              # Static landing (1500+ dòng, 22 sections)
├── assets/
│   ├── finex/              # Hình marketing đặc thù Finex (12 file)
│   └── js/
│       ├── cms-patcher.js  # Đọc content/*.json
│       └── tracking.js     # GA4 + beacon /api/events (cross-domain)
└── content/
    ├── sections.json       # Toàn bộ text section
    ├── combos.json         # 3 size: 1kg / 3.5kg / 7kg
    ├── features.json       # 4 tính năng vượt trội
    ├── pas.json            # 3 vấn đề cũ
    ├── safety.json         # 4 cam kết an toàn
    ├── images.json         # Mapping hình mỗi section
    └── site.json           # Hotline, social, address
```

## Edit nội dung

Toàn bộ landing này chỉnh được qua admin Terrazy — vào `https://kingsmen-terrazy.pages.dev/admin/edit.html` (đăng nhập GitHub admin).

## Deploy local

```bash
# Bất cứ static server nào cũng chạy được
npx serve .
# Hoặc
python -m http.server 5500
```

## Liên hệ

- Hotline: **0888 144 848**
- Brand: **Finex** (phân phối: Masfico Việt Nam)
