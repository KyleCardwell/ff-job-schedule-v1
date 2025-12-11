# Lengths Settings Implementation

Complete implementation of the Lengths management system, **following the Hardware pattern** (not Accessories).

## Overview

The Lengths system allows teams to manage catalog items for linear measurements (crown molding, toe kick, shelves, etc.) with material-based pricing (board feet calculation), miter tracking, and service time estimates.

**Key Concept**: Pricing is calculated from the selected material's `bd_ft_price`, not stored in the catalog. This keeps pricing consistent with cabinets and automatically reflects material price updates.

## Database Structure

### `lengths_catalog` Table
- Team-specific catalog of length types
- Fields: `id`, `team_id`, `name`, `type`, `requires_miters`, `requires_cutouts`, `default_width`, `default_thickness`, `description`
- Types: molding, base, shelf, top, other
- **Note**: No pricing stored here - price calculated from material's bd_ft price

### `length_services` Table
- **Separate table for lengths** (does NOT use `hardware_services`)
- Fields: `id`, `length_catalog_id`, `team_service_id`, `time_per_unit`, `is_miter_time`, `is_cutout_time`
- Time per unit for each service per catalog item
- **Triple purpose**: Stores regular time (per foot), miter time (per miter cut), AND cutout time (per cutout)
  - `is_miter_time = false, is_cutout_time = false`: Time per foot for regular length installation
  - `is_miter_time = true, is_cutout_time = false`: Time per miter cut
  - `is_miter_time = false, is_cutout_time = true`: Time per cutout
- Foreign keys to `lengths_catalog` and `team_services`
- Unique constraint on `(length_catalog_id, team_service_id, is_miter_time, is_cutout_time)`
  - Allows up to 3 rows per service: regular, miter, and cutout

### `estimate_lengths` Table Updates
- Added `length_catalog_id` (FK to catalog)
- Added `material_id` (FK to materials table - for pricing calculation)
- Added `miter_count` (integer for counting miters)
- Added `cutout_count` (integer for counting cutouts)
- Added `width` (inches - defaults to catalog `default_width`)
- Added `thickness` (inches - defaults to catalog `default_thickness`)

**Pricing Calculation**:
```javascript
boardFeet = (length × width × thickness) / 144
price = boardFeet × material.bd_ft_price
```

## Redux Implementation (Hardware Pattern)

### Action Types (`src/redux/actionTypes/lengths.js`)
- `FETCH_LENGTHS_CATALOG_START/SUCCESS/ERROR`
- `SAVE_LENGTHS_CATALOG_START/SUCCESS/ERROR`
- `SAVE_LENGTH_TIME_ANCHORS_START/SUCCESS/ERROR` (reuses for services)

### Actions (`src/redux/actions/lengths.js`)
**Key difference from Accessories**: Single fetch with embedded services (like Hardware)

- `fetchLengthsCatalog()` - Fetches catalog items WITH embedded services in one query
  - Uses Supabase joins to embed `length_services` data
  - Transforms nested structure to flat `services` array
  - Returns lengths with their service times already attached
  
- `saveLengthsCatalog(items, originalItems)` - Handles add/update/delete operations for catalog items
  - Strips `services` field before saving (computed field)
  - Follows hardware pattern exactly
  
- `saveLengthServices(lengthId, services)` - Saves service times to `length_services` table
  - Uses `length_catalog_id` column
  - Upserts or deletes based on time values
  - Matches hardware pattern exactly

### Reducer (`src/redux/reducers/lengthsReducer.js`)
- Organizes catalog by type: molding, base, shelf, top, other
- Stores full catalog and categorized items
- Manages loading and error states

## UI Components

### LengthsSettings.jsx
Main settings component with:
- Fetches and displays lengths catalog grouped by type
- Local state management with validation
- Add/edit/delete operations with undo support
- Save/cancel functionality via `useImperativeHandle`
- **Service time columns** (following Hardware pattern):
  - Dynamic columns for each active service
  - Up to three inputs per service based on checkboxes:
    - **Top input**: Time per foot (regular, slate background) - always visible
    - **Middle input**: Time per miter (amber-highlighted, only shows when "Miters" checked)
    - **Bottom input**: Time per cutout (cyan-highlighted, only shows when "Cutouts" checked)
  - Service times save automatically with catalog items
- Columns:
  - Name (required)
  - Miters (checkbox - shows/hides miter time inputs)
  - Cutouts (checkbox - shows/hides cutout time inputs)
  - Width (inches - default dimension for board feet calc)
  - Thickness (inches - default dimension for board feet calc)
  - Description (optional text)
  - Service columns (dynamic based on active services)

## Length Types

Default categories:
1. **Molding** - Crown, top mold, light rail (can have miters)
2. **Base** - Toe kick, furniture base (can have miters)
3. **Shelf** - Floating shelves, fixed shelves
4. **Top** - Wood tops, countertops
5. **Other** - Catch-all for custom items

## Integration

### AdminDashboard Integration
- Added to settings tabs with `enable_estimates` feature toggle
- Path: `/manage/lengths`
- Admin-only access
- Max width: 1000px

### Constants
- `LENGTH_TYPES` object with type constants
- `PATHS.MANAGE_LENGTHS` route definition

## Usage Workflow

### Admin Setup (Manage → Lengths)
1. Navigate to Manage → Lengths
2. Click "+ Add [Type]" to create catalog items
3. Configure each item:
   - Name (e.g., "Crown", "Toe Kick")
   - Check "Miters" if item requires miter cuts
   - Check "Cutouts" if item requires cutouts (e.g., for outlets, vents)
   - Set default Width (e.g., 3.5" for crown molding)
   - Set default Thickness (e.g., 0.75" for most molding)
   - Enter service times in dynamic service columns:
     - **Regular time** (top input, slate): Hours per linear foot
     - **Miter time** (middle input, amber): Hours per miter cut (only appears if "Miters" checked)
     - **Cutout time** (bottom input, cyan): Hours per cutout (only appears if "Cutouts" checked)
4. Click "Save Changes" to persist catalog and service times to database

### Creating Estimates
1. Select length catalog item (e.g., "Crown")
2. Select material (e.g., "Maple") - uses material's `bd_ft_price`
3. Enter length in feet
4. Enter miter count if applicable
5. Enter cutout count if applicable
6. Optionally override width/thickness if different from catalog defaults
7. **Price auto-calculates**: `(length × width × thickness / 144) × material.bd_ft_price`
8. **Time auto-calculates** (per service):
   ```javascript
   totalTime = (length_feet × time_per_foot) + (miter_count × time_per_miter) + (cutout_count × time_per_cutout)
   ```

## Key Features

- ✅ Team-specific catalog management
- ✅ Material-based pricing (uses material's bd_ft_price)
- ✅ Default dimensions (width/thickness) with estimate-level overrides
- ✅ Miter tracking for items that need it
- ✅ Board feet calculation: (length × width × thickness) / 144
- ✅ **Service time tracking FULLY IMPLEMENTED**:
  - Time per foot for regular installation
  - Separate time per miter cut (when miters enabled)
  - Separate time per cutout (when cutouts enabled)
  - Triple-input UI following Hardware pattern
  - Auto-saves with catalog items
- ✅ Validation and error handling
- ✅ Undo support for deletions
- ✅ Auto-focus on new items

## Implementation Details

### Service Time Storage
Each length catalog item can have up to 3 service time entries per service:
1. **Regular entry** (`is_miter_time = false, is_cutout_time = false`): Time in hours per linear foot
2. **Miter entry** (`is_miter_time = true, is_cutout_time = false`): Time in hours per miter cut (only if `requires_miters = true`)
3. **Cutout entry** (`is_miter_time = false, is_cutout_time = true`): Time in hours per cutout (only if `requires_cutouts = true`)

Example database rows for "Crown Molding" with Install & Finish services:
```sql
length_catalog_id | team_service_id | time_per_unit | is_miter_time | is_cutout_time | service_name
------------------|-----------------|---------------|---------------|----------------|-------------
123               | 1               | 0.15          | false         | false          | Install (per ft)
123               | 1               | 0.25          | true          | false          | Install (per miter)
123               | 1               | 0.10          | false         | true           | Install (per cutout)
123               | 2               | 0.10          | false         | false          | Finish (per ft)
123               | 2               | 0.20          | true          | false          | Finish (per miter)
123               | 2               | 0.08          | false         | true           | Finish (per cutout)
```

### UI Behavior
- Service time inputs appear as dynamic columns
- **Regular time input** (top, slate): Always visible for all items
- **Miter time input** (middle, amber):
  - Only visible when "Miters" checkbox is checked
  - Any miter time entries deleted on save when checkbox unchecked
- **Cutout time input** (bottom, cyan):
  - Only visible when "Cutouts" checkbox is checked
  - Any cutout time entries deleted on save when checkbox unchecked
- All inputs stack vertically in each service column

## Database Migration

**1. Run the migration file:**
```sql
-- migrations/lengths_catalog_tables.sql
```

This creates:
- `lengths_catalog` table (team-specific catalog with `requires_miters` and `requires_cutouts` flags)
- `length_services` table (separate from hardware - includes `is_miter_time` and `is_cutout_time` booleans)
  - Stores regular time per foot, miter time per cut, AND cutout time per cutout
  - Unique constraint on (length_catalog_id, team_service_id, is_miter_time, is_cutout_time)
- Updates to `estimate_lengths` table (adds length_catalog_id, width, thickness, miter_count, cutout_count)
- Proper foreign keys and unique constraints

**2. Seed Default Catalog Items (Optional):**
```sql
-- Replace 'your-team-uuid' with actual team UUID
INSERT INTO lengths_catalog (team_id, name, type, requires_miters, requires_cutouts, default_width, default_thickness, description)
VALUES 
  ('your-team-uuid', 'Crown', 'molding', true, false, 3.5, 0.75, 'Standard crown molding'),
  ('your-team-uuid', 'Top Mold', 'molding', true, false, 2.5, 0.75, 'Top rail molding'),
  ('your-team-uuid', 'Toe Kick', 'base', false, true, 4.0, 0.75, 'Base cabinet toe kick with cutouts'),
  ('your-team-uuid', 'Furniture Base', 'base', true, 3.5, 0.75, 'Furniture style base'),
  ('your-team-uuid', 'Light Rail', 'molding', false, 1.5, 0.5, 'Under-cabinet light rail'),
  ('your-team-uuid', 'Floating Shelves', 'shelf', false, 12.0, 1.0, 'Custom floating shelves'),
  ('your-team-uuid', 'Wood Top', 'top', false, 25.0, 1.5, 'Solid wood countertop');
```

**Pricing Example:**
- Crown: 10 ft × 3.5" width × 0.75" thickness = 1.823 board feet
- Material: Maple @ $8.00/bd_ft
- Price: 1.823 × $8.00 = $14.58

## Common Length Items Examples

**Molding:**
- Crown (requires miters)
- Top Mold (requires miters)
- Light Rail
- Valance

**Base:**
- Toe Kick
- Furniture Base (requires miters)
- Baseboard (requires miters)

**Shelf:**
- Floating Shelves
- Fixed Shelves
- Cabinet Shelves

**Top:**
- Wood Top (custom countertops)
- Butcher Block
- Edge Banding

## Benefits Over Old System

1. **Catalog-based**: Consistent naming and dimensions across estimates
2. **Material-driven Pricing**: Price automatically calculated from material's bd_ft price
3. **Consistent with Cabinets**: Same pricing model as cabinet materials
4. **Automatic Updates**: When material prices change, all estimates reflect it
5. **Team-specific**: Each team manages their own catalog
6. **Flexible**: Easy to add new length types as needed
7. **Integrated**: Works with service time tracking system
8. **Override Support**: Can override dimensions per estimate item
9. **Miter Tracking**: Explicit field for items requiring miters

## Notes

- **Follows Hardware PATTERN (single fetch), but uses SEPARATE tables**
- All lint warnings in actions/reducer match the hardware pattern (intentional for debugging, destructuring)
- Uses dedicated `length_services` table - **NOT** shared with `hardware_services`
- Component uses forwardRef for save/cancel integration with AdminDashboard
- Validation ensures all required fields before saving
- Services are fetched with catalog items in one query (more efficient than accessories)

## Why Hardware Pattern vs Accessories?

**Hardware Pattern Approach** ✅ (What we use):
- Single fetch with embedded services
- Services included in catalog items automatically
- Simpler state management
- Less database queries
- **Note**: We use separate `length_services` table, not shared `hardware_services`

**Accessories Pattern** ❌ (Not used):
- Separate fetches for catalog and time anchors
- More complex state coordination
- Separate `accessory_time_anchors` table (not actively used)
- More actions/reducers to maintain

**Why Not Share Hardware Tables?**
- Clean separation of concerns
- No need to modify existing hardware constraints
- Easier to maintain and query
- Follows same efficient pattern without coupling to hardware
