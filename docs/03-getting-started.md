# Getting Started with RetailTwin Cockpit

**For**: New developers joining the RetailTwin Cockpit project  
**Estimated Setup Time**: 30 minutes  
**Prerequisites**: MacBook Air with macOS, basic command line knowledge

---

## ✅ Prerequisites Checklist

Before you begin, ensure you have:

- ☐ **MacBook Air** (or any Mac with Apple Silicon/Intel)
- ☐ **GitHub account** with access to `retailtwin/retailtwin-cockpit`
- ☐ **Supabase account** (free tier is fine for development)
- ☐ **VS Code** or preferred code editor
- ☐ **Terminal** access

---

## 📥 Step 1: Install Development Tools (15 minutes)

### **A. Install Homebrew** (if not already installed)

**In Terminal**:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the prompts. May ask for your password.

---

### **B. Install Node.js, Git, VS Code**

**In Terminal**:
```bash
# Install Node.js
brew install node

# Install Git
brew install git

# Install VS Code
brew install --cask visual-studio-code

# Install GitHub Desktop (optional, but recommended)
brew install --cask github
```

**Verify installations**:
```bash
node -v    # Should show: v25.x.x
npm -v     # Should show: 11.x.x
git --version  # Should show: git version 2.x.x
```

---

## 📁 Step 2: Clone Repository (5 minutes)

### **Option A: Using GitHub Desktop** (Easiest)

1. Open **GitHub Desktop**
2. Click: **File** → **Clone Repository**
3. Select `retailtwin/retailtwin-cockpit`
4. Local Path: `/Users/[your-username]/Projects`
5. Click **Clone**

---

### **Option B: Using Terminal**

**In Terminal**:
```bash
# Create Projects folder if it doesn't exist
mkdir -p ~/Projects
cd ~/Projects

# Clone repository
git clone https://github.com/retailtwin/retailtwin-cockpit.git

# Enter project
cd retailtwin-cockpit
```

---

## 🔧 Step 3: Install Dependencies (5 minutes)

**In Terminal** (inside `retailtwin-cockpit` folder):
```bash
npm install
```

This installs all packages listed in `package.json`. May take 2-5 minutes.

---

## 🔐 Step 4: Set Up Environment Variables (5 minutes)

### **A. Get Supabase Credentials**

1. Go to: https://supabase.com/dashboard
2. Select your **RetailTwin Cockpit** project
3. Click: **Settings** (gear icon) → **API**
4. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long JWT token starting with `eyJhbG...`)

---

### **B. Create Environment File**

**In Terminal**:
```bash
# Copy example file
cp .env.example .env.local

# Open in VS Code
code .env.local
```

**Edit `.env.local`** and replace:
```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

With your actual values from Step 4A.

**Save the file** (`Cmd + S`).

---

## 🚀 Step 5: Run Development Server (2 minutes)

**In Terminal**:
```bash
npm run dev
```

You should see:
```
VITE v5.4.19  ready in 342 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Open your browser** to: http://localhost:5173

You should see the **RetailTwin Cockpit** dashboard!

---

## 🎨 Step 6: Open in VS Code (1 minute)

**In Terminal**:
```bash
code .
```

This opens the entire project in VS Code.

---

## 📂 Project Structure Overview

```
retailtwin-cockpit/
├── src/                # Source code
│   ├── components/     # React components
│   ├── pages/          # Route pages
│   ├── lib/            # Utilities (dbm.ts, mockData.ts)
│   ├── hooks/          # Custom hooks
│   └── integrations/   # Supabase client
├── supabase/           # Database migrations & edge functions
├── public/             # Static assets
└── docs/               # Documentation (you're reading this!)
```

**Key Files**:
- `src/App.tsx` - Root app component
- `src/pages/Dashboard.tsx` - Main dashboard
- `src/lib/dbm.ts` - Dynamic Buffer Management logic
- `package.json` - Dependencies
- `.env.local` - Your environment variables (never commit!)

---

## 🧪 Step 7: Verify Everything Works

### **A. Check Dashboard**

1. Open: http://localhost:5173/dashboard
2. You should see:
   - KPI cards
   - Inventory graph
   - Filter bar
   - Archie AI button (floating)

---

### **B. Test Demo Mode**

If you don't have real data yet:

1. In `.env.local`, ensure: `VITE_ENABLE_DEMO_MODE=true`
2. Restart dev server: `Ctrl + C`, then `npm run dev`
3. Dashboard should show mock data

---

### **C. Test AI Chat (if enabled)**

1. Click **Archie** floating button (bottom-right)
2. Type: "Show me inventory trends"
3. If configured, Archie should respond

---

## 🐛 Troubleshooting

### **Problem: `npm install` fails**

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

---

### **Problem: "Module not found" errors**

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

---

### **Problem: Supabase connection errors**

**Solution**:
1. Verify `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Check Supabase project is active: https://supabase.com/dashboard
3. Restart dev server: `Ctrl + C`, then `npm run dev`

---

### **Problem: Port 5173 already in use**

**Solution**:
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use a different port
npm run dev -- --port 5174
```

---

## 📚 Next Steps

Now that you're set up, explore:

1. **Read documentation**:
   - `/docs/01-inventory.md` - Complete system inventory
   - `/docs/02-BLUEPRINT.md` - Technical architecture

2. **Explore components**:
   - Look at `src/components/KPICard.tsx`
   - Study `src/lib/dbm.ts` algorithm

3. **Make your first change**:
   - Edit `src/pages/Dashboard.tsx`
   - Change a heading or add a test button
   - See live reload in browser!

4. **Learn Supabase**:
   - Explore database in Supabase Dashboard
   - Check out `supabase/migrations/` folder

---

## 🔄 Daily Development Workflow

### **Morning Routine**

```bash
# 1. Pull latest changes
cd ~/Projects/retailtwin-cockpit
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open VS Code
code .
```

---

### **Making Changes**

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes in VS Code
# Edit files, save, see live reload

# 3. Test your changes
# Check browser, test features

# 4. Commit changes
git add .
git commit -m "Add your feature description"

# 5. Push to GitHub
git push origin feature/your-feature-name

# 6. Create Pull Request on GitHub
```

---

## 🆘 Getting Help

**Stuck?** Here's where to look:

1. **Project Documentation**: `/docs` folder
2. **Component Examples**: Look at existing components in `src/components/`
3. **Official Docs**:
   - Vite: https://vitejs.dev
   - React: https://react.dev
   - Supabase: https://supabase.com/docs
   - shadcn/ui: https://ui.shadcn.com

4. **Ask Team**: (Slack, email, etc.)

---

## ✅ Checklist: Ready to Code

Before you start coding, ensure:

- ☐ All tools installed (Node, Git, VS Code)
- ☐ Repository cloned
- ☐ Dependencies installed (`npm install` succeeded)
- ☐ `.env.local` configured with Supabase credentials
- ☐ Dev server runs (`npm run dev` works)
- ☐ Dashboard loads in browser
- ☐ VS Code open with project

**If all checked**, you're ready to code! 🎉

---

## 🎯 Your First Task

Try this to familiarize yourself:

1. **Open** `src/components/KPICard.tsx` in VS Code
2. **Find** the line with `className="text-2xl font-bold"`
3. **Change** `text-2xl` to `text-3xl`
4. **Save** the file (`Cmd + S`)
5. **Check** browser - KPI numbers should be bigger!
6. **Revert** change: `Cmd + Z`, save again

**Congrats!** You just made your first change and saw live reload in action.

---

**Welcome to the RetailTwin Cockpit team!** 🚀
