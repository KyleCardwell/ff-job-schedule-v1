# Deployment Guide: FF Job Schedule App

## Overview
This guide covers deploying your backend to Vercel and configuring your frontend to connect to the production backend.

---

## Backend Deployment to Vercel

### Prerequisites
- [ ] Vercel account created (https://vercel.com)
- [ ] Git repository with your code pushed
- [ ] Supabase project credentials ready

### Step 1: Prepare Backend for Deployment

Your backend is already configured with:
- ✅ `vercel.json` with proper function settings
- ✅ `package.json` with all dependencies
- ✅ `.env.example` for reference
- ✅ Express app exported as default for serverless

### Step 2: Deploy Backend to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to backend directory**:
   ```bash
   cd ff-job-schedule-backend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time) or **Y** (subsequent deploys)
   - What's your project's name? `ff-job-schedule-backend` (or your choice)
   - In which directory is your code located? `./`
   - Want to override settings? **N**

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

#### Option B: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. **Configure project**:
   - **Framework Preset**: Other
   - **Root Directory**: `ff-job-schedule-backend`
   - **Build Command**: Leave empty or `npm run vercel-build`
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

4. Click **Deploy**

### Step 3: Configure Environment Variables in Vercel

After deployment, add environment variables:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `FRONTEND_URL` | See note below | Production |
| `SUPABASE_URL` | Your Supabase project URL | Production, Preview |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | Production, Preview |
| `SUPABASE_ANON_KEY` | Your Supabase anon key (optional) | Production, Preview |

**`FRONTEND_URL` Configuration**:
- **For production only**: `https://your-frontend-app.vercel.app`
- **For local testing + production**: `http://localhost:5173,https://your-frontend-app.vercel.app`
- **For local testing only**: `http://localhost:5173`

💡 **Tip**: Include `http://localhost:5173` to test your local frontend against production backend. See `LOCAL_DEV_WITH_PROD_BACKEND.md` for details.

4. **Redeploy** after adding environment variables:
   ```bash
   vercel --prod
   ```

### Step 4: Verify Backend Deployment

1. **Test health endpoint**:
   ```bash
   curl https://your-backend.vercel.app/api/health
   ```
   
   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-12-14T...",
     "environment": "production"
   }
   ```

2. **Test API root**:
   ```bash
   curl https://your-backend.vercel.app/api
   ```

3. **Check Vercel logs** for any errors

4. **Note your backend URL**: `https://your-backend.vercel.app`

---

## Frontend Configuration

### Step 1: Update Frontend Environment Variables

1. **Create/Update `.env` file** in `ff-job-schedule-v1/`:
   ```bash
   cd ff-job-schedule-v1
   ```

2. **Choose your configuration**:

   **Option A: Local backend** (default for development):
   ```env
   VITE_BACKEND_URL=http://localhost:3001
   ```

   **Option B: Production backend** (test locally with production):
   ```env
   VITE_BACKEND_URL=https://your-backend.vercel.app
   ```
   
   Replace `your-backend.vercel.app` with your actual Vercel backend URL.

💡 **Tip**: You can easily switch between local and production backends by changing `VITE_BACKEND_URL` in your `.env` file. See `LOCAL_DEV_WITH_PROD_BACKEND.md` for a detailed guide on testing your local frontend with the production backend.

### Step 2: Update `.env.example` (for team reference)

Add to `ff-job-schedule-v1/.env.example`:
```env
# Backend API URL
VITE_BACKEND_URL=https://your-backend.vercel.app
```

### Step 3: Deploy Frontend (if needed)

If you're also deploying your frontend to Vercel:

1. **Navigate to frontend directory**:
   ```bash
   cd ff-job-schedule-v1
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Add environment variables** in Vercel Dashboard:
   - `VITE_BACKEND_URL` = `https://your-backend.vercel.app`
   - Plus any Supabase variables your frontend needs

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Step 4: Update Backend CORS

After deploying frontend, update backend's `FRONTEND_URL`:

1. Go to backend project in Vercel Dashboard
2. **Settings** → **Environment Variables**
3. Update `FRONTEND_URL` to your frontend production URL
4. **Redeploy backend**

---

## Testing the Integration

### Test PDF Generation

1. **Open your frontend** (local or production)
2. **Navigate to an estimate** or schedule
3. **Click "Generate PDF"** button
4. **Verify**:
   - PDF generates successfully
   - No CORS errors in browser console
   - PDF downloads correctly

### Test from Command Line

```bash
curl -X POST https://your-backend.vercel.app/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "format": "Letter",
      "printBackground": true
    }
  }'
```

---

## Important Notes

### Backend Considerations

1. **Function Limits**:
   - Memory: 1024MB (configured in `vercel.json`)
   - Timeout: 30 seconds (configured in `vercel.json`)
   - For larger PDFs, you may need to increase these

2. **Playwright in Production**:
   - Uses `chrome-aws-lambda` for serverless compatibility
   - First request may be slow (cold start)
   - Subsequent requests are faster

3. **CORS Configuration**:
   - Backend only accepts requests from `FRONTEND_URL`
   - Update this when deploying to new domains

### Frontend Considerations

1. **Environment Variables**:
   - Vite requires `VITE_` prefix for client-side variables
   - Variables are embedded at build time
   - Rebuild frontend after changing environment variables

2. **API URL**:
   - No trailing slash in `VITE_BACKEND_URL`
   - Include protocol (`https://`)

---

## Troubleshooting

### Backend Issues

**PDF generation fails in production:**
- Check Vercel function logs
- Verify memory allocation (increase to 1024MB)
- Check timeout settings (increase if needed)

**CORS errors:**
- Verify `FRONTEND_URL` matches exactly (no trailing slash)
- Check browser console for specific error
- Ensure backend was redeployed after adding env vars

**Environment variables not working:**
- Redeploy after adding variables
- Check for typos in variable names
- Verify they're set for correct environment

### Frontend Issues

**Cannot connect to backend:**
- Verify `VITE_BACKEND_URL` is correct
- Check backend health endpoint
- Look for CORS errors in console

**Environment variables not updating:**
- Rebuild frontend: `npm run build`
- Clear browser cache
- Verify `.env` file is in correct location

---

## Quick Reference

### Backend URLs
- **Health Check**: `https://your-backend.vercel.app/api/health`
- **API Root**: `https://your-backend.vercel.app/api`
- **PDF Generation**: `https://your-backend.vercel.app/api/generate-pdf`

### Key Files
- Backend: `ff-job-schedule-backend/vercel.json`
- Backend: `ff-job-schedule-backend/.env.example`
- Frontend: `ff-job-schedule-v1/.env`
- Frontend: `ff-job-schedule-v1/src/services/pdfService.js`

### Useful Commands
```bash
# Deploy backend
cd ff-job-schedule-backend && vercel --prod

# Deploy frontend
cd ff-job-schedule-v1 && vercel --prod

# Test backend health
curl https://your-backend.vercel.app/api/health

# View Vercel logs
vercel logs
```

---

## Next Steps

1. ✅ Deploy backend to Vercel
2. ✅ Configure environment variables
3. ✅ Update frontend `.env` with backend URL
4. ✅ Test PDF generation
5. ✅ Deploy frontend (optional)
6. ✅ Update backend CORS with frontend URL
7. ✅ Monitor Vercel logs for issues

---

---

## Additional Resources

- **`LOCAL_DEV_WITH_PROD_BACKEND.md`** - Guide for testing local frontend with production backend
- **`ff-job-schedule-backend/DEPLOYMENT_CHECKLIST.md`** - Detailed deployment checklist
- **`ff-job-schedule-backend/FRONTEND_INTEGRATION.md`** - Frontend integration documentation

---

**Last Updated**: December 14, 2024
**Backend URL**: _Add your URL here after deployment_
**Frontend URL**: _Add your URL here after deployment_
