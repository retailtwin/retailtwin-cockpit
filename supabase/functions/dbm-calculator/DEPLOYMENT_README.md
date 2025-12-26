# DBM Calculator Update - December 22, 2025

## Summary of Changes

This update adds support for two settings that were being saved to the database but ignored by the Edge Function:

### 1. `order_days` (Implemented)
- **What it does**: Restricts order creation to specific days of the week
- **Format**: Comma-separated day aliases (e.g., "mon,thu" for Monday and Thursday)
- **Empty value**: Orders can be placed any day (daily replenishment)
- **Source**: C# reference in `DBM_3.0/DynamicBufferMgmt/SkuLoc.cs` CreateOrder() method

### 2. `dynamic_period` (Implemented)
- **What it does**: Counts simulation days from first activity date, not from start of date range
- **Impact**: Fixes SKU Lock Days mismatch (17,885 vs 16,430 in Excel)
- **Format**: "true" or "false" in system_settings

### 3. `dynamic_initial_target` (Placeholder)
- Parked for future implementation
- Loads from settings but not yet used in algorithm


## Files Changed

| File | Changes |
|------|---------|
| `types.ts` | Added `order_days`, `dynamic_period`, `dynamic_initial_target` to Settings interface. Added `active_days`, `first_activity_date` to SkuLocationKPIs. |
| `dbm-engine.ts` | Added `isOrderDay()` method. Modified order creation to check if today is a valid order day. |
| `index.ts` | Modified `loadSettings()` to read new settings. Added active window calculation when `dynamic_period` is true. Updated KPI calculations to use active days. |


## Deployment Steps

### Option A: Copy files to local repo and deploy

```bash
# 1. Navigate to your Edge Function folder
cd ~/Projects/retailtwin-cockpit/supabase/functions/dbm-calculator

# 2. Backup current files
cp index.ts index.ts.backup
cp types.ts types.ts.backup
cp dbm-engine.ts dbm-engine.ts.backup

# 3. Copy new files (replace with actual paths from Claude output)
# [Copy the three .ts files from Claude's output to this folder]

# 4. Deploy to Supabase
cd ~/Projects/retailtwin-cockpit
supabase functions deploy dbm-calculator
```

### Option B: Update via Lovable
Send the three updated files to Lovable with instructions to replace the existing Edge Function files.


## Testing

After deployment, verify with these tests:

### Test 1: Order Days
1. Set `order_days` to "mon,thu" in Settings UI
2. Run simulation
3. Verify orders are only created on Mondays and Thursdays

### Test 2: Dynamic Period
1. Set `dynamic_period` to true in Settings UI
2. Run simulation on Wolford demo data
3. Verify SKU Lock Days now shows ~16,430 (matching Excel)
4. Verify Service Level improves (should be closer to 93%)

### Test 3: Backward Compatibility
1. Clear `order_days` (empty)
2. Set `dynamic_period` to false
3. Run simulation
4. Results should match previous behavior


## Database Settings Reference

Current values in `system_settings`:

| Key | Value | Status |
|-----|-------|--------|
| `order_days` | "thu,mon" | ✅ Now used |
| `dynamic_period` | "true" | ✅ Now used |
| `dynamic_initial_target` | "false" | ⏸️ Placeholder |


## Rollback

If issues occur, restore the backup files:

```bash
cd ~/Projects/retailtwin-cockpit/supabase/functions/dbm-calculator
cp index.ts.backup index.ts
cp types.ts.backup types.ts
cp dbm-engine.ts.backup dbm-engine.ts
supabase functions deploy dbm-calculator
```
