# Hours by Service Refactor - Complete

## Overview
Refactored the entire labor hours system from hardcoded `shopHours`, `finishHours`, and `installHours` to a flexible `hoursByService` object keyed by **service ID**. All calculations now use service IDs (2=shop, 3=finish, 4=install) consistently throughout the codebase.

## Changes Made

### 1. **estimateHelpers.js**

#### `calculate5PieceDoorHours()`
**Before:**
```javascript
return {
  shopHours: ...,
  installHours: ...,
  finishHours: ...
};
```

**After:**
```javascript
return {
  hoursByService: {
    2: ..., // Shop
    4: ..., // Install
    3: ...  // Finish
  }
};
```

#### `calculateSlabDoorHours()`
Same pattern - returns `{ hoursByService: { 2, 4, 3 } }` with service IDs

### 2. **getSectionCalculations.js**

#### `calculateFaceTotals()`
- Changed from tracking `shopHours`, `finishHours`, `installHours` separately
- Now uses `hoursByService: {}` object keyed by service ID
- Aggregation logic updated to loop through service IDs:
```javascript
Object.entries(faceHours.hoursByService).forEach(([serviceId, hours]) => {
  if (!totals.hoursByService[serviceId]) {
    totals.hoursByService[serviceId] = 0;
  }
  // Apply finish multiplier for service ID 3 (finish) if material needs finish
  const multiplier = (serviceId === '3' && needsFinish) 
    ? quantity * finishMultiplier 
    : quantity;
  totals.hoursByService[serviceId] += (hours || 0) * multiplier;
});
```

#### `calculateFaceFramePrices()`
- Returns `{ hoursByService: { 2, 3 }, woodTotal, boardFeet }`
- Service ID 2 (shop) hours aggregated for frame pieces
- Service ID 3 (finish) hours aggregated for tape time

#### `calculateCabinetBoxHours()`
- Returns `{ hoursByService: { 2, 3, 4 } }`
- Maps old `shopHours`, `finishHours`, `installHours` fields to service IDs:
  ```javascript
  const serviceMap = [
    { id: 2, field: 'shopHours' },
    { id: 4, field: 'installHours' },
    { id: 3, field: 'finishHours' },
  ];
  ```
- Applies finish multiplier only for service ID 3 when material needs finish

#### `calculateCabinetTotals()`
- Merges `hoursByService` from all sources:
  - `boxHours`
  - `boxMinutes` (from calculateBoxPartsTime)
  - `faceTotals`
  - `faceFramePrices`
- Returns single `hoursByService` object with all hours aggregated

#### `getSectionCalculations()` (main export)
- Returns `hoursByService` instead of separate hour fields
- Applies +1 hour to service ID 4 (install) for setup/cleanup if any install work exists
- Default return includes `hoursByService: {}`

### 3. **EstimateSectionPrice.jsx**

#### Labor Cost Calculation
**Before:**
```javascript
const shopCost = sectionCalculations.shopHours * shopRate;
const finishCost = sectionCalculations.finishHours * finishRate;
const installCost = sectionCalculations.installHours * installRate;
```

**After:**
```javascript
Object.entries(hoursByService).forEach(([serviceId, hours]) => {
  const service = services.find((s) => s.service_id === parseInt(serviceId));
  if (service) {
    const cost = hours * (service.hourly_rate || 0);
    costsByService[serviceId] = {
      hours,
      rate: service.hourly_rate || 0,
      cost,
      name: service.service_name, // For display
    };
    totalLaborCost += cost;
  }
});
```

#### Display
**Before:** Hardcoded divs for Shop, Finish, Install

**After:** Dynamic mapping over services by service ID:
```javascript
{Object.entries(laborCosts.costsByService).map(
  ([serviceId, data]) => (
    <div key={serviceId} className="grid ...">
      <span>{data.name}:</span>  {/* From service.service_name */}
      <span>{formatHours(data.hours)}</span>
      <span>{formatCurrency(data.cost)}</span>
    </div>
  )
)}
```

## Service ID Structure

All calculations use numeric service IDs:
- **2** - Shop fabrication work
- **3** - Finishing/sanding work  
- **4** - Installation work

Service details (name, rate) are looked up from Redux `state.services.allServices` array by matching `service_id`.

Benefits:
- Consistent IDs across entire system
- Works seamlessly with `calculateBoxPartsTime` which uses actual service IDs
- Service names can be customized per team in database
- Easy to add new services without code changes

## Data Flow

```
Helper Functions (calculate5PieceDoorHours, calculateSlabDoorHours)
  ↓ Returns: { hoursByService: { 2, 3, 4 } }
  
Section Aggregators (calculateFaceTotals, calculateFaceFramePrices, calculateCabinetBoxHours)
  ↓ Aggregates by service ID
  ↓ Returns: { hoursByService: { 2, 3, 4 } }
  
calculateCabinetTotals
  ↓ Merges all hoursByService objects
  ↓ Returns: { hoursByService: { 2, 3, 4 }, ... }
  
getSectionCalculations (main export)
  ↓ Applies +1 hour to service ID 4 (install) if needed
  ↓ Returns: { hoursByService: { 2, 3, 4 }, ... }
  
EstimateSectionPrice.jsx
  ↓ Looks up services by ID from Redux state
  ↓ Calculates costs and displays dynamically with service names
```

## Benefits

### ✅ Flexibility
- Easy to add new service types without code changes
- Service names pulled from database

### ✅ Maintainability
- Single pattern throughout codebase using service IDs
- Consistent with `calculateBoxPartsTime` which already uses service IDs

### ✅ Extensibility
- New services automatically work (just add to database)
- Per-team service customization possible
- No code changes needed for new service types

### ✅ Cleaner Code
- Removed repetitive shop/finish/install logic
- DRY principle applied throughout
- No service type string constants needed

### ✅ Dynamic Display
- Services shown based on actual hours calculated
- Service names dynamically pulled from database
- Works with any service_id values

## Testing Checklist

- [ ] Test face hour calculations (5-piece and slab doors)
- [ ] Test box hour calculations
- [ ] Test face frame hour calculations
- [ ] Test finish multiplier application
- [ ] Test install +1 hour setup/cleanup
- [ ] Test display with 0 hours for a service type
- [ ] Test display with no hours at all
- [ ] Test with different service names
- [ ] Test aggregation across multiple cabinets

## Migration Notes

**No Backward Compatibility:**
- Completely removed `shopHours`, `finishHours`, `installHours` from all calculations
- All code now uses `hoursByService` with service IDs
- Old code reading `sectionCalculations.shopHours` will get `undefined`
- Update any remaining code to use `sectionCalculations.hoursByService[2]` for shop hours

**Unified Service ID Approach:**
- `calculateBoxPartsTime` returns `{ hoursByService: {serviceId: hours} }` with service IDs
- Face/frame calculations now also return service IDs (2, 3, 4)
- All sources use the same ID system - perfect integration in `calculateCabinetTotals`
- No conversion or mapping needed between different calculation sources

## Future Enhancements

1. **Dynamic Service IDs**
   - Currently hardcoded: 2=shop, 3=finish, 4=install
   - Could allow teams to configure which service IDs map to which calculation types
   - Store mapping in team settings or service metadata

2. **Additional Services**
   - Easily add new service types (delivery, design, etc.)
   - Just add to services table with unique service_id
   - Calculations will automatically include them

3. **Per-Item Service Tracking**
   - Track which services apply to which item types
   - Conditional service requirements based on materials or complexity
   - Service bundles or packages

4. **Service-Specific Multipliers**
   - Different multipliers per service type
   - Complexity-based adjustments
   - Rush order multipliers per service
