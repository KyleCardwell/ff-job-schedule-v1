# Three-Tier Defaults System - Complete Implementation Summary

## 🎯 Overview

This implementation adds a three-tier defaults system to your estimates application:

**Team Defaults → Estimate Defaults → Section Values**

- **Team level**: Required defaults for the entire team
- **Estimate level**: Optional overrides (NULL = use team default)
- **Section level**: Optional overrides (NULL = use estimate/team default)

## 📁 Files Created

### 1. Database Migration
**`migrations/add_defaults_to_teams_and_estimates.sql`**
- Adds `default_*` columns to `teams` table (NOT NULL)
- Adds `default_*` columns to `estimates` table (NULLABLE)
- Includes foreign key constraints
- Ready to run after adjusting default IDs for your database

### 2. Utility Functions
**`src/utils/estimateDefaults.js`**
- `getEffectiveValue()` - Three-tier fallback logic for a single field
- `getEffectiveDefaults()` - Resolves all fields for a section
- `getNewSectionDefaults()` - Gets defaults for creating new sections
- Field mappings and helper functions

### 3. Documentation Files
**`DEFAULTS_SYSTEM_IMPLEMENTATION.md`** - Complete implementation guide
**`CALCULATION_UPDATE_EXAMPLE.md`** - How to update calculation logic
**`REDUX_ACTIONS_GUIDE.md`** - Redux actions for fetching/updating defaults
**`THREE_TIER_DEFAULTS_SUMMARY.md`** - This file (overview)

### 4. Reusable Component (Starter)
**`src/components/shared/DefaultsEditor.jsx`**
- Skeleton for reusable form component
- Can be used for team, estimate, and section levels
- Needs completion (see below)

## 🚀 Implementation Steps

### Step 1: Database Setup ✅ READY
1. Review migration file and update default IDs to match your database
2. Run the migration:
   ```bash
   psql -U your_user -d your_database -f migrations/add_defaults_to_teams_and_estimates.sql
   ```
3. Verify columns were added successfully
4. Set initial team defaults for existing teams

### Step 2: Redux Actions 📋 TODO
Follow `REDUX_ACTIONS_GUIDE.md` to:
1. Create/update team actions (`src/redux/actions/teams.js`)
2. Update estimate fetch actions to include defaults
3. Create `updateEstimateDefaults` action
4. Create `updateTeamDefaults` action
5. Add action types to `src/redux/actionTypes.js`
6. Update reducers

### Step 3: Update Calculations 📋 TODO
Follow `CALCULATION_UPDATE_EXAMPLE.md` to:
1. Import `getEffectiveDefaults` in calculation files
2. Pass `estimate` and `team` through context
3. Resolve effective values at start of calculations
4. Replace all direct section property access with effective values

Files to update:
- `src/utils/getSectionCalculations.js`
- `src/components/estimates/EstimateSectionPrice.jsx`
- Any other files using section data for calculations

### Step 4: Update EstimateSectionForm 📋 TODO
Update form initialization to use defaults for new sections:

```javascript
import { getNewSectionDefaults } from '../../utils/estimateDefaults';

const EstimateSectionForm = ({ section, ... }) => {
  const currentEstimate = useSelector(state => state.estimates.currentEstimate);
  const team = currentEstimate?.est_project?.team;
  
  const isNewSection = !section.est_section_id;
  const initialDefaults = isNewSection 
    ? getNewSectionDefaults(currentEstimate, team)
    : {};
  
  const [formData, setFormData] = useState({
    style: section.cabinet_style_id || initialDefaults.cabinet_style_id || "",
    // ... etc for all fields
  });
  
  // ... rest of form
};
```

### Step 5: Create UI Components 📋 TODO

#### A. Team Defaults Form (Admin Dashboard)
Location: `src/components/adminDashboard/TeamDefaultsSettings.jsx`
- Use `DefaultsEditor` component with `level="team"`
- All fields required
- Save via `updateTeamDefaults` action

#### B. Estimate Defaults Form
Location: `src/components/estimates/EstimateDefaultsModal.jsx`
- Triggered by "Edit Estimate Defaults" button
- Use `DefaultsEditor` component with `level="estimate"`
- Fields optional, show fallback indicators
- Save via `updateEstimateDefaults` action

#### C. Complete DefaultsEditor Component
The current `DefaultsEditor.jsx` is a skeleton. Complete it by:
1. Adding all form fields (copy from `EstimateSectionForm.jsx`)
2. Implementing multi-select for finishes
3. Adding finish requirement logic
4. Testing all three levels (team, estimate, section)

### Step 6: Update Fetch Logic 📋 TODO
Ensure all estimate fetches include team defaults:

```javascript
// Example: fetchEstimateById
.select(`
  *,
  default_cabinet_style_id,
  default_box_mat,
  // ... all default fields ...
  est_project:est_project_id(
    *,
    team:team_id(
      *,
      default_cabinet_style_id,
      default_box_mat,
      // ... all team default fields ...
    )
  )
`)
```

## 🏗️ Database Schema

### Teams Table (defaults NOT NULL)
```sql
default_cabinet_style_id bigint NOT NULL DEFAULT 1
default_box_mat bigint NOT NULL DEFAULT 1
default_face_mat bigint NOT NULL DEFAULT 1
default_drawer_box_mat bigint NOT NULL DEFAULT 1
default_hinge_id bigint NOT NULL DEFAULT 1
default_slide_id bigint NOT NULL DEFAULT 1
default_door_pull_id bigint NOT NULL DEFAULT 1
default_drawer_pull_id bigint NOT NULL DEFAULT 1
default_face_finish bigint[] NOT NULL DEFAULT '{}'
default_box_finish bigint[] NOT NULL DEFAULT '{}'
default_door_inside_molding boolean NOT NULL DEFAULT false
default_door_outside_molding boolean NOT NULL DEFAULT false
default_drawer_inside_molding boolean NOT NULL DEFAULT false
default_drawer_outside_molding boolean NOT NULL DEFAULT false
default_door_reeded_panel boolean NOT NULL DEFAULT false
default_drawer_reeded_panel boolean NOT NULL DEFAULT false
default_door_style text NOT NULL DEFAULT 'slab_hardwood'
default_drawer_front_style text NOT NULL DEFAULT 'slab_hardwood'
```

### Estimates Table (defaults NULLABLE)
```sql
default_cabinet_style_id bigint NULL
default_box_mat bigint NULL
-- ... same fields as teams, but all NULLABLE
```

### Sections Table (already exists)
All existing nullable fields:
```sql
cabinet_style_id bigint NOT NULL  -- Actually should be nullable
box_mat bigint NULL
face_mat bigint NULL
-- ... etc
```

**Note**: You may want to make `cabinet_style_id` nullable in sections to allow full fallback.

## 🔄 Data Flow

### Creating a New Section
1. User clicks "Add Section"
2. Form initializes with `getNewSectionDefaults(estimate, team)`
3. If estimate.default_box_mat is null, uses team.default_box_mat
4. User sees pre-filled form with defaults
5. User can override any field or leave as-is
6. On save, only changed fields are stored; unchanged remain null

### Calculating Prices
1. Component calls `getSectionCalculations(section, ...)`
2. Calculation resolves: `getEffectiveDefaults(section, estimate, team)`
3. All calculations use resolved values
4. If section.box_mat is null → uses estimate.default_box_mat
5. If estimate.default_box_mat is null → uses team.default_box_mat
6. Team default is never null (enforced by database)

### Updating Team Defaults
1. Admin opens team defaults form
2. Sees current team defaults (all required)
3. Changes values and saves
4. Updates propagate to:
   - New estimates (if not overridden at estimate level)
   - New sections (if not overridden at estimate or section level)
   - Existing calculations (via fallback chain)

## 🧪 Testing Checklist

- [ ] Migration runs successfully
- [ ] Team defaults are all NOT NULL
- [ ] Estimate defaults are all NULLABLE
- [ ] Can update team defaults via admin interface
- [ ] Can update estimate defaults via estimate interface
- [ ] New sections inherit estimate/team defaults
- [ ] Section form shows correct fallback indicators
- [ ] Calculations use fallback chain correctly
- [ ] Changing team defaults affects new sections
- [ ] Changing estimate defaults affects new sections in that estimate
- [ ] Section overrides take precedence
- [ ] Null values properly fall back (not false/empty values)
- [ ] Boolean fields don't incorrectly fall back when false
- [ ] Array fields don't fall back when empty array

## 🎨 UI Enhancements (Optional)

### Fallback Indicators
Show user where value comes from:
```jsx
<div className="flex items-center gap-2">
  <select value={effectiveValue}>...</select>
  {source !== 'section' && (
    <span className="text-xs text-blue-600">
      (using {source} default)
    </span>
  )}
</div>
```

### Color Coding
- 🟢 Green: Section override
- 🔵 Blue: Estimate default
- ⚪ Gray: Team default

### Reset Buttons
- "Reset to Estimate Default" on section form
- "Reset to Team Default" on estimate form
- "Reset All" to clear overrides

## 📝 Important Notes

1. **Boolean fields**: Be careful - `false` should NOT fall back to defaults
2. **Empty arrays**: `[]` should NOT fall back, only `null` should
3. **The utility handles this correctly** - uses strict null checks
4. **Team defaults are required** - Must be set before creating estimates
5. **Calculation performance** - Resolve defaults once per section, not per cabinet

## 🔧 Troubleshooting

### Issue: Calculations don't use defaults
**Solution**: Ensure `estimate` and `team` are passed through context and `getEffectiveDefaults` is called

### Issue: False values fall back to defaults
**Solution**: Use `getEffectiveValue` which checks for `null`/`undefined` specifically

### Issue: Migration fails with foreign key errors
**Solution**: Update DEFAULT values in migration to match valid IDs in your database

### Issue: New sections don't show defaults
**Solution**: Check that estimate is fetched with nested team data

## 📚 Next Steps

1. ✅ Review all documentation files
2. ⬜ Run database migration (after updating IDs)
3. ⬜ Implement Redux actions
4. ⬜ Update calculation logic
5. ⬜ Complete DefaultsEditor component
6. ⬜ Add team defaults form to admin dashboard
7. ⬜ Add estimate defaults button/modal
8. ⬜ Update EstimateSectionForm initialization
9. ⬜ Test complete flow
10. ⬜ (Optional) Remove old `estimates_default` JSONB column

## 🎉 Benefits

- ✅ Teams set defaults once, applied everywhere
- ✅ Estimates can override team defaults when needed
- ✅ Sections can override estimate defaults when needed
- ✅ Reduces data entry for similar estimates
- ✅ Maintains flexibility for unique cases
- ✅ Calculations automatically use appropriate defaults
- ✅ Clear hierarchy of precedence
- ✅ Database-enforced constraints prevent invalid states

---

**Ready to implement!** Start with Step 1 (database migration) and work through each step sequentially.
