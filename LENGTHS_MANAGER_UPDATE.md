# Lengths Manager Update Summary

## Overview
Updated the EstimateLengthManager component to use the new lengths Redux structure and implemented proper calculation logic for length items with material costs and labor hours.

## Changes Made

### 1. EstimateLengthManager Component (`/src/components/estimates/EstimateLengthManager.jsx`)

**Updated LengthItemForm:**
- Added Redux integration with `useDispatch` and `useSelector` to access lengths catalog
- Changed from simple name/length inputs to structured type selection + item selection
- Added new fields:
  - `length_catalog_id` - FK to lengths_catalog table
  - `length` - actual length of the item **in feet** (user-friendly input)
  - `miter_count` - number of miters for this length item
  - `cutout_count` - number of cutouts for this length item
- Organized by type (molding, base, shelf, top, other)
- Similar pattern to EstimateAccessoriesManager with type dropdown → item dropdown

**Updated EstimateLengthManager:**
- Added display columns for type, item name, quantity, length, miters, and cutouts
- Uses catalog lookup functions to display proper names and types
- Renders custom columns with proper formatting (e.g., length with " suffix)

### 2. Calculation Logic (`/src/utils/getSectionCalculations.js`)

**New `calculateLengthTotals` Function (lines 880-955):**
- Calculates material costs based on length dimensions and selected face material
- **Input Conversion:** User inputs length in **feet**, converted to inches for material calculations (`lengthInches = lengthFeet * 12`)
- **Material Cost Logic:**
  - If `material.bd_ft_price` exists: Calculate board feet = `(lengthInches * width * thickness) / 144`
  - Apply 10% waste factor (1.1 multiplier) for linear items
  - If only `sheet_price` exists: Calculate area as fraction of sheet, then apply per-sqft pricing
- **Labor Hours Calculation:**
  - Reads time values from `length_services` embedded in catalog items
  - Base time = `time_per_unit * lengthFeet * quantity` (time is per linear foot, uses feet directly)
  - Additional time for miters: If `service.is_miter_time`, add `time_per_unit * miterCount * quantity`
  - Additional time for cutouts: If `service.is_cutout_time`, add `time_per_unit * cutoutCount * quantity`
  - Returns `{ materialTotal, hoursByService: { serviceId: hours } }`

**Updated `getSectionCalculations` Function:**
- Replaced `calculateSimpleItemsTotal(section.lengths)` with `calculateLengthTotals(section.lengths)`
- Added `lengthTotals.materialTotal` to `partsTotalPrice` calculation
- Merged `lengthTotals.hoursByService` into `finalHoursByService` alongside cabinet hours
- Hours from lengths are aggregated by service ID (2=shop, 3=finish, 4=install)

### 3. Context Updates (`/src/components/estimates/EstimateSectionPrice.jsx`)

**Added lengths to Redux selectors:**
- Destructured `lengths` from Redux state
- Added `lengthsCatalog: lengths?.catalog || []` to calculation context
- Added `lengths` to useMemo dependencies

## Data Flow

1. **Form Input:**
   - User selects type (molding/base/shelf/top/other)
   - User selects specific item from filtered catalog
   - User enters quantity, **length in feet**, miter count, cutout count
   - Data saved with `length_catalog_id` reference and length in feet

2. **Calculation:**
   - `calculateLengthTotals` looks up catalog item by `length_catalog_id`
   - **Converts feet to inches** for material calculations: `lengthInches = lengthFeet * 12`
   - Uses item's width dimension and section's face material for pricing
   - Calculates material cost using bd_ft_price (preferred) or sheet_price
   - Calculates labor hours from embedded `length_services` using feet directly (time is per linear foot)
   - Returns material total and hours by service

3. **Aggregation:**
   - Material costs added to `partsTotalPrice`
   - Labor hours merged with cabinet hours by service ID
   - Final pricing includes profit/commission/discount calculations

## Benefits

✅ **Structured Data**: Length items now reference catalog with proper FKs
✅ **Accurate Pricing**: Uses actual material costs (bd_ft or sheet pricing) instead of manual entry
✅ **Labor Tracking**: Proper time calculations with miter/cutout adjustments
✅ **Consistent Pattern**: Follows same structure as accessories (type → item selection)
✅ **Service Integration**: Labor hours aggregated by service type for accurate estimates
✅ **Material Flexibility**: Handles both hardwood (bd_ft) and sheet goods pricing

## Database Structure

Length items are stored in `estimate_lengths` table with:
- `length_catalog_id` (FK to lengths_catalog)
- `length` (actual length **in feet** - user-friendly input)
- `quantity` (number of pieces)
- `miter_count` (number of miters)
- `cutout_count` (number of cutouts)

**Note:** Length is stored in feet for user convenience. The calculation logic converts to inches internally for material calculations (`lengthInches = lengthFeet * 12`).

Lengths catalog includes embedded services via `length_services` join table:
- `time_per_unit` (hours per linear foot)
- `is_miter_time` (flag for miter-specific time)
- `is_cutout_time` (flag for cutout-specific time)
