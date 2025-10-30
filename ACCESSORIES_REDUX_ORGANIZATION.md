# Accessories Redux Organization

## Overview
The accessories Redux state is now organized by type for better performance and easier access throughout the app.

## Redux State Structure

```javascript
state.accessories = {
  // Organized by type (pre-filtered for performance)
  glass: [...],          // All glass accessories
  insert: [...],         // All insert accessories
  hardware: [...],       // All hardware accessories
  rod: [...],            // All rod accessories
  organizer: [...],      // All organizer accessories
  other: [...],          // All other accessories
  
  // Full catalog (for reference and saving)
  catalog: [...],        // All accessories (flat array)
  
  // Time anchors
  timeAnchors: [...],
  
  // Loading states
  loading: false,
  error: null
}
```

## Usage Examples

### 1. Access Specific Type Directly

```javascript
// Get all glass accessories
const glassItems = useSelector(state => state.accessories.glass);

// Get all hardware
const hardwareItems = useSelector(state => state.accessories.hardware);
```

### 2. Filter by Context (applies_to)

```javascript
// Get glass that applies to doors
const doorGlass = useSelector(state => 
  state.accessories.glass.filter(item => 
    item.applies_to.includes('door')
  )
);

// Get hardware for cabinets
const cabinetHardware = useSelector(state =>
  state.accessories.hardware.filter(item =>
    item.applies_to.includes('cabinet')
  )
);
```

### 3. Use in Components

```javascript
// Example: Glass selector for doors
const GlassSelector = ({ onSelect }) => {
  const glassOptions = useSelector(state =>
    state.accessories.glass.filter(item =>
      item.applies_to.includes('door') || item.applies_to.includes('opening')
    )
  );

  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      <option value="">Select glass...</option>
      {glassOptions.map(glass => (
        <option key={glass.id} value={glass.id}>
          {glass.name} - ${glass.default_price_per_unit}/{getUnitLabel(glass.calculation_type)}
        </option>
      ))}
    </select>
  );
};
```

### 4. Full Catalog Access

```javascript
// When you need ALL accessories (e.g., for saving)
const allAccessories = useSelector(state => state.accessories.catalog);

// Or use filterAccessoriesByContext helper
import { filterAccessoriesByContext } from '../../utils/accessoryCalculations';

const standaloneAccessories = filterAccessoriesByContext(
  allAccessories,
  'standalone'
);
```

## Benefits

### Performance
- ✅ **No repeated filtering**: Each type is filtered once in Redux, not on every render
- ✅ **Memoized selectors**: Redux state is memoized, preventing unnecessary re-renders
- ✅ **Smaller arrays**: Components only access the type they need

### Developer Experience
- ✅ **Clear intent**: `state.accessories.glass` is more readable than filtering
- ✅ **Type safety**: Easy to see what types are available
- ✅ **Discoverability**: IDE autocomplete shows all available types

### Scalability
- ✅ **Multiple components**: Many components can access `glass` without re-filtering
- ✅ **Easy to extend**: Add new types by updating the reducer
- ✅ **Consistent**: Single source of truth in Redux

## Implementation Details

### Reducer Organization
The `organizeCatalogByType` helper function groups items:

```javascript
const organizeCatalogByType = (catalog) => {
  const organized = {
    glass: [],
    insert: [],
    hardware: [],
    rod: [],
    organizer: [],
    other: [],
  };

  catalog.forEach((item) => {
    const type = item.type || "other";
    if (organized[type]) {
      organized[type].push(item);
    } else {
      organized.other.push(item);
    }
  });

  return organized;
};
```

### When Data Updates
Organization happens automatically when:
- Initial fetch: `FETCH_ACCESSORIES_CATALOG_SUCCESS`
- After save: Data is re-fetched and re-organized

### Database
- Database remains normalized (single `accessories_catalog` table)
- Organization happens in Redux, not in database queries
- Saves still use flat array structure

## Migration Notes

### Before (Filtering in Components)
```javascript
const glassItems = catalog.filter(item => item.type === 'glass');
```

### After (Direct Access)
```javascript
const glassItems = useSelector(state => state.accessories.glass);
```

### Backward Compatibility
- `catalog` still exists for components that need all accessories
- Existing code using `catalog` continues to work
- Gradually migrate to type-specific access for better performance
