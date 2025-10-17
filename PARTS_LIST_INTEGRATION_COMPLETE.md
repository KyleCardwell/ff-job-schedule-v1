# Parts List Integration - Complete ✅

## Summary
Successfully integrated the Parts List settings into the admin dashboard, following the same pattern as Cabinet Types settings.

## Changes Made

### 1. Constants (`/src/utils/constants.js`)
- ✅ Added `MANAGE_PARTS_LIST: "/manage/parts-list"` path constant

### 2. Admin Dashboard (`/src/components/adminDashboard/AdminDashboard.jsx`)
- ✅ Imported `PartsListSettings` component
- ✅ Added "Parts List" tab to navigation (between Cabinet Styles and Materials)
- ✅ Configuration:
  - ID: `parts-list`
  - Label: `Parts List`
  - Path: `/manage/parts-list`
  - Requires: Admin + `enable_estimates` feature toggle
  - Max width: `1200px` (wider layout for the table with style column)

### 3. Components Created
- ✅ `PartsListSettings.jsx` - Main container with save/cancel
- ✅ `PartsListAnchorsTable.jsx` - Table with style dropdown

## How to Use

1. **Navigate to Settings**: Go to `/manage/parts-list` (or click "Parts List" in the sidebar)

2. **View Parts**: Each part from the `parts_list` table gets its own section

3. **Add Anchors**: Click "Add Anchor" to create a new anchor for a part
   - Enter Width, Height, Depth
   - Select Cabinet Style (or leave as "Any Style")
   - Enter hours for each service

4. **Edit Anchors**: Click the edit icon to modify existing anchors

5. **Delete Anchors**: 
   - New anchors: Click X to remove immediately
   - Existing anchors: Click trash icon to mark for deletion (can undo)

6. **Save Changes**: Click "Save Changes" in the header to persist all modifications

## Key Features

### Style-Specific Anchors
- Each anchor can optionally be tied to a specific cabinet style
- Dropdown shows all active cabinet styles
- "Any Style" option (null value) makes anchor apply to all styles

### Validation
- Width, Height, and Depth are required fields
- Red borders indicate validation errors
- Save is blocked until all required fields are filled

### Data Structure
```javascript
{
  id: 123,
  parts_list_id: 5,
  cabinet_style_id: 14,  // or null for "Any Style"
  width: 24,
  height: 30,
  depth: 12,
  services: [
    { id: 456, team_service_id: 1, hours: 2.5 },
    { id: 457, team_service_id: 2, hours: 1.0 }
  ]
}
```

## Database Tables Used

1. **parts_list** (global, read-only in this interface)
   - All teams see all parts
   - Provides the list of parts to create anchors for

2. **team_parts_list_anchors** (team-specific)
   - Stores dimension anchors per team
   - Links to parts_list and optionally to cabinet_styles

3. **team_parts_list_anchor_services** (team-specific)
   - Stores service hours for each anchor
   - Links to team_services

## Redux Flow

1. **Fetch**: `fetchPartsList()`, `fetchTeamCabinetStyles()`, `fetchPartsListAnchors()`
2. **Save**: `savePartsListAnchors(newAnchors, updatedAnchors, deletedIds)`
3. **State**: 
   - `state.partsList.items` - All parts
   - `state.partsListAnchors.itemsByPartsList` - Anchors grouped by parts_list_id
   - `state.cabinetStyles.teamCabinetStyles` - For the style dropdown

## Testing Checklist

- [ ] Navigate to Parts List settings
- [ ] Verify all parts are displayed as sections
- [ ] Add a new anchor with "Any Style"
- [ ] Add a new anchor with a specific style
- [ ] Edit an existing anchor
- [ ] Mark an anchor for deletion and undo
- [ ] Save changes successfully
- [ ] Cancel changes and verify revert
- [ ] Verify validation errors for empty required fields
- [ ] Verify service hours are saved correctly

## Notes

- The parts list itself is managed elsewhere (database admin)
- This interface only manages the anchors (dimensions + hours) per part
- Cabinet style dropdown is optional - null means "Any Style"
- Wider layout (1200px) accommodates the additional style column
