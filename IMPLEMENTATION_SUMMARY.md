# Cabinet Item Types Implementation Summary

## Overview
Implemented a configuration-driven system to support multiple cabinet item types (cabinets, door fronts, drawer fronts, fillers, end panels, drawer boxes, and rollouts) with type-specific behavior and features.

## Architecture

### 1. Configuration System (`src/config/cabinetItemTypes.js`)

Created a centralized configuration object that defines behavior for each item type:

- **`CABINET_ITEM_TYPES`**: Configuration object with 7 item types
  - `cabinet`: Full cabinet with all features
  - `door_front`: Door fronts with mid-stiles/rails (no reveals)
  - `drawer_front`: Drawer fronts with optional drawer box
  - `filler`: Non-divisible filler panels
  - `end_panel`: End panels with conditional reveals (based on style)
  - `drawer_box`: Drawer boxes only (no face division)
  - `rollout`: Rollouts with automatic scoop

**Configuration Properties:**
- `label`: Display name
- `faceTypesArray`: Available face types (references constants)
- `usesReveals`: Boolean or function to determine if reveals are used
- `usesRootReveals`: Boolean or function for root reveals
- `allowsSplitting`: Whether the item can be divided
- `requiresStyleReveals`: Whether style is needed for reveal logic
- `isDivisible`: Whether item can be split into parts
- `features`: Object defining available form fields (finished sides, etc.)

**Helper Functions:**
- `getItemTypeConfig(itemType)`: Get configuration for a type
- `shouldUseReveals(itemType, styleId)`: Check reveal usage (handles conditional logic)
- `shouldUseRootReveals(itemType, styleId)`: Check root reveal usage
- `getAvailableFaceTypes(itemType)`: Get face types for an item
- `hasFeature(itemType, featureName)`: Check if feature is available
- `getItemTypeOptions()`: Get options for dropdown selection

### 2. Constants Updates (`src/utils/constants.js`)

Added new face types and type-specific arrays:

**New Face Names:**
- `MID_STILE`: For dividing door/drawer fronts horizontally
- `MID_RAIL`: For dividing door/drawer fronts vertically

**Face Type Arrays:**
- `FACE_TYPES`: Default for standard cabinets (all types)
- `PANEL_FACE_TYPES`: For door/drawer fronts (panel, mid-stile, mid-rail)
- `END_PANEL_FACE_TYPES`: For end panels (includes reveals)
- `FILLER_FACE_TYPES`: For fillers (panel only)

### 3. CabinetFaceDivider Refactoring

Made the component type-aware and configuration-driven:

**New Props:**
- `itemType`: Determines component behavior based on configuration

**Dynamic Behavior:**
- Face types filtered based on `itemConfig.faceTypesArray`
- Split buttons only shown if `itemConfig.allowsSplitting`
- Dividers use reveals OR mid-stiles/mid-rails based on `usesReveals`
- Root reveals conditionally rendered based on `usesRootReveals`

**Split Logic:**
- **Horizontal splits**: Use `REVEAL` or `MID_STILE` based on item type
- **Vertical splits**: Use `REVEAL` or `MID_RAIL` based on item type
- Default child type: `DOOR` for cabinets, `PANEL` for door/drawer fronts

### 4. EstimateCabinetManager Integration

**Form Enhancements:**
- Added `item_type` field to formData
- Added Item Type selector with descriptions
- Item type config state (`itemTypeConfig`) updates dynamically
- Conditional rendering of finished fields based on `itemTypeConfig.features`
- Passes `itemType` prop to CabinetFaceDivider

**Field Visibility:**
- `finishedInterior`: Only for cabinets
- `finishedTop/Bottom/Left/Right`: Conditional based on features
- Future: Cabinet Type field should be conditional (only for full cabinets)

## Database Considerations

**Current Approach:**
- Use single `estimate_cabinets` table with `item_type` field
- `face_config` JSON adapts to each type
- All items share core fields: `id`, `width`, `height`, `depth`, `description`

**Benefits:**
- Simpler querying and joins
- Maintains existing infrastructure
- Flexible JSON structure accommodates different data needs

## Next Steps

### Immediate (Required for functionality):
1. ✅ Fix JSX structure in EstimateCabinetManager (finished fields conditional rendering)
2. Add `item_type` column to `estimate_cabinets` database table
3. Update Redux actions to include `item_type` in save/update operations
4. Test basic item type selection and face divider behavior

### Short-term:
5. Conditionally show/hide Cabinet Type dropdown (only for full cabinets)
6. Add drawer box fields for `drawer_front` type
7. Add side/finished side fields for `filler` type
8. Update `getSectionCalculations.js` with type-specific calculation modules
9. Create calculation functions for each item type:
   - `calculateCabinetParts()` - existing logic
   - `calculateDoorFrontParts()` - face-only calculations
   - `calculateFillerParts()` - simple panel calculations
   - etc.

### Medium-term:
10. Update error state detection to work with new item types
11. Add validation specific to each item type
12. Update pricing calculations to handle different types
13. Add type-specific help text and documentation
14. Create migration script for existing data

### Long-term:
15. Add more item types as needed
16. Create admin interface for managing item type configurations
17. Add customizable features per team/organization
18. Performance optimization for large estimates

## Usage Example

```javascript
// In EstimateCabinetManager
<CabinetFaceDivider
  itemType={formData.item_type}  // 'cabinet', 'door_front', etc.
  cabinetWidth={formData.width}
  cabinetHeight={formData.height}
  // ... other props
/>

// Component automatically:
// - Shows appropriate face types
// - Uses reveals or mid-stiles/rails
// - Enables/disables splitting
// - Renders correct visual elements
```

## Benefits of This Approach

1. **Single Component**: No code duplication
2. **Configuration-Driven**: Easy to add new types
3. **Maintainable**: Common logic in one place
4. **Type-Safe**: Clear contracts per type
5. **Backwards Compatible**: Existing cabinets still work
6. **Flexible**: Conditional logic support (end panels)
7. **Testable**: Each type's config isolated

## Technical Debt / Known Issues

1. **JSX Structure Error**: Conditional finished fields need proper closing tags (line 1277 in EstimateCabinetManager)
2. **Database Migration**: Need to add `item_type` column to existing table
3. **Calculation Logic**: `getSectionCalculations.js` still uses hardcoded cabinet logic
4. **Form Validation**: Not yet type-specific
5. **Error States**: May not work correctly for new item types
6. **Testing**: No automated tests for new functionality

## Files Modified

- ✅ `/src/config/cabinetItemTypes.js` - NEW
- ✅ `/src/utils/constants.js` - Updated with new face types
- ✅ `/src/components/estimates/CabinetFaceDivider.jsx` - Made type-aware
- ✅ `/src/components/estimates/EstimateCabinetManager.jsx` - Added item type selection
- ⏳ `/src/utils/getSectionCalculations.js` - TODO: Refactor for types
- ⏳ `/src/redux/actions/estimates.js` - TODO: Include item_type in operations

## Migration Strategy

1. Add `item_type` column to database (default 'cabinet')
2. Test with new items first
3. Gradually migrate existing items if needed
4. Update calculation logic incrementally
5. Monitor for performance issues

---

**Status**: Core architecture complete, needs bug fixes and testing
**Last Updated**: 2025-01-18
