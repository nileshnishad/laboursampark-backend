# 🚀 Vercel Deployment Guide

## Prerequisites
- GitHub account with the repository connected to Vercel
- MongoDB Atlas account with connection string
- A secure JWT secret key

---

## ✅ Step-by-Step Setup

### **1. Push Code to GitHub**
```bash
git add .
git commit -m "deployment"
git push origin master
```

### **2. Connect to Vercel**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository and branch

### **3. Set Environment Variables in Vercel**

**In Vercel Dashboard:**
1. Go to your project → Settings
2. Click "Environment Variables"
3. Add the following variables:

#### **Required Variables:**

| Key | Value | Example |
|-----|-------|---------|
| `NODE_ENV` | `production` | `production` |
| `MONGO_URI` | Your MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET` | A secure random string | `your_super_secure_secret_key_here_change_it` |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |

**Example values:**
```
NODE_ENV = production
MONGO_URI = mongodb+srv://nnishad83_db_user:gboTaoJImju8fTsV@labour123.sao1o1t.mongodb.net/labour123?retryWrites=true&w=majority
JWT_SECRET = MySuper@SecureJWT#Key2025Random123
JWT_EXPIRES_IN = 7d
```

### **4. Deploy**
1. Click "Deploy"
2. Wait for the build to complete
3. Your API is now live! 🎉

---

## 🔒 Security Best Practices

### **❌ DO NOT:**
- ❌ Add sensitive values directly in `vercel.json`
- ❌ Commit `.env` file to GitHub
- ❌ Use simple or hardcoded secrets
- ❌ Share environment variables in chat/slack

### **✅ DO:**
- ✅ Use Vercel's Environment Variables feature
- ✅ Generate strong, random JWT secrets
- ✅ Rotate secrets regularly
- ✅ Use `.env.example` for reference only

---

## 🔑 How to Generate a Secure JWT Secret

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
Visit [random generator](https://randomkeygen.com/)

---

## 🧪 Test Deployment

After deployment, test your API:

```bash
# Check if server is running
curl https://your-vercel-url.vercel.app/

# Test API health
curl https://your-vercel-url.vercel.app/api/health

# Register user (PUBLIC)
curl -X POST https://your-vercel-url.vercel.app/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "test@example.com",
    "password": "password123",
    "mobile": "9876543210",
    "userType": "labour"
  }'

# Login to get token
curl -X POST https://your-vercel-url.vercel.app/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## ❌ Troubleshooting

### **Error: Environment Variable "JWT_SECRET" references Secret which does not exist**
**Solution:** Add `JWT_SECRET` to Vercel Environment Variables in dashboard

### **Error: Connection timeout to MongoDB**
**Solution:** 
- Check MongoDB connection string is correct
- Ensure Vercel IP is whitelisted in MongoDB Atlas (Security > Network Access > Add 0.0.0.0/0)

### **Error: Invalid JWT**
**Solution:** Ensure JWT_SECRET is the same across deployments

### **Error: Build failed**
**Solution:** Check build logs in Vercel dashboard for specific errors

---

## 📝 Environment Variables Summary

**Local Development (.env):**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_local_secret
JWT_EXPIRES_IN=7d
```

**Vercel Production (Dashboard):**
```
NODE_ENV = production
MONGO_URI = mongodb+srv://...
JWT_SECRET = your_production_secret
JWT_EXPIRES_IN = 7d
```

---

## 🔄 Redeploying

To redeploy after making changes:

```bash
git add .
git commit -m "Update: description"
git push origin master
```

Vercel will automatically redeploy on push to master! 🚀

---

For more help, visit [Vercel Docs](https://vercel.com/docs)
