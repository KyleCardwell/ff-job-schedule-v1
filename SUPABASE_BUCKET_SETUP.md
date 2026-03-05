# Supabase Storage Bucket Setup Guide

This guide explains how to set up the `team-files` storage bucket in Supabase for storing team logos and other team-related files.

## Bucket Configuration

### 1. Create the Bucket

1. Log in to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `team-files`
   - **Public**: Enable this option (allows authenticated users to get public URLs)
   - **File size limit**: 5MB (recommended for logos)
   - **Allowed MIME types**: Leave empty or specify:
     - `image/svg+xml`
     - `image/png`
     - `image/jpeg`

### 2. Bucket Structure

Files are organized by team ID:
```
team-files/
├── {team_id_1}/
│   └── logo.{ext}
├── {team_id_2}/
│   └── logo.{ext}
└── ...
```

This structure ensures:
- Each team's files are isolated in their own folder
- Easy identification of which files belong to which team
- Simplified policy management

## Row Level Security (RLS) Policies

**Permission Model:**
- **Admins (role_id = 1)**: Full CRUD access to all team files
- **Regular Users**: Read-only access to their own team's files

You only need **2 policies** for the entire bucket:

### Policy 1: Read Access (All Team Members)

**Name**: `Team members can view their team files`

**Operation**: SELECT

**Target roles**: authenticated

**Policy definition**:
```sql
CREATE POLICY "Team members can view their team files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'team-files' 
  AND EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.team_id::text = (storage.foldername(name))[1]
  )
);
```

**What this does**: Allows any authenticated team member to view files in their team's folder.

---

### Policy 2: Full Access (Admins Only)

**Name**: `Admins have full access to team files`

**Operation**: ALL (covers INSERT, UPDATE, DELETE)

**Target roles**: authenticated

**Policy definition**:
```sql
CREATE POLICY "Admins have full access to team files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'team-files' 
  AND EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role_id = 1  -- Admin role
      AND tm.team_id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'team-files' 
  AND EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role_id = 1  -- Admin role
      AND tm.team_id::text = (storage.foldername(name))[1]
  )
);
```

**What this does**: Gives admins full CRUD access (INSERT, UPDATE, DELETE, and also SELECT) to their team's files.

## How the Policies Work

The policies use the following logic:

1. **Bucket Check**: Ensures operations only affect the `team-files` bucket
2. **Folder Check**: Extracts the team_id from the file path using `storage.foldername(name)[1]`
3. **Admin Check**: For write operations (INSERT/UPDATE/DELETE), verifies user has `role_id = 1`
4. **Team Membership**: Verifies the user belongs to the team whose folder is being accessed

### Folder Name Extraction

The `storage.foldername(name)` function splits the path into an array:
- For path `123/logo.svg`: `storage.foldername(name)` returns `{123}`
- `[1]` gets the first element: `123`

### Permission Logic

**For SELECT (Read):**
```sql
EXISTS (
  SELECT 1
  FROM team_members tm
  WHERE tm.user_id = auth.uid()
    AND tm.team_id::text = (storage.foldername(name))[1]
)
```
✅ Any team member can view their team's files

**For INSERT/UPDATE/DELETE (Write):**
```sql
EXISTS (
  SELECT 1
  FROM team_members tm
  JOIN roles r ON r.role_id = tm.role_id
  WHERE tm.user_id = auth.uid()
    AND tm.role_id = 1  -- Admin only
    AND tm.team_id::text = (storage.foldername(name))[1]
)
```
✅ Only admins can modify their team's files

## Automatic Folder Organization

**The folder structure happens automatically!** You don't need to manually create folders.

When your app uploads a file:
```javascript
// In TeamLogo.jsx
const fileName = `${teamId}/logo.svg`;
supabase.storage.from("team-files").upload(fileName, file);
```

Supabase automatically:
1. Creates the `{teamId}/` folder if it doesn't exist
2. Places the file inside that folder
3. The RLS policies extract the team_id from the path to enforce permissions

**Example:**
- Team 42 uploads a logo → File path: `42/logo.svg`
- Team 99 uploads a logo → File path: `99/logo.svg`
- Each team's folder is created on-demand during upload

## Database Schema Requirements

Ensure your `teams` table has these columns:

```sql
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS logo_path TEXT;
```

The `contact_info` JSONB column structure:
```json
{
  "street": "123 Main St",
  "city": "City Name",
  "state": "ST",
  "zip": "12345",
  "email": "contact@company.com",
  "phone": "(555) 123-4567",
  "fax": "(555) 123-4568"
}
```

## Testing the Setup

1. **Upload a logo**: Try uploading a logo through the Team Settings page
2. **Verify storage**: Check the Storage section in Supabase dashboard
3. **Test permissions**: Try accessing another team's file (should be denied)
4. **Test deletion**: Delete a logo and verify it's removed from storage

## Troubleshooting

### Cannot Upload Files

- Verify the bucket exists and is public
- Check that RLS policies are enabled on `storage.objects`
- Ensure the authenticated user exists in `team_members` table
- Check browser console for detailed error messages

### Cannot View Logo

- Verify the `logo_path` in the `teams` table matches the actual file path
- Check that the file exists in the bucket
- Ensure the bucket is set to public
- Verify the SELECT policy is correctly configured

### "Row Level Security Policy Violation" Error

- Check that the user is properly authenticated
- Verify the user exists in the `team_members` table with a valid `team_id`
- Ensure the file path matches the pattern: `{team_id}/logo.{ext}`

## Security Considerations

1. **File Size Limits**: The 5MB limit prevents abuse
2. **MIME Type Validation**: Frontend validates file types before upload
3. **Path Isolation**: Each team can only access their own folder
4. **Authentication Required**: All operations require a valid authenticated user
5. **Team Membership**: Users must be members of the team to access files

## Additional Notes

- Logo uploads use the `upsert: true` option to replace existing logos
- Deleted logos also remove the `logo_path` from the teams table
- SVG format is recommended for logos for scalability
- Public URLs are generated client-side using `supabase.storage.from('team-files').getPublicUrl()`
