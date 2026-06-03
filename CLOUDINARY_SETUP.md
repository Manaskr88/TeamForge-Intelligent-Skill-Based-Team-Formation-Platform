# Cloudinary Setup Guide for TeamForge

## Get Free Cloudinary Credentials (2 minutes)

1. Go to **https://cloudinary.com** and sign up for a free account
2. After login, go to your **Dashboard**
3. Find the **API Keys** section — you'll see:
   - Cloud Name
   - API Key  
   - API Secret

## Add to Backend .env

Open `backend/.env` and fill in:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## Add to Render (Production)

In your Render web service dashboard:
- Go to **Environment** tab
- Add these 3 variables with your real Cloudinary values

## How It Works

1. User clicks camera icon on Profile page
2. File uploads to backend (`POST /api/users/upload-avatar`)
3. Multer-Cloudinary streams it directly to Cloudinary (no disk storage)
4. Cloudinary returns a permanent `https://res.cloudinary.com/...` URL
5. URL is saved to MongoDB `user.avatar`
6. Frontend receives the URL, updates React context instantly
7. Avatar appears everywhere — navbar, chat, teams, recommendations

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB bandwidth/month
- Sufficient for thousands of profile photos

## Fallback Behavior

If a user has no avatar (or upload fails):
- Avatar shows a generated image from `ui-avatars.com`
- Format: `https://ui-avatars.com/api/?name=John+Doe&background=1e293b&color=fff`
- Works everywhere — no broken images ever
