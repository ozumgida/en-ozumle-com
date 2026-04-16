# Campaign System — Usage Guide

Campaign definitions live in `settings/campaign.json`. If this file does not exist, the campaign system is completely inactive — no changes to basket behaviour occur.

Each campaign entry requires at least:

| Field | Type | Description |
|---|---|---|
| `type` | string | Campaign type (see types below) |
| `active` | boolean | `false` to temporarily disable without removing the entry |
| `label` | string | Customer-facing text shown in the basket |
| `messageLine` | string | Short label added to the WhatsApp order message |
| `img` | string (optional) | Banner image filename. Place the image in `img/campaigns/`. Shown in the campaigns strip **above the product list**. Omit to skip the banner for that campaign. |
| `addProducts` | array (optional) | Products added to the cart when the campaign banner is clicked. Each entry: `{ "id": "p500", "qty": 1 }`. Leave as `[]` if the banner is informational only. |

---

## Campaign Types

### 1. `tier_discount` — Order Amount Discount

Applies a discount when the cart subtotal reaches one or more thresholds. If multiple tiers are defined, only the highest qualifying tier is applied.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `tiers` | array | List of threshold objects (see below) |
| `tiers[].minOrderTotal` | number | Minimum subtotal (₺) to qualify |
| `tiers[].discountAmount` | number | Discount value |
| `tiers[].discountType` | string | `"fixed"` (₺) or `"percentage"` (%) |

**Basket behaviour:**
- A discount row appears in the totals section when a tier is reached.
- A progress hint appears for the next unmet tier: *"Add ₺320 more for a ₺100 discount!"*
- The hint disappears once the highest tier is reached.

**Single threshold — classic minimum order discount:**

```json
{
  "type": "tier_discount",
  "active": true,
  "img": "indirim-1500.webp",
  "addProducts": [],
  "label": "₺100 discount on orders over ₺1,500!",
  "messageLine": "Order Discount",
  "tiers": [
    { "minOrderTotal": 1500, "discountAmount": 100, "discountType": "fixed" }
  ]
}
```

**Multiple thresholds — tiered discount:**

```json
{
  "type": "tier_discount",
  "active": true,
  "img": "indirim-kademeli.webp",
  "addProducts": [],
  "label": "₺100 off over ₺1,500 — ₺250 off over ₺3,000!",
  "messageLine": "Order Discount",
  "tiers": [
    { "minOrderTotal": 1500, "discountAmount": 100, "discountType": "fixed" },
    { "minOrderTotal": 3000, "discountAmount": 250, "discountType": "fixed" }
  ]
}
```

**Percentage discount:**

```json
{
  "type": "tier_discount",
  "active": true,
  "addProducts": [],
  "label": "10% discount on orders over ₺2,000!",
  "messageLine": "Order Discount",
  "tiers": [
    { "minOrderTotal": 2000, "discountAmount": 10, "discountType": "percentage" }
  ]
}
```

---

### 2. `multi_unit` — Multi-Quantity Discount

Applies a per-unit discount when the customer adds a minimum quantity of a specific product. Uses `productId` — find the correct ID in `settings/products/*.json` under the `"id"` field.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `productId` | string | Product `id` from `settings/products/*.json` |
| `tiers` | array | List of quantity threshold objects |
| `tiers[].minQuantity` | number | Minimum quantity to qualify |
| `tiers[].discountPerUnit` | number | Discount per unit (₺, fixed) |

**Basket behaviour:**
- The discount is applied to all units of the product (not just units above the threshold).
- The total line discount cannot exceed the product's line total.
- Only the highest qualifying tier applies.
- A progress hint appears for the next unmet tier: *"Add 1 more Tulum Cheese 500 gr for ₺50/unit off!"*

**Example — discount for buying 2+ units of the 500 gr cheese:**

```json
{
  "type": "multi_unit",
  "active": true,
  "img": "coklu-adet.webp",
  "addProducts": [{ "id": "p500", "qty": 2 }],
  "productId": "p500",
  "label": "Buy 2+ Tulum Cheese 500 gr — ₺50 off per unit!",
  "messageLine": "Multi-Unit Discount",
  "tiers": [
    { "minQuantity": 2, "discountPerUnit": 50 }
  ]
}
```

**Example — tiered quantity discount on the 1 kg cheese:**

```json
{
  "type": "multi_unit",
  "active": true,
  "img": "coklu-adet-1kg.webp",
  "addProducts": [{ "id": "p1000", "qty": 2 }],
  "productId": "p1000",
  "label": "Buy 2+ get ₺80 off / Buy 4+ get ₺150 off per kg cheese!",
  "messageLine": "Multi-Unit Discount",
  "tiers": [
    { "minQuantity": 2, "discountPerUnit": 80 },
    { "minQuantity": 4, "discountPerUnit": 150 }
  ]
}
```

**Available product IDs:**

| ID | Product |
|---|---|
| `p500` | Erzincan Tulum Cheese 500 gr |
| `p1000` | Erzincan Tulum Cheese 1 kg |
| `yt900` | Salted Butter 900 gr |
| `y500` | Unsalted Butter 500 gr |

---

### 3. `free_shipping` — Free Shipping Campaign

Overrides the standard shipping fee with zero when one or more conditions are met. Unlike the default shipping calculation (which silently returns free shipping at 15 kg), this type shows a named campaign label in the basket so the customer knows *why* their shipping is free.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `conditions` | array | List of trigger condition objects (see below) |
| `conditions[].minWeight` | number | Total cart weight in **kg** |
| `conditions[].minOrderTotal` | number | Cart subtotal in ₺ |
| `conditions[].hintTemplate` | string | Progress hint text shown when this condition is not yet met. Use `{remaining}` as a placeholder for the calculated remaining amount. |

**Basket behaviour:**
- Any single satisfied condition triggers free shipping.
- A campaign label row appears in the totals section.
- A progress hint is shown for the first unmet condition (in array order): *"Add 2.5 kg more for free shipping!"*

**Example — weight-based only (mirrors the current 15 kg shipping rule):**

```json
{
  "type": "free_shipping",
  "active": true,
  "img": "kargo-bedava.webp",
  "addProducts": [],
  "conditions": [
    {
      "minWeight": 15,
      "hintTemplate": "Add {remaining} kg more for free shipping!"
    }
  ],
  "label": "Free Shipping!",
  "messageLine": "Free Shipping Campaign"
}
```

**Example — amount-based only:**

```json
{
  "type": "free_shipping",
  "active": true,
  "addProducts": [],
  "conditions": [
    {
      "minOrderTotal": 1500,
      "hintTemplate": "Add ₺{remaining} more for free shipping!"
    }
  ],
  "label": "Free Shipping on orders over ₺1,500!",
  "messageLine": "Free Shipping Campaign"
}
```

**Example — either weight OR amount qualifies (first unmet shows its hint):**

```json
{
  "type": "free_shipping",
  "active": true,
  "img": "kargo-bedava.webp",
  "addProducts": [],
  "conditions": [
    {
      "minWeight": 15,
      "hintTemplate": "Add {remaining} kg more for free shipping!"
    },
    {
      "minOrderTotal": 1500,
      "hintTemplate": "Add ₺{remaining} more for free shipping!"
    }
  ],
  "label": "Free Shipping — 15 kg or ₺1,500+ orders!",
  "messageLine": "Free Shipping Campaign"
}
```

> **Migration note:** The existing 15 kg free shipping rule in `settings/shipping.js` should be removed once this campaign is active, so the logic lives in one place.

---

### 4. `happy_hour` — Time & Day Based Discount (Restaurant)

Applies a percentage or fixed discount during a specific time window on selected days of the week. The schedule is evaluated against the shop's timezone (defined once in `settings/company.json` as `"timezone"`, e.g. `"Europe/Istanbul"`). If no timezone is set, the visitor's local clock is used.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `schedule.days` | array | Day names: `"MONDAY"` … `"SUNDAY"` |
| `schedule.startTime` | string | Start time `"HH:MM"` (24h) |
| `schedule.endTime` | string | End time `"HH:MM"` (24h) |
| `discountType` | string | `"percentage"` or `"fixed"` |
| `discountValue` | number | Discount amount |
| `scope` | string | `"all"` — applies to the entire cart |

**Basket behaviour:**
- Outside the scheduled window: the campaign is completely hidden (no label, no discount).
- Inside the window: a discount row appears and the total is reduced.
- When the shop timezone is set and the campaign is active, a small disclaimer appears in the basket: *"This discount is based on restaurant time. Your device clock may differ."*

> **No progress hint:** There is no progress hint for `happy_hour` — customers cannot add products to influence the time. The campaign banner image (always visible above the product list) acts as a natural teaser during off-hours.

> **Timezone:** Set `"timezone": "Europe/Istanbul"` (or your IANA timezone) in `settings/company.json`. This applies to all time-based campaign checks. Without it, the visitor's local clock is used — which is correct for local restaurant / kiosk use, but may be unexpected for e-commerce customers in different time zones.

**Example — weekday afternoon happy hour:**

```json
{
  "type": "happy_hour",
  "active": true,
  "img": "happy-hour.webp",
  "addProducts": [],
  "schedule": {
    "days": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    "startTime": "16:00",
    "endTime": "18:00"
  },
  "discountType": "percentage",
  "discountValue": 20,
  "scope": "all",
  "label": "Happy Hour — 20% off (16:00–18:00)!",
  "messageLine": "Happy Hour Discount"
}
```

**Example — fixed discount every weekend:**

```json
{
  "type": "happy_hour",
  "active": false,
  "img": "hafta-sonu.webp",
  "addProducts": [],
  "schedule": {
    "days": ["SATURDAY", "SUNDAY"],
    "startTime": "12:00",
    "endTime": "15:00"
  },
  "discountType": "fixed",
  "discountValue": 50,
  "scope": "all",
  "label": "Weekend Lunch Special — ₺50 off!",
  "messageLine": "Weekend Discount"
}
```

---

## Campaign Banners

When a campaign entry includes an `img` field, it is displayed as a banner in a horizontal strip **above the product list** — visible before the customer starts adding items.

```
┌──────────────────────────────────────────────────┐
│  [banner 1]   [banner 2]   [banner 3]            │  ← campaigns strip
├──────────────────────────────────────────────────┤
│  Product 1    Product 2    Product 3  …           │  ← product list
└──────────────────────────────────────────────────┘
```

All campaigns with an `img` are shown side by side in a single row that scrolls horizontally on narrow screens. Campaigns without `img` have no visual presence in the strip (they still apply in the basket when qualifying).

**Clicking a banner:** If the campaign has `addProducts` defined, clicking its banner adds those products directly to the cart and opens the basket. This lets you pre-fill a typical order with one tap. If `addProducts` is empty, the banner is purely informational.

The banner strip is built by the template system into `campaigns.html` at the site root (alongside `menu.html`). Place this file's content on your page wherever the strip should appear.

---

## `settings/company.json` — Timezone

Add the shop's timezone once so all time-based campaigns use it:

```json
{
  "timezone": "Europe/Istanbul"
}
```

Use an [IANA timezone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). If omitted, all time checks fall back to the visitor's local clock.

---

## Full `settings/campaign.json` Example

All four types shown together. Set `"active": false` to disable a campaign without deleting it.

```json
{
  "campaigns": [
    {
      "type": "tier_discount",
      "active": true,
      "img": "indirim-1500.webp",
      "addProducts": [],
      "label": "₺100 discount on orders over ₺1,500!",
      "messageLine": "Order Discount",
      "tiers": [
        { "minOrderTotal": 1500, "discountAmount": 100, "discountType": "fixed" },
        { "minOrderTotal": 3000, "discountAmount": 250, "discountType": "fixed" }
      ]
    },
    {
      "type": "multi_unit",
      "active": false,
      "img": "coklu-adet.webp",
      "addProducts": [{ "id": "p500", "qty": 2 }],
      "productId": "p500",
      "label": "Buy 2+ Tulum Cheese 500 gr — ₺50 off per unit!",
      "messageLine": "Multi-Unit Discount",
      "tiers": [
        { "minQuantity": 2, "discountPerUnit": 50 }
      ]
    },
    {
      "type": "free_shipping",
      "active": true,
      "img": "kargo-bedava.webp",
      "addProducts": [],
      "conditions": [
        {
          "minWeight": 15,
          "hintTemplate": "Add {remaining} kg more for free shipping!"
        }
      ],
      "label": "Free Shipping on orders of 15 kg and above!",
      "messageLine": "Free Shipping Campaign"
    },
    {
      "type": "happy_hour",
      "active": false,
      "img": "happy-hour.webp",
      "addProducts": [],
      "schedule": {
        "days": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        "startTime": "16:00",
        "endTime": "18:00"
      },
      "discountType": "percentage",
      "discountValue": 20,
      "scope": "all",
      "label": "Happy Hour — 20% off (16:00–18:00)!",
      "messageLine": "Happy Hour Discount"
    }
  ]
}
```

---

## Rules and Limits

- **Multiple active campaigns stack:** discounts from all active and qualifying campaigns are summed.
- **Free shipping is independent:** a `free_shipping` campaign does not count toward monetary discounts — it only overrides the shipping fee.
- **Discount cannot exceed line total:** for `multi_unit`, the discount on a product line is capped at that line's total price.
- **`happy_hour` + other discounts:** if a `happy_hour` and a `tier_discount` are both active, both apply simultaneously.
- **OR logic, not AND:** wherever a campaign accepts multiple conditions (`free_shipping` conditions, `tier_discount` tiers), satisfying any one of them is enough — the system never requires two conditions to be true at the same time. AND logic is intentionally excluded: requiring customers to satisfy multiple rules simultaneously consistently causes confusion and cart abandonment.
- **Progress hints are cart-driven:** `tier_discount`, `multi_unit`, and `free_shipping` all show progress hints as the customer builds their cart. `happy_hour` has no progress hint — time cannot be influenced by adding products.
