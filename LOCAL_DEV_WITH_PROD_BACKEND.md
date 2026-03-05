# Testing Local Frontend with Production Backend

This guide explains how to test your local development frontend against the production backend on Vercel.

## Why This Setup?

Testing your local frontend against the production backend is useful for:
- Testing PDF generation without running the backend locally
- Verifying production backend behavior
- Debugging production issues locally
- Avoiding local Playwright/Chrome setup

---

## Step 1: Configure Backend CORS for Local Development

Your production backend needs to allow requests from `http://localhost:5173` (your local dev server).

### Option A: Update via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Find the `FRONTEND_URL` variable
4. **Update the value** to include both URLs (comma-separated):
   ```
   http://localhost:5173,https://your-frontend.vercel.app
   ```
   
   Or if you only want to test locally for now:
   ```
   http://localhost:5173
   ```

5. **Redeploy** the backend:
   ```bash
   cd ff-job-schedule-backend
   vercel --prod
   ```

### Option B: Update Backend Code to Allow Multiple Origins

If you need more flexibility, update the backend CORS configuration:

**File**: `ff-job-schedule-backend/api/index.js`

```javascript
// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

Then redeploy the backend.

---

## Step 2: Configure Frontend to Use Production Backend

### Update Your Local `.env` File

In `ff-job-schedule-v1/.env`:

```env
# Use production backend
VITE_BACKEND_URL=https://your-backend.vercel.app

# Your Supabase config (same as always)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important**: Replace `your-backend.vercel.app` with your actual backend URL.

### Create a `.env.local` for Easy Switching (Optional)

You can create multiple env files for different scenarios:

**`.env.local`** (local backend):
```env
VITE_BACKEND_URL=http://localhost:3001
```

**`.env.production-backend`** (production backend):
```env
VITE_BACKEND_URL=https://your-backend.vercel.app
```

Then copy the one you want to `.env`:
```bash
cp .env.production-backend .env
```

---

## Step 3: Start Your Local Frontend

```bash
cd ff-job-schedule-v1
npm run dev
```

Your frontend will now run on `http://localhost:5173` and make API calls to your production backend.

---

## Step 4: Test PDF Generation

1. Open your browser to `http://localhost:5173`
2. Navigate to an estimate or schedule
3. Click the **"Generate PDF"** button
4. The PDF should generate using your production backend

### Check Browser Console

Open browser DevTools (F12) and check:
- ✅ No CORS errors
- ✅ API calls go to `https://your-backend.vercel.app`
- ✅ PDF generates successfully

---

## Troubleshooting

### CORS Error: "Access-Control-Allow-Origin"

**Problem**: Backend is blocking requests from localhost.

**Solution**: 
1. Verify `FRONTEND_URL` in Vercel includes `http://localhost:5173`
2. Redeploy backend after changing environment variables
3. Clear browser cache and reload

### Backend URL Not Updating

**Problem**: Frontend still uses old backend URL.

**Solution**:
1. Stop the dev server (`Ctrl+C`)
2. Update `.env` file
3. Restart dev server: `npm run dev`
4. Hard refresh browser (`Cmd+Shift+R` or `Ctrl+Shift+R`)

### PDF Generation Fails

**Problem**: Backend returns 500 error.

**Solution**:
1. Check Vercel function logs: `vercel logs`
2. Verify backend environment variables are set
3. Test backend health: `curl https://your-backend.vercel.app/api/health`

### Can't Connect to Backend

**Problem**: Network error or timeout.

**Solution**:
1. Verify backend URL is correct (no typos)
2. Check backend is deployed: visit `https://your-backend.vercel.app/api`
3. Verify you have internet connection

---

## Quick Reference

### Environment Variable Configurations

**Local frontend + Local backend**:
```env
VITE_BACKEND_URL=http://localhost:3001
```

**Local frontend + Production backend**:
```env
VITE_BACKEND_URL=https://your-backend.vercel.app
```

**Production frontend + Production backend**:
```env
VITE_BACKEND_URL=https://your-backend.vercel.app
```

### Vercel Environment Variables

For testing local frontend with production backend, set:
```
FRONTEND_URL=http://localhost:5173
```

For production (both deployed):
```
FRONTEND_URL=https://your-frontend.vercel.app
```

For both local and production:
```
FRONTEND_URL=http://localhost:5173,https://your-frontend.vercel.app
```

### Useful Commands

```bash
# Check backend health
curl https://your-backend.vercel.app/api/health

# View backend logs
vercel logs --project=your-backend-project

# Test PDF generation
curl -X POST https://your-backend.vercel.app/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "options": {"format": "Letter"}}'

# Start local frontend
cd ff-job-schedule-v1 && npm run dev

# Start local backend (if needed)
cd ff-job-schedule-backend && npm run dev
```

---

## Security Considerations

### Development vs Production

**For Development/Testing**:
- It's safe to allow `http://localhost:5173` in production backend CORS
- This is a common practice for testing

**For Production**:
- Only allow your production frontend URL
- Remove localhost from `FRONTEND_URL` when done testing
- Use specific URLs, not wildcards (`*`)

### Best Practice

Use multiple origins in production:
```
FRONTEND_URL=http://localhost:5173,https://your-frontend.vercel.app
```

This allows:
- ✅ Local development and testing
- ✅ Production frontend access
- ❌ Blocks all other origins

---

## Workflow Example

### Daily Development Workflow

1. **Morning**: Start local frontend
   ```bash
   cd ff-job-schedule-v1
   npm run dev
   ```

2. **Testing**: Switch between backends as needed
   - Edit `.env` to change `VITE_BACKEND_URL`
   - Restart dev server

3. **Debugging**: Check production backend logs
   ```bash
   vercel logs
   ```

### When to Use Each Setup

**Use Local Backend** when:
- Developing new backend features
- Testing backend changes
- Debugging backend issues
- Working offline

**Use Production Backend** when:
- Testing PDF generation (avoid Playwright setup)
- Verifying production behavior
- Testing with production data
- Frontend-only development

---

## Next Steps

1. ✅ Deploy backend to Vercel
2. ✅ Add `http://localhost:5173` to `FRONTEND_URL` in Vercel
3. ✅ Update local `.env` with production backend URL
4. ✅ Start local dev server
5. ✅ Test PDF generation
6. ✅ Check browser console for errors

---

**Last Updated**: December 14, 2024
**Backend URL**: _Add your production backend URL here_
