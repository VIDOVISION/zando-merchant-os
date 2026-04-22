# Zando Merchant OS

Zando Merchant OS is a lightweight merchant operating system built for neighborhood retailers.

It helps merchants:

* monitor stock
* prepare supplier reorders
* track deliveries
* record sales
* follow cash movements
* manage basic shop settings

## Current status

MVP in active testing.

Core flows currently covered:

* product and stock monitoring
* add product
* manual stock adjustment
* reorder preparation
* supplier order tracking
* delivery follow-up
* sales recording
* payments overview
* merchant settings

## Tech stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* Supabase

## Local development

Clone the repository:

```bash
git clone https://github.com/VIDOVISION/zando-merchant-os.git
cd zando-merchant-os
```

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

## Environment variables

Create a `.env.local` file and add the required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database

The project uses Supabase for persistence.

SQL migrations are stored in the `migrations/` folder.

## Notes

This project is currently focused on delivering a clean, practical MVP for merchant workflow testing before broader rollout and mobile adaptation.
