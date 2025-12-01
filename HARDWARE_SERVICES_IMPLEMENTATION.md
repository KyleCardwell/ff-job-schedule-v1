# Hardware Services Implementation

## Overview
Implemented a flexible junction table approach for storing service time values for hardware items (hinges, pulls, slides). This allows you to track how much time each service (installation, finishing, etc.) takes per hardware unit.

## Architecture Decision

**Chosen Approach**: Junction table (`hardware_services`)

**Why This is Better**:
- ✅ **Flexible**: Add new services without schema changes
- ✅ **Normalized**: Follows database best practices
- ✅ **Maintainable**: All service times in one centralized table
- ✅ **Queryable**: Easy to find all services for hardware or vice versa
- ✅ **Consistent**: Matches existing `parts_list_anchors` pattern

**Rejected Approach**: Adding columns to each hardware table
- ❌ Requires schema changes when adding services
- ❌ Must update all three tables (hinges, pulls, slides)
- ❌ Easy to forget adding columns to new services
- ❌ Denormalized data structure

## Database Schema

### New Table: `hardware_services`

```sql
CREATE TABLE hardware_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hardware_type TEXT NOT NULL CHECK (hardware_type IN ('hinge', 'pull', 'slide')),
  hardware_id UUID NOT NULL,
  team_service_id UUID NOT NULL REFERENCES team_services(id) ON DELETE CASCADE,
  time_per_unit DECIMAL(10, 4) NOT NULL DEFAULT 0 CHECK (time_per_unit >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(hardware_type, hardware_id, team_service_id)
);
```

**Key Fields**:
- `hardware_type`: Identifies which hardware table ('hinge', 'pull', or 'slide')
- `hardware_id`: The ID of the specific hardware item
- `team_service_id`: Links to the team's service configuration
- `time_per_unit`: Hours required per unit of hardware (e.g., 0.05 hours per hinge)

**Indexes**:
- Composite index on `(hardware_type, hardware_id)` for efficient lookups
- Index on `team_service_id` for service queries

**RLS Policies**: Team-scoped access control ensures users only see/edit their team's data

## Redux Implementation

### Action Types
Added to `/src/redux/actionTypes/hardware.js`:
- `FETCH_HARDWARE_SERVICES_SUCCESS`
- `SAVE_HARDWARE_SERVICES_START`
- `SAVE_HARDWARE_SERVICES_SUCCESS`
- `SAVE_HARDWARE_SERVICES_ERROR`

### Actions
In `/src/redux/actions/hardware.js`:

**`fetchHardwareServices()`**
- Fetches all hardware services for the team
- Joins with `team_services` to get service names
- Filters by team automatically

**`saveHardwareServices(hardwareType, hardwareId, services)`**
- Accepts array of services with `service_id` and `time_per_unit`
- Automatically handles insert/update/delete operations
- Deletes entries where `time_per_unit` is 0 or empty
- Upserts entries with non-zero values

### Reducer
Updated `/src/redux/reducers/hardware.js`:
- Added `hardwareServices: []` to initial state
- Handles fetch and save actions

## UI Implementation

### HardwareSettings Component
Updated `/src/components/manageSettings/HardwareSettings.jsx`:

**Dynamic Service Columns**:
- Fetches active services from Redux
- Creates a column for each active service
- Columns appear after Name, Price, and Actual Cost

**Features**:
- Service time inputs are disabled for new items (must save hardware first)
- Service time inputs are disabled for items marked for deletion
- Values default to 0 if not set
- Uses `step="0.01"` for decimal precision
- Auto-saves when you click the Save button

**Data Flow**:
1. Component loads → fetches hardware and services
2. Builds `hardwareServicesMap` from fetched data
3. Dynamically creates service columns
4. User edits service times → updates map
5. User clicks Save → saves hardware → saves all service times

## Migration Steps

### 1. Run Database Migration
Execute the SQL in `/migrations/hardware_services_table.sql`:

```bash
# Connect to your Supabase instance
psql YOUR_DATABASE_URL -f migrations/hardware_services_table.sql
```

Or run via Supabase dashboard SQL editor.

### 2. Verify Tables
Check that the table exists:
```sql
SELECT * FROM hardware_services LIMIT 1;
```

### 3. Test in UI
1. Navigate to Settings → Hardware
2. Add or edit a hinge/pull/slide
3. You should see columns for each active service
4. Enter time values (in hours)
5. Click Save
6. Refresh page and verify values persist

## Usage Example

### Scenario: European Hinges
You have "European Concealed Hinges" that require:
- 0.05 hours for installation service
- 0.02 hours for adjustment service

### Steps:
1. Go to Hardware Settings
2. Find "European Concealed Hinges" in the Hinges section
3. Enter `0.05` in the Installation column
4. Enter `0.02` in the Adjustment column
5. Click Save

### Database Result:
```
hardware_services table:
| id   | hardware_type | hardware_id | team_service_id | time_per_unit |
|------|---------------|-------------|-----------------|---------------|
| ...  | hinge         | hinge-uuid  | install-svc-id  | 0.05          |
| ...  | hinge         | hinge-uuid  | adjust-svc-id   | 0.02          |
```

## Integration with Estimates

The hardware service times can now be used in estimate calculations:

```javascript
// Example usage in estimate calculations
const totalHingeTime = cabinetHinges * hingeServiceTimes.installation;
```

## Benefits

1. **Flexible**: Add new services in service settings, they automatically appear in hardware settings
2. **Accurate**: Track precise time requirements per hardware type per service
3. **Team-specific**: Each team can have different service time values
4. **Maintainable**: Single source of truth for all hardware service times
5. **Scalable**: Adding new hardware types is straightforward

## Future Enhancements

Potential improvements:
- Bulk edit service times across multiple hardware items
- Copy service times from one hardware item to another
- Default service time templates
- Time value validation warnings (e.g., unusually high/low values)
- Service time reports/analytics

## Notes

- Service times are stored in **hours** (not minutes)
- Values are stored as `DECIMAL(10, 4)` for precision
- A value of `0` effectively means "not applicable" for that service
- New hardware items start with 0 for all services
- Deleted hardware automatically removes associated service entries (CASCADE)
