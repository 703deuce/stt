# Vercel Deployment Guide

## 🚀 **Pre-Deployment Checklist**

### 1. Environment Variables Required
Make sure to set these in Vercel dashboard:

#### **Firebase Configuration**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

#### **Firebase Admin SDK (Server-side)**
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

#### **RunPod Configuration**
- `RUNPOD_API_KEY`
- `RUNPOD_ENDPOINT_URL`

#### **Hugging Face**
- `HF_TOKEN`

#### **Stripe**
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

#### **App URL (Auto-set by Vercel)**
- `NEXT_PUBLIC_APP_URL` (will be set to your Vercel URL)

#### **Optional**
- `REDIS_URL`
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

### 2. GitHub Repository Setup

1. **Create a new GitHub repository**
2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

### 3. Vercel Deployment

1. **Go to:** https://vercel.com
2. **Click "New Project"**
3. **Import from GitHub**
4. **Select your repository**
5. **Configure environment variables** (see list above)
6. **Deploy**

### 4. Post-Deployment

1. **Get your Vercel URL:** `https://your-app-name.vercel.app`
2. **Update webhook URL in code:** The webhook will automatically use your Vercel URL
3. **Test the webhook:** Visit `https://your-app-name.vercel.app/api/webhooks/runpod`

## 🔧 **Webhook URL After Deployment**

Your webhook URL will be:
```
https://your-app-name.vercel.app/api/webhooks/runpod
```

This URL will be accessible from RunPod's servers, so webhooks will work!

## 🧪 **Testing After Deployment**

1. **Test webhook endpoint:** `https://your-app-name.vercel.app/api/webhooks/runpod`
2. **Upload a file for transcription**
3. **Check console logs** for webhook notifications
4. **Verify real-time updates** work

## 📝 **Notes**

- All environment variables from your `.env.local` need to be set in Vercel dashboard
- The `NEXT_PUBLIC_APP_URL` will be automatically set to your Vercel URL
- Webhooks will work because your app will be publicly accessible
- No need for ngrok or tunneling services
