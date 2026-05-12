# Zando Mobile Supplier MVP

Zando is a mobile-first supplier/grossiste dashboard built for small distributors, beverage depots, bars, shops, and neighborhood retail networks in the DRC.

This MVP focuses on the **supplier/grossiste side** of the business: receiving boutique orders, managing stock, preparing deliveries, tracking collections, and understanding customer/product performance.

---

## Current MVP Status

The current version is a working mobile supplier dashboard connected to Supabase.

Validated workflows:

- Orders load from Supabase
- Order status updates persist
- Inventory loads from Supabase
- Stock updates persist
- Preparing an order deducts stock once
- Double stock deduction protection works
- Deliveries reflect order movement
- Delivered orders appear in finances
- Collection confirmation updates available balance
- Customers are grouped from order history
- Product insights show best-selling product performance
- Quick Sale works
- New Order works
- Production build passes

---

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase
- lucide-react

---

## Main Routes

### Dashboard

```txt
/mobile-dashboard