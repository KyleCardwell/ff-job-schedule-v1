# Quick Start: Setting Up Team Files Bucket

## Step-by-Step Setup

### 1. Create the Bucket in Supabase

1. Go to your Supabase dashboard
2. Click **Storage** in the sidebar
3. Click **New bucket**
4. Settings:
   - **Name**: `team-files`
   - **Public**: ✅ Enable
   - **File size limit**: 5MB
5. Click **Create bucket**

### 2. Folder Organization (Automatic!)

**You don't need to create folders manually!** When a team uploads a logo:

```javascript
// TeamLogo.jsx automatically does this:
const fileName = `${teamId}/logo.svg`;
supabase.storage.from("team-files").upload(fileName, file);
```

Supabase creates the folder structure automatically:
```
team-files/
├── 1/logo.svg
├── 2/logo.svg
├── 3/logo.png
└── ...
```

Each team's files are isolated in their own `{teamId}/` folder.

### 3. Apply RLS Policies

Go to **Storage** → **Policies** → **team-files** bucket and create 2 policies:

#### Policy 1: Read Access (All Team Members)
```sql
CREATE POLICY "Team members can view their team files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'team-files' 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.team_id::text = (storage.foldername(name))[1]
  )
);
```

#### Policy 2: Full Access (Admins Only)
```sql
CREATE POLICY "Admins have full access to team files"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'team-files' 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role_id = 1
      AND tm.team_id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'team-files' 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role_id = 1
      AND tm.team_id::text = (storage.foldername(name))[1]
  )
);
```

**That's it!** Just 2 policies instead of 4.

### 4. Test It Out

1. Log in as an **admin** user
2. Go to Team Settings
3. Upload a logo - it should work!
4. Check the Storage tab in Supabase - you'll see the folder was created automatically
5. Log in as a **regular user** (non-admin)
6. Go to Team Settings
7. You should see the logo but not be able to upload/delete

## Permission Model

| Action | Admin | Regular User |
|--------|-------|--------------|
| **View** logo | ✅ Yes | ✅ Yes |
| **Upload** logo | ✅ Yes | ❌ No |
| **Delete** logo | ✅ Yes | ❌ No |
| **Edit** contact info | ✅ Yes | ❌ No |
| **View** contact info | ✅ Yes | ✅ Yes |

## How It Works

1. **File Upload**: When an admin uploads `logo.svg` for team `42`, the app creates path `42/logo.svg`
2. **Folder Created**: Supabase automatically creates the `42/` folder
3. **Policy Check**: RLS policy extracts `42` from the path and verifies:
   - User belongs to team `42`
   - User has `role_id = 1` (for write operations)
4. **Access Granted/Denied**: Based on the checks above

## Troubleshooting

**"Storage error: new row violates row-level security policy"**
- Make sure you created all 4 policies
- Verify the user exists in `team_members` table
- Check that `role_id = 1` for admin users

**Logo not displaying**
- Verify the bucket is set to **Public**
- Check that `logo_path` is saved in the `teams` table
- Ensure the file actually uploaded (check Storage tab)

**Can't upload even as admin**
- Verify your user has `role_id = 1` in `team_members`
- Check that the INSERT policy is applied
- Look at browser console for specific error

## See Also

- **SUPABASE_BUCKET_SETUP.md** - Full detailed documentation
- **migrations/add_team_contact_and_logo.sql** - Database schema changes
