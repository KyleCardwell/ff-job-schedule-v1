# Complete Service ID Refactor - Summary

## What Changed

Converted **all** labor hours calculations from hardcoded field names (`shopHours`, `finishHours`, `installHours`) to a unified **service ID-based system** using `hoursByService: { 2, 3, 4, ... }`.

## Service ID Mapping

| Service ID | Service Type | Description |
|------------|--------------|-------------|
| **2** | Shop | Fabrication/shop work |
| **3** | Finish | Finishing/sanding work |
| **4** | Install | Installation work |

## Files Modified

### 1. `estimateHelpers.js`
- ✅ `calculate5PieceDoorHours()` - Returns `{ hoursByService: { 2, 4, 3 } }`
- ✅ `calculateSlabDoorHours()` - Returns `{ hoursByService: { 2, 4, 3 } }`
- ✅ `calculateBoxPartsTime()` - Already used service IDs (unchanged)

### 2. `getSectionCalculations.js`
- ✅ `calculateFaceTotals()` - Aggregates by service ID, checks `serviceId === '3'` for finish multiplier
- ✅ `calculateFaceFramePrices()` - Uses service IDs `2` and `3`
- ✅ `calculateCabinetBoxHours()` - Maps `shopHours/finishHours/installHours` to service IDs `2/3/4`
- ✅ `calculateCabinetTotals()` - Merges all sources by service ID
- ✅ `getSectionCalculations()` - Returns `hoursByService`, applies +1 to service ID `4`

### 3. `EstimateSectionPrice.jsx`
- ✅ Removed `serviceTypeMap` 
- ✅ Direct service lookup: `services.find(s => s.service_id === parseInt(serviceId))`
- ✅ Dynamic display using service names from database

## Key Code Changes

### Door Hour Functions
```javascript
// BEFORE
return {
  shopHours: 2.5,
  finishHours: 1.0,
  installHours: 0.5
};

// AFTER
return {
  hoursByService: {
    2: 2.5,  // Shop
    3: 1.0,  // Finish
    4: 0.5   // Install
  }
};
```

### Aggregation Logic
```javascript
// BEFORE
totals.shopHours += hours.shopHours;
totals.finishHours += hours.finishHours;
totals.installHours += hours.installHours;

// AFTER
Object.entries(hours.hoursByService).forEach(([serviceId, hours]) => {
  if (!totals.hoursByService[serviceId]) {
    totals.hoursByService[serviceId] = 0;
  }
  totals.hoursByService[serviceId] += hours;
});
```

### Finish Multiplier Logic
```javascript
// BEFORE
if (serviceType === 'finish' && needsFinish) {
  multiplier = quantity * finishMultiplier;
}

// AFTER
if (serviceId === '3' && needsFinish) {
  multiplier = quantity * finishMultiplier;
}
```

### Install Setup Time
```javascript
// BEFORE
if (finalHoursByService.install > 0) {
  finalHoursByService.install += 1;
}

// AFTER
if (finalHoursByService[4] > 0) {
  finalHoursByService[4] += 1;
}
```

### Display Component
```javascript
// BEFORE
const serviceTypeMap = {
  shop: services.find(s => s.service_id === 2),
  finish: services.find(s => s.service_id === 3),
  install: services.find(s => s.service_id === 4)
};

Object.entries(hoursByService).forEach(([serviceType, hours]) => {
  const service = serviceTypeMap[serviceType];
  // ...
});

// AFTER
Object.entries(hoursByService).forEach(([serviceId, hours]) => {
  const service = services.find(s => s.service_id === parseInt(serviceId));
  if (service) {
    costsByService[serviceId] = {
      hours,
      rate: service.hourly_rate,
      cost: hours * service.hourly_rate,
      name: service.service_name  // Dynamic from database
    };
  }
});
```

## Data Structure

### Before
```javascript
sectionCalculations = {
  shopHours: 12.5,
  finishHours: 3.2,
  installHours: 4.1,
  // ... other fields
}
```

### After
```javascript
sectionCalculations = {
  hoursByService: {
    2: 12.5,  // Shop hours
    3: 3.2,   // Finish hours
    4: 4.1    // Install hours
  },
  // ... other fields
}
```

## Integration Points

### All Sources Now Use Service IDs
1. **Face hours** (5-piece & slab doors) → Service IDs 2, 3, 4
2. **Face frame hours** → Service IDs 2, 3
3. **Box hours** (old cabinet hours) → Maps to Service IDs 2, 3, 4
4. **Box parts hours** (new system) → Already used service IDs

### Perfect Merging
```javascript
const mergedHoursByService = {};

[boxHours, boxMinutes, faceTotals, faceFramePrices].forEach((source) => {
  if (source?.hoursByService) {
    Object.entries(source.hoursByService).forEach(([serviceId, hours]) => {
      if (!mergedHoursByService[serviceId]) {
        mergedHoursByService[serviceId] = 0;
      }
      mergedHoursByService[serviceId] += hours;
    });
  }
});
```

All sources speak the same language (service IDs), so merging is clean and simple.

## Benefits

### ✅ Unified System
- **One format** for all hour calculations
- No conversion between service types and service IDs
- `calculateBoxPartsTime` and traditional calculations now compatible

### ✅ Database-Driven
- Service names come from `services` table
- Teams can customize service names without code changes
- Service rates pulled dynamically

### ✅ Extensible
- Add new services by creating database records
- No code changes needed for new service types
- Display automatically shows any services with hours

### ✅ Cleaner Code
- Removed service type string constants
- No mapping layers between calculations and display
- Consistent pattern throughout codebase

### ✅ Type Safety
- Service IDs are numbers (converted to strings in object keys)
- Easy to validate and debug
- Clear mapping to database

## Testing

### Test Cases
- [ ] Face hours calculate correctly (5-piece doors)
- [ ] Face hours calculate correctly (slab doors)
- [ ] Face frame hours aggregate properly
- [ ] Box hours map from old fields to service IDs
- [ ] Box parts hours merge with other sources
- [ ] Finish multiplier applies only to service ID 3
- [ ] Install setup (+1 hour) applies to service ID 4
- [ ] Display shows service names from database
- [ ] Cost calculations use correct service rates
- [ ] Zero hours don't show in display
- [ ] Missing services handle gracefully

### Edge Cases
- Cabinet with no hours (all zeros)
- Service with 0 hourly rate
- Service not found in services array
- Missing hoursByService object

## Migration Guide

### For Developers

**Search and Replace:**
```
sectionCalculations.shopHours     → sectionCalculations.hoursByService[2]
sectionCalculations.finishHours   → sectionCalculations.hoursByService[3]
sectionCalculations.installHours  → sectionCalculations.hoursByService[4]
```

**No Backward Compatibility:**
Old field names are completely removed. Any code still using them will break immediately.

### For Database

**No Schema Changes Required:**
- Services already have `service_id` field
- No new tables or columns needed
- Existing data works as-is

## Future Possibilities

1. **Configurable Service Mapping**
   - Teams configure which service_id maps to "shop", "finish", "install"
   - Stored in team settings

2. **Additional Service Types**
   - Delivery (service_id: 5)
   - Design (service_id: 6)
   - etc.

3. **Service-Specific Logic**
   - Per-service multipliers
   - Per-service minimum charges
   - Service bundles

4. **Reporting**
   - Labor breakdown by service
   - Service efficiency metrics
   - Service profitability analysis

## Summary

This refactor creates a **unified, database-driven service hour system** that:
- Uses service IDs consistently everywhere
- Eliminates hardcoded service type strings
- Makes all hour calculations compatible and mergeable
- Enables dynamic service management through database
- Simplifies code and improves maintainability

The system is now **ready for the parts-based time calculation** integration and future service enhancements!
