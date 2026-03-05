# Quick Start Guide

## 🚀 Deploy Backend to Vercel

```bash
cd ff-job-schedule-backend
vercel login
vercel --prod
```

**Add Environment Variables in Vercel Dashboard:**
```
NODE_ENV=production
FRONTEND_URL=http://localhost:5173,https://your-frontend.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

Then redeploy: `vercel --prod`

---

## 💻 Local Development Options

### Option 1: Local Frontend + Local Backend

**Terminal 1** (Backend):
```bash
cd ff-job-schedule-backend
npm run dev
```

**Terminal 2** (Frontend):
```bash
cd ff-job-schedule-v1
# Make sure .env has: VITE_BACKEND_URL=http://localhost:3001
npm run dev
```

### Option 2: Local Frontend + Production Backend

**Terminal 1** (Frontend only):
```bash
cd ff-job-schedule-v1
# Update .env with: VITE_BACKEND_URL=https://your-backend.vercel.app
npm run dev
```

No backend needed locally! ✨

---

## 🔄 Switch Between Backends

Edit `ff-job-schedule-v1/.env`:

**Use Local Backend:**
```env
VITE_BACKEND_URL=http://localhost:3001
```

**Use Production Backend:**
```env
VITE_BACKEND_URL=https://your-backend.vercel.app
```

Restart dev server after changing.

---

## ✅ Test Your Setup

**Backend Health Check:**
```bash
curl https://your-backend.vercel.app/api/health
```

**Test PDF Generation:**
1. Open frontend: `http://localhost:5173`
2. Navigate to an estimate
3. Click "Generate PDF"
4. Check browser console for errors

---

## 📚 Full Documentation

- **`DEPLOYMENT_GUIDE.md`** - Complete deployment instructions
- **`LOCAL_DEV_WITH_PROD_BACKEND.md`** - Test local frontend with production backend
- **`ff-job-schedule-backend/DEPLOYMENT_CHECKLIST.md`** - Deployment checklist

---

## 🆘 Common Issues

**CORS Error?**
- Add `http://localhost:5173` to `FRONTEND_URL` in Vercel
- Redeploy backend

**Backend URL not updating?**
- Stop dev server (Ctrl+C)
- Update `.env` file
- Restart: `npm run dev`

**PDF generation fails?**
- Check Vercel logs: `vercel logs`
- Verify environment variables in Vercel Dashboard

---

**Your URLs:**
- Backend: `https://_____.vercel.app`
- Frontend: `http://localhost:5173` (local) or `https://_____.vercel.app` (prod)
