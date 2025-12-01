# Hardware Services: Embedded Structure

## The Problem with Separate Array

**Original Structure:**
```javascript
state.hardware = {
  hinges: [{ id: 1, name: "Euro Hinge", price: 2.50 }],
  pulls: [...],
  slides: [...],
  hardwareServices: [
    { hardware_hinges_id: 1, team_service_id: 5, time_per_unit: 0.05 },
    { hardware_hinges_id: 1, team_service_id: 6, time_per_unit: 0.02 }
  ]
}
```

**Problems:**
- ❌ **Inefficient lookups** - Need to filter `hardwareServices` array every time
- ❌ **Complex pricing calculations** - Must match IDs across arrays
- ❌ **Harder to maintain** - Related data scattered across state
- ❌ **More code** - Extra filtering/matching logic everywhere

**Example of inefficient lookup:**
```javascript
// Every time you need services for a hinge:
const hingeServices = hardwareServices.filter(
  hs => hs.hardware_hinges_id === hinge.id
);
const totalTime = hingeServices.reduce((sum, s) => sum + s.time_per_unit, 0);
```

## The Solution: Embedded Services

**New Structure:**
```javascript
state.hardware = {
  hinges: [{
    id: 1,
    name: "Euro Hinge",
    price: 2.50,
    actual_cost: 1.20,
    services: [
      { 
        id: 101,
        team_service_id: 5,
        service_id: 1,
        service_name: "Installation",
        time_per_unit: 0.05
      },
      {
        id: 102,
        team_service_id: 6,
        service_id: 2,
        service_name: "Finishing",
        time_per_unit: 0.02
      }
    ]
  }],
  pulls: [...],
  slides: [...]
}
```

**Benefits:**
- ✅ **Direct access** - Services right on the hardware object
- ✅ **Simple pricing** - `hinge.services.reduce((sum, s) => sum + s.time_per_unit, 0)`
- ✅ **Better organization** - All related data together
- ✅ **Less code** - No filtering needed

**Example of efficient lookup:**
```javascript
// Direct access - no filtering!
const totalTime = hinge.services.reduce((sum, s) => sum + s.time_per_unit, 0);
```

## Implementation Changes

### 1. Redux Actions (hardware.js)

**fetchHinges/Pulls/Slides now include services:**
```javascript
export const fetchHinges = () => async (dispatch, getState) => {
  const { data, error } = await supabase
    .from("hardware_hinges")
    .select(`
      id,
      name,
      actual_cost,
      price,
      hardware_services!hardware_hinges_id(
        id,
        team_service_id,
        time_per_unit,
        team_services(
          service_id,
          services(name)
        )
      )
    `)
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  // Transform to flatten services array
  const hingesWithServices = (data || []).map(hinge => ({
    ...hinge,
    services: (hinge.hardware_services || []).map(hs => ({
      id: hs.id,
      team_service_id: hs.team_service_id,
      service_id: hs.team_services?.service_id,
      service_name: hs.team_services?.services?.name,
      time_per_unit: hs.time_per_unit
    })),
    hardware_services: undefined // Remove nested structure
  }));

  dispatch(fetchHingesSuccess(hingesWithServices));
};
```

**Key points:**
- Uses Supabase's relationship syntax `hardware_services!hardware_hinges_id`
- Joins through `team_services` to get service details
- Flattens the nested structure into clean `services` array
- Each service has all needed info: IDs, name, and time

### 2. Redux Reducer (hardware.js)

**Removed separate hardwareServices state:**
```javascript
const initialState = {
  hinges: [], // Each item has embedded services array
  pulls: [],  // Each item has embedded services array
  slides: [], // Each item has embedded services array
  loading: false,
  error: null,
};

// Removed these cases:
// - FETCH_HARDWARE_SERVICES_SUCCESS
// - SAVE_HARDWARE_SERVICES_START/SUCCESS/ERROR
```

Services are now part of each hardware item, so no separate state needed!

### 3. HardwareSettings Component

**Updated to build map from embedded services:**
```javascript
// Build hardware services map from embedded services
useEffect(() => {
  const map = {};
  
  // Process hinges
  hinges.forEach((hinge) => {
    (hinge.services || []).forEach((service) => {
      const key = `hinge-${hinge.id}-${service.service_id}`;
      map[key] = service.time_per_unit;
    });
  });
  
  // Process pulls
  pulls.forEach((pull) => {
    (pull.services || []).forEach((service) => {
      const key = `pull-${pull.id}-${service.service_id}`;
      map[key] = service.time_per_unit;
    });
  });
  
  // Process slides
  slides.forEach((slide) => {
    (slide.services || []).forEach((service) => {
      const key = `slide-${slide.id}-${service.service_id}`;
      map[key] = service.time_per_unit;
    });
  });
  
  setHardwareServicesMap(map);
}, [hinges, pulls, slides]);
```

**Removed:**
- `fetchHardwareServices()` dispatch
- Separate `hardwareServices` from useSelector
- `hardwareServices` dependency from useEffect

## Usage in Pricing Calculations

### Before (Inefficient):
```javascript
// In your pricing component
const calculateHardwareCost = (cabinetHardware) => {
  const { hinges, pulls, slides } = cabinetHardware;
  
  let totalTime = 0;
  
  // For each hinge, find its services
  hinges.forEach(hinge => {
    const hingeItem = allHinges.find(h => h.id === hinge.hardware_id);
    const hingeServices = hardwareServices.filter(
      hs => hs.hardware_hinges_id === hinge.hardware_id
    );
    
    hingeServices.forEach(service => {
      totalTime += service.time_per_unit * hinge.quantity;
    });
  });
  
  // Repeat for pulls and slides...
  
  return totalTime;
};
```

### After (Efficient):
```javascript
// In your pricing component
const calculateHardwareCost = (cabinetHardware) => {
  const { hinges, pulls, slides } = cabinetHardware;
  
  let totalTime = 0;
  
  // Direct access to services!
  hinges.forEach(hinge => {
    const hingeItem = allHinges.find(h => h.id === hinge.hardware_id);
    
    // Services are right there!
    (hingeItem.services || []).forEach(service => {
      totalTime += service.time_per_unit * hinge.quantity;
    });
  });
  
  // Same simple pattern for pulls and slides...
  
  return totalTime;
};
```

**Improvements:**
- ✅ No filtering needed
- ✅ Fewer lookups
- ✅ Clearer code
- ✅ Better performance

## Database Query Efficiency

**Single Query Gets Everything:**
```sql
-- One query fetches hardware with all services
SELECT 
  h.id,
  h.name,
  h.price,
  h.actual_cost,
  hs.id as service_id,
  hs.time_per_unit,
  ts.service_id,
  s.name as service_name
FROM hardware_hinges h
LEFT JOIN hardware_services hs ON hs.hardware_hinges_id = h.id
LEFT JOIN team_services ts ON hs.team_service_id = ts.id
LEFT JOIN services s ON ts.service_id = s.id
WHERE h.team_id = ?
```

Supabase handles this with the relationship syntax, and we get a clean nested structure that we flatten into our desired format.

## Migration Notes

**No Database Changes Needed!**

This is purely a Redux/React restructuring. The database schema remains the same:
- `hardware_services` table with foreign keys
- Proper relationships between tables
- Same RLS policies

We're just changing how we fetch and store the data in the frontend.

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **State Structure** | Separate arrays | Embedded services |
| **Lookups** | Filter + match IDs | Direct access |
| **Code Complexity** | Higher | Lower |
| **Performance** | O(n) filtering | O(1) access |
| **Maintainability** | Scattered data | Cohesive data |
| **Pricing Calc** | Complex | Simple |

**Result:** Cleaner code, better performance, easier maintenance, and simpler pricing calculations!
