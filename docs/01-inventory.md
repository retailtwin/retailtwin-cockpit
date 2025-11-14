# RetailTwin Cockpit — Component & Data Inventory

**Framework:** React (Vite)  
**Language:** TypeScript  
**UI:** Shadcn (Radix UI + Tailwind)  
**DB Layer:** Supabase  
**Data fetching:** TanStack Query  
**Modes:** Demo / Excel Runner / Cloud DB

## Routes (example)
- `/dashboard` — KPIs, filters, charts
- `/reports` — snapshots and exports
- `/qa` — assistant (agentic insights)
- `/settings` — rules (lead-times, frequency, packs)

## Main Components (from dependencies)
- KPI Card
- Filter Bar
- Chart (Recharts)
- Table (data grid)
- Dialogs / Modals (Radix)
- DatePicker (react-day-picker)
- File Upload / Excel Import

## Environment Variables (see .env.example)
- `VITE_MODE`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_DEMO_MODE`
- `VITE_ENABLE_DATA_IMPORT`
- `VITE_ENABLE_ARCHIE_AI`
