# PDF Logo & Contact Info Implementation

## Overview
Added team logo and contact information to the PDF estimate header.

## Changes Made

### 1. EstimatePreview.jsx
**Purpose**: Fetch team data and prepare logo for PDF generation

**Changes**:
- Import `fetchTeamData` and `getTeamLogoSignedUrl` from teams actions
- Fetch team data on component mount
- Convert logo from signed URL to data URL for PDF embedding
- Pass `teamData` and `logoDataUrl` props to `GenerateEstimatePdf`

**Why data URL?**: PDFs require embedded images as base64 data URLs, not external URLs.

### 2. GenerateEstimatePdf.jsx
**Purpose**: Include logo and contact info in PDF header

**Changes**:
- Accept `teamData` and `logoDataUrl` props
- Build contact info lines from `teamData.contact_info`:
  - Street address
  - City, State, ZIP
  - Phone
  - Email
  - Fax (if provided)
- Adjust header height dynamically based on contact info presence
- Replace placeholder logo with actual logo image (if available)
- Display contact info centered below logo, above client info

**PDF Header Structure**:
```
┌─────────────────────────────────────┐
│  [LOGO]              ESTIMATE       │
│                      Date           │
├─────────────────────────────────────┤
│         Company Contact Info        │
│         123 Main St                 │
│         City, ST 12345              │
│         Phone: (555) 123-4567       │
│         Email: contact@company.com  │
├─────────────────────────────────────┤
│  Client Name    |    Project        │
└─────────────────────────────────────┘
```

## How It Works

### Logo Flow
1. **EstimatePreview** fetches team data
2. If `logo_path` exists, get signed URL from Supabase
3. Fetch the image blob from signed URL
4. Convert blob to base64 data URL using FileReader
5. Pass data URL to PDF generator
6. pdfMake embeds the image directly in the PDF

### Contact Info Flow
1. **EstimatePreview** fetches team data
2. Pass `teamData` to PDF generator
3. PDF generator extracts `contact_info` fields
4. Builds array of contact lines (only non-empty fields)
5. Renders centered below logo with small font

### Dynamic Header Height
- **Without contact info**: 179.5 points
- **With contact info**: 230 points
- Ensures proper spacing and prevents content overlap

## Database Schema

### teams table
```sql
contact_info JSONB {
  street: string,
  city: string,
  state: string,
  zip: string,
  email: string,
  phone: string,
  fax: string
}

logo_path TEXT -- Just filename, e.g., "logo.svg"
```

### Storage
- **Bucket**: `team-files` (private)
- **Path**: `{teamId}/{filename}`
- **Access**: Signed URLs for authenticated users

## Benefits

✅ **Professional branding** - Company logo on every estimate  
✅ **Contact visibility** - Easy for clients to reach you  
✅ **Automatic updates** - Changes in Team Settings reflect in PDFs  
✅ **Secure** - Private bucket with RLS policies  
✅ **Flexible** - Works with or without logo/contact info  

## Testing Checklist

- [ ] PDF generates with logo when logo is uploaded
- [ ] PDF shows placeholder when no logo exists
- [ ] Contact info displays correctly when filled
- [ ] PDF works when contact info is empty
- [ ] Header height adjusts properly
- [ ] Logo fits within defined space (100x80)
- [ ] Contact info is centered and readable
- [ ] Multiple pages maintain consistent header

## Future Enhancements

- Add team name/company name to header
- Support different logo sizes/aspect ratios
- Add footer with company info
- Include website URL in contact info
