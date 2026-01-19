# Type-Specific Cabinet Options Guide

## Overview

The type-specific options system allows different cabinet types to have their own unique configuration options beyond the standard fields. This is implemented using:

1. **Configuration-driven metadata** in `cabinetItemTypes.js` that defines available options per type
2. **Dynamic rendering** in the form that automatically displays the correct inputs
3. **JSONB storage** in the database that stores the actual values

## Architecture

### 1. Configuration in cabinetItemTypes.js

Each cabinet type can define its own `typeSpecificOptions` array with metadata about each option:

```javascript
hood: {
  label: 'Hood',
  // ... other config
  typeSpecificOptions: [
    {
      name: 'tapered',              // Field name in database JSON
      type: 'checkbox',             // Input type
      label: 'Tapered Hood',        // Display label
      defaultValue: false,          // Default value
      description: 'Hood narrows from bottom to top', // Tooltip
      serviceMultipliers: {         // Optional: multiply service hours
        2: 1.5,                     // service_id 2 (shop) = 1.5x time
      },
    },
  ],
}
```

### 2. Dynamic Rendering

The form automatically renders inputs based on the configuration - **no hardcoded UI needed**. The renderer supports:
- `checkbox` - Boolean options
- `number` - Numeric inputs with min/max/step
- `select` - Dropdown selections
- `text` - Text inputs

### 3. Database Storage

```sql
-- estimate_cabinets table
type_specific_options JSONB NULL DEFAULT '{}'::jsonb
```

Stores the actual values as JSON:

```json
// Hood cabinet with tapered option
{
  "tapered": true
}

// Corner cabinet (future example)
{
  "lazy_susan": true,
  "susan_diameter": 24
}
```

## How It Works

### 1. Form State Management

The form automatically manages `type_specific_options` in state:

```javascript
const [formData, setFormData] = useState({
  // ... other fields
  type_specific_options: item.type_specific_options || {},
});
```

### 2. Change Handler

A generic handler updates any type-specific option:

```javascript
const handleTypeSpecificOptionChange = (optionName, value) => {
  setFormData((prev) => ({
    ...prev,
    type_specific_options: {
      ...prev.type_specific_options,
      [optionName]: value,
    },
  }));
};
```

### 3. Dynamic Rendering

The form automatically renders inputs based on `itemTypeConfig.typeSpecificOptions`:

```javascript
{itemTypeConfig.typeSpecificOptions?.map((option) => {
  const optionValue = formData.type_specific_options?.[option.name] ?? option.defaultValue;
  
  if (option.type === "checkbox") {
    return <input type="checkbox" ... />;
  } else if (option.type === "number") {
    return <input type="number" ... />;
  }
  // etc.
})}
```

### 4. Auto-Clearing

Options are automatically cleared when cabinet type changes:

```javascript
if (name === "type" && numValue) {
  updates.type_specific_options = {}; // Cleared automatically
}
```

### 5. Saving

Options are included in the saved data:

```javascript
finalFormData.type_specific_options = formData.type_specific_options || {};
```

## Adding New Type-Specific Options

**It's incredibly simple - just add configuration!** No UI code needed.

### Step 1: Add Option to cabinetItemTypes.js

Find the item type in `src/config/cabinetItemTypes.js` and add to its `typeSpecificOptions` array:

```javascript
cabinet: {
  label: 'Cabinet',
  // ... other config
  typeSpecificOptions: [
    {
      name: 'lazy_susan',           // Database field name
      type: 'checkbox',             // Input type
      label: 'Lazy Susan',          // Display label
      defaultValue: false,          // Default value
      description: 'Rotating shelf system', // Tooltip
    },
    {
      name: 'susan_diameter',
      type: 'number',
      label: 'Susan Diameter',
      defaultValue: 24,
      min: 18,
      max: 36,
      step: 2,
      description: 'Diameter in inches',
    },
  ],
}
```

### Step 2: That's It!

The form **automatically renders** the inputs based on your configuration. No additional code needed!

### Step 3 (Optional): Add Validation

If needed, add validation in `validateForm`:

```javascript
const validateForm = () => {
  const newErrors = {};
  
  // Validate interdependent options
  if (formData.type_specific_options?.lazy_susan) {
    if (!formData.type_specific_options?.susan_diameter) {
      newErrors.susan_diameter = "Diameter required when Lazy Susan is enabled";
    }
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Step 4 (Optional): Use in Calculations

Access options in calculation functions:

```javascript
const calculateBoxSummary = (...params) => {
  // Access type-specific options
  if (formData.type_specific_options?.tapered) {
    // Apply tapered hood calculations
  }
};
```

## Current Implementations

### Hood: Tapered Option

**Configuration**:
```javascript
hood: {
  label: 'Hood',
  typeSpecificOptions: [
    {
      name: 'tapered',
      type: 'checkbox',
      label: 'Tapered Hood',
      defaultValue: false,
      description: 'Hood narrows from bottom to top',
      serviceMultipliers: {
        2: 1.5, // Tapered hoods take 1.5x shop time (service_id 2)
      },
    },
  ],
}
```

**Purpose**: Indicates if the hood should be tapered (narrower at top)  
**Impact**: 
- Automatically increases shop time (service_id 2) by 50% when enabled
- Applied during hood time calculations in `calculateHoodPartsTime`
**Rendered**: Automatically appears as a checkbox when hood type is selected

## Configuration Reference

### Supported Input Types

#### Checkbox
```javascript
{
  name: 'option_name',
  type: 'checkbox',
  label: 'Display Label',
  defaultValue: false,
  description: 'Shows as tooltip',
  serviceMultipliers: {    // Optional
    2: 1.5,                // Multiply shop time (service_id 2) by 1.5x
    3: 1.2,                // Multiply finish time (service_id 3) by 1.2x
  },
}
```

#### Number
```javascript
{
  name: 'option_name',
  type: 'number',
  label: 'Display Label',
  defaultValue: 0,
  min: 0,           // Optional
  max: 100,         // Optional
  step: 1,          // Optional
  description: 'Shows as tooltip',
}
```

#### Select Dropdown
```javascript
{
  name: 'option_name',
  type: 'select',
  label: 'Display Label',
  defaultValue: 'option1',
  options: [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ],
  description: 'Shows as tooltip',
}
```

#### Text
```javascript
{
  name: 'option_name',
  type: 'text',
  label: 'Display Label',
  defaultValue: '',
  description: 'Shows as tooltip',
}
```

## Best Practices

1. **Define in config only**: Add options to `cabinetItemTypes.js` - the UI renders automatically
2. **Use descriptive names**: Option names should be clear and self-documenting
3. **Provide defaults**: Always include `defaultValue` to prevent undefined errors
4. **Add descriptions**: Tooltips help users understand what each option does
5. **Keep it simple**: Options are automatically cleared when type changes
6. **Document here**: Add new implementations to "Current Implementations" section

## Example: Adding Multiple Options

```javascript
cabinet: {
  label: 'Cabinet',
  features: { /* ... */ },
  typeSpecificOptions: [
    // Checkbox option with service multipliers
    {
      name: 'lazy_susan',
      type: 'checkbox',
      label: 'Lazy Susan',
      defaultValue: false,
      description: 'Rotating shelf system for corner cabinets',
      serviceMultipliers: {
        2: 1.3, // Lazy susans add 30% shop time
        4: 1.2, // And 20% install time
      },
    },
    // Conditional number option
    {
      name: 'susan_diameter',
      type: 'number',
      label: 'Diameter (in)',
      defaultValue: 24,
      min: 18,
      max: 36,
      step: 2,
      description: 'Lazy Susan diameter in inches',
    },
    // Select dropdown
    {
      name: 'hinge_type',
      type: 'select',
      label: 'Hinge Type',
      defaultValue: 'standard',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'soft_close', label: 'Soft Close' },
        { value: 'self_close', label: 'Self Close' },
      ],
      description: 'Type of door hinges',
    },
  ],
}
```

**Result**: All three inputs automatically render in the form when cabinet type is selected!

## Service Multipliers

### How Service Multipliers Work

Service multipliers automatically adjust labor hours for specific services when an option is enabled:

```javascript
serviceMultipliers: {
  2: 1.5,  // service_id 2 (shop) - multiply by 1.5x
  3: 1.2,  // service_id 3 (finish) - multiply by 1.2x
  4: 1.1,  // service_id 4 (install) - multiply by 1.1x
}
```

**Standard Service IDs**:
- `2` = Shop time
- `3` = Finish time  
- `4` = Install time
- `1` = Design time (rarely multiplied)

**Application**:
- Multipliers are applied in calculation functions (e.g., `calculateHoodPartsTime`)
- Only affects enabled options (checkbox = true, or truthy values)
- Multiplies the base time AFTER material multipliers are applied
- Works with any item type that passes `itemTypeConfig` to calculation functions

### Example Flow

1. **Base calculation**: Hood requires 60 minutes shop time
2. **Material multiplier**: Hardwood adds 1.2x = 72 minutes
3. **Type-specific multiplier**: Tapered adds 1.5x = 108 minutes
4. **Final result**: 108 minutes (1.8 hours) of shop time

## Accessing Options in Other Components

### In Redux Actions
```javascript
// type_specific_options is saved with the cabinet item
const cabinet = state.estimates.currentEstimate.tasks[0].sections[0].cabinets[0];
const isTapered = cabinet.type_specific_options?.tapered || false;
```

### In Calculation Helpers

Service multipliers are **automatically applied** in calculation functions like `calculateHoodPartsTime`. The logic reads the config and applies multipliers when options are enabled.

For custom calculations:
```javascript
// Access options directly
if (cabinet.type_specific_options?.tapered) {
  // Apply custom tapered logic
  adjustedDimensions = calculateTaperedDimensions(cabinet);
}
```

## Migration

The database migration is located at:
```
/migrations/add_type_specific_options_to_estimate_cabinets.sql
```

Run this migration to add the `type_specific_options` column to your database.

## Future Enhancements

Potential future type-specific options to consider:

- **Corner Cabinets**: Lazy Susan diameter, shelf count, rotation type
- **Upper Cabinets**: Glass door style, lighting options, height adjustment
- **Base Cabinets**: Drawer configuration, pull-out shelves, soft-close
- **Island Cabinets**: Overhang dimensions, seating side, electrical outlets
- **Pantry Cabinets**: Pull-out system type, basket count, door configuration

## Troubleshooting

### Option not appearing in form
- Verify the option is in `typeSpecificOptions` array in `cabinetItemTypes.js`
- Check that the item type configuration is being loaded correctly
- Ensure `itemTypeConfig` is populated in the component

### Option not saving
- Verify `type_specific_options` is included in `finalFormData`
- Check that the database column exists (run migration if needed)
- Confirm Redux action handles the field

### Option persists after type change
- This is handled automatically - options clear when type changes
- If not working, check the type change handler in `handleChange`

### Validation not working
- Add validation logic to `validateForm` function
- Ensure errors are set in state and displayed in UI

### Wrong default value
- Check `defaultValue` in the option configuration
- Ensure the fallback uses `??` (nullish coalescing): `formData.type_specific_options?.[option.name] ?? option.defaultValue`
