# Parts List Implementation Summary

## Overview
Created a complete Redux flow for managing parts list and parts list anchors, mirroring the cabinet anchors implementation.

## Files Created

### Action Types
1. **`/src/redux/actionTypes/partsList.js`**
   - `FETCH_PARTS_LIST_START`
   - `FETCH_PARTS_LIST_SUCCESS`
   - `FETCH_PARTS_LIST_ERROR`

2. **`/src/redux/actionTypes/partsListAnchors.js`**
   - `FETCH_PARTS_LIST_ANCHORS_START`
   - `FETCH_PARTS_LIST_ANCHORS_SUCCESS`
   - `FETCH_PARTS_LIST_ANCHORS_ERROR`
   - `UPDATE_PARTS_LIST_ANCHOR_START`
   - `UPDATE_PARTS_LIST_ANCHOR_ERROR`

### Actions
3. **`/src/redux/actions/partsList.js`**
   - `fetchPartsList()` - Fetches all parts from `parts_list` table (not team-specific)

4. **`/src/redux/actions/partsListAnchors.js`**
   - `fetchPartsListAnchors()` - Fetches team-specific anchors using RPC
   - `savePartsListAnchors(newAnchors, updatedAnchors, deletedIds)` - Batch save operation

### Reducers
5. **`/src/redux/reducers/partsList.js`**
   - State: `{ items: [], loading: false, error: null }`
   - Stores all parts list items

6. **`/src/redux/reducers/partsListAnchors.js`**
   - State: `{ itemsByPartsList: {}, loading: false, error: null }`
   - Stores anchors grouped by parts_list_id

### Root Reducer
7. **Updated `/src/redux/reducers/rootReducer.js`**
   - Added `partsList: partsListReducer`
   - Added `partsListAnchors: partsListAnchorsReducer`

## Required Database RPC Functions

✅ **All RPC functions have been created!**

You have successfully created:
1. ✅ `get_team_parts_list_anchors` - Fetches team-specific anchors
2. ✅ `create_parts_list_anchor_with_services` - Creates anchor with services
3. ✅ `update_parts_list_anchor_with_services` - Updates anchor and services

### Key Implementation Details

**create_parts_list_anchor_with_services:**
- Parameter order: `p_team_id, p_width, p_height, p_depth, p_cabinet_style_id, p_parts_list_id, p_services`
- `p_cabinet_style_id` is nullable (pass NULL for style-agnostic anchors)
- Returns jsonb with anchor and services data
- Inserts anchor and related services in one transaction

**update_parts_list_anchor_with_services:**
- Parameter order: `p_anchor_id, p_team_id, p_width, p_height, p_depth, p_cabinet_style_id, p_services`
- `p_cabinet_style_id` is nullable
- Returns void
- Updates existing services (when id provided) and inserts new ones (when id is NULL)
- Does NOT delete all services - only updates/inserts as needed

## Usage Examples

### Fetching Parts List (All Teams)
```javascript
import { fetchPartsList } from './redux/actions/partsList';

// In your component
useEffect(() => {
  dispatch(fetchPartsList());
}, [dispatch]);

// Access from Redux state
const partsList = useSelector(state => state.partsList.items);
```

### Fetching Parts List Anchors (Team-Specific)
```javascript
import { fetchPartsListAnchors } from './redux/actions/partsListAnchors';

// In your component
useEffect(() => {
  dispatch(fetchPartsListAnchors());
}, [dispatch]);

// Access from Redux state
const anchors = useSelector(state => state.partsListAnchors.itemsByPartsList);
// anchors is an object: { "1": [...], "2": [...] }
// where keys are parts_list_id and values are arrays of anchors
```

### Saving Parts List Anchors
```javascript
import { savePartsListAnchors } from './redux/actions/partsListAnchors';

const handleSave = async () => {
  const newAnchors = [
    {
      parts_list_id: 1,
      cabinet_style_id: 5,
      width: 24,
      height: 30,
      depth: 12,
      services: [
        { team_service_id: 1, hours: 2.5 },
        { team_service_id: 2, hours: 1.0 }
      ]
    }
  ];

  const updatedAnchors = [
    {
      id: 123,
      parts_list_id: 1,
      cabinet_style_id: 5,
      width: 26,
      height: 32,
      depth: 12,
      services: [
        { id: 456, team_service_id: 1, hours: 3.0 }
      ]
    }
  ];

  const deletedIds = [789];

  await dispatch(savePartsListAnchors(newAnchors, updatedAnchors, deletedIds));
};
```

## Key Differences from Cabinet Anchors

1. **Parts List is Global**: The `parts_list` table is not team-specific. All teams see all parts.
2. **Anchors are Team-Specific**: The `team_parts_list_anchors` table is team-specific, just like cabinet anchors.
3. **Optional Cabinet Style**: Parts list anchors have an optional `cabinet_style_id` field (nullable).
4. **State Key Names**: 
   - Cabinet anchors use `itemsByType` (grouped by cabinet_type_id)
   - Parts list anchors use `itemsByPartsList` (grouped by parts_list_id)

## Next Steps

1. ✅ Redux structure created
2. ✅ RPC functions created in database
3. ✅ Redux actions updated to match RPC signatures
4. ⏳ Create UI components similar to `CabinetAnchorsTable` for parts list anchors
5. ⏳ Test the complete flow
