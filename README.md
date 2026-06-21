# Role Reader

Read Customer Success and Product job listings across 144 ecom/SaaS brands — cached locally for fast scanning.

## Features

- **Reading Room** — primary inbox for CS & Product roles across all brands
- **Bulk cache** — scan all 144 companies and cache listings locally (IndexedDB)
- **AI summaries** — role type, day-to-day, and org position (Anthropic)
- **Read tracking** — mark roles read/unread, filter unread, keyboard navigation (↑↓ or j/k)
- **Company CRM** — searchable/paginated company list
- **Single Brand** — per-company careers analyzer

## Quick start

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for summaries
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Reading Room** tab.

## Similar Tools Finder

Discover adjacent ecom SaaS platforms and loop them into your CRM:

1. Open **Similar Tools** tab
2. Pick a seed company and edit its **Platform Summary**
3. Click **Find similar tools** (uses Anthropic)
4. Select results → **Save to CRM**
5. Use saved company as next seed → repeat toward 1000s of targets

### CRM import format

```csv
Company,Domain,Careers URL,Tier,Estimated Revenue,Revenue Period/Range,Source,Confidence,Platform Summary
Klaviyo,klaviyo.com,klaviyo.com/careers,Tier 1 ($1B+),~$1.2B,FY2025,Company financials,Confirmed (public),"Marketing automation for e-commerce brands"
```

CRM changes persist in localStorage. Export anytime from CRM or Similar Tools tabs.

## Pre-cache all brands (recommended)

While you're away, pre-build the full CS/Product cache:

```bash
npm run cache:all
```

This writes `public/cache/` (analyses + job details). On first app load, the Reading Room imports this into IndexedDB automatically.

You can also click **Cache all brands** in the UI to sync from the browser.

## Reading workflow

1. Open **Reading Room**
2. Click **Cache all brands** (or use pre-built `npm run cache:all`)
3. Filter **CS** / **Product** / **Unread only**
4. Click a role → read AI summary → expand full listing if needed
5. **Next** or press ↓ to advance (auto-marks current as read)

## AI summaries

Job listings are summarized into three sections:

1. **What kind of role is this?** — function, seniority, specialization
2. **Day-to-day responsibilities** — concrete workflows and deliverables
3. **Where this role sits** — team placement and org context

Set your API key in `.env.local`:

```bash
cp .env.example .env.local
# Add ANTHROPIC_API_KEY=sk-ant-...
```

## CRM CSV columns

```
name,hq_street,hq_city,hq_state_region,hq_postal_code,hq_country,hq_address_json,country_name,country_code,category_primary,category_tags,website,revenue_amount_usd,revenue_display,revenue_currency,revenue_period,revenue_period_end,revenue_source,linkedin_page,socials_json,estimated_employees,employees_source,careers_page
```

A sample row for Klaviyo is included in `data/companies.csv`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### `POST /api/analyze`

```json
{ "careersPage": "https://www.klaviyo.com/careers/search-jobs" }
```

Returns open roles, provider metadata, and warnings.

### `POST /api/job-detail`

```json
{
  "provider": "greenhouse",
  "boardSlug": "klaviyo",
  "jobId": "7740544003",
  "url": "https://www.klaviyo.com/careers/jobs/7740544003"
}
```

Returns scraped HTML/text for the listing popup.

## Project structure

```
data/companies.csv          # seed CRM data
src/lib/csv.ts              # CSV parser
src/lib/scraper/analyzer.ts # careers scraping logic
src/components/crm/         # CRM table UI
src/components/careers/     # analyzer + job popup
```
