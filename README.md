# Eid E-Commerce Platform

A fully configurable, white-label Next.js storefront built for Bangladeshi fashion and cosmetics businesses during Eid and Ramadan seasons. Every color, font, product, and payment credential is managed through a visual admin dashboard — no code changes required after deployment.

---

## What's Included

- **Storefront** — Mobile-first PWA with hero slider, product catalog, cart, guest checkout (bKash / Nagad / Rocket / COD), wishlist, blog, and WhatsApp order integration
- **Admin Dashboard** — Theme editor, homepage section ordering, banner management, product/order/promo/review/blog management, and sales analytics
- **Bilingual** — Full Bengali and English UI, switchable by visitors
- **Zero hardcoding** — All content, colors, and credentials live in the database

---

## Prerequisites

Before you begin, make sure you have the following installed or available:

| Requirement | Version | Where to get it |
|---|---|---|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 9+ (comes with Node 20) | Included with Node.js |
| Git | Any recent version | [git-scm.com](https://git-scm.com) |
| PostgreSQL database | 15+ | Local install, [Supabase](https://supabase.com) (free), or [Neon](https://neon.tech) (free) |
| Cloudinary account | Free tier | [cloudinary.com](https://cloudinary.com) — free tier is sufficient |

> **Recommended for beginners:** Use [Neon](https://neon.tech) for a free managed PostgreSQL database and [Cloudinary](https://cloudinary.com) for image storage. Both have generous free tiers and require no local setup.

---

## Step 1 — Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/your-username/eid-ecommerce.git
cd eid-ecommerce
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

This will install all packages and automatically run `prisma generate` to set up the database client. You should see a success message from Prisma at the end.

---

## Step 3 — Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Now open the `.env` file in any text editor and fill in each value. Here is what each variable means:

---

### `DATABASE_URL`

Your PostgreSQL connection string. The format is:

```
postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```

**Local PostgreSQL (if installed on your machine):**
```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/eid_store"
```

**Neon (recommended for beginners):**
1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Go to your project dashboard and click **Connection string**
4. Select **Pooled connection** and copy the string — it will look like:
```
DATABASE_URL="postgresql://username:password@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Supabase:**
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Project Settings → Database**
4. Under **Connection string**, select **Transaction pooler** and copy the URI:
```
DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

---

### `NEXTAUTH_URL`

The full URL where your app runs. Use `http://localhost:3000` for local development.

```
NEXTAUTH_URL="http://localhost:3000"
```

When you deploy to production, change this to your actual domain (e.g. `https://yourstore.vercel.app`). There must be **no trailing slash**.

---

### `NEXTAUTH_SECRET`

A random secret used to secure login sessions. Generate one by running this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value:

```
NEXTAUTH_SECRET="paste-the-output-here"
```

> **Important:** Never share this value or commit it to version control. If it leaks, regenerate it and redeploy.

---

### Cloudinary Variables

Cloudinary stores all uploaded images (product photos, banners, logos).

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. After signing in, you land on the **Dashboard** — your **Cloud name** is shown at the top
3. Go to **Settings → Access Keys** to find your **API Key** and **API Secret**

Fill in all four values:

```
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz123456"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
```

> Note: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` should be the **same value** as `CLOUDINARY_CLOUD_NAME`. The `NEXT_PUBLIC_` prefix makes it available in the browser for displaying images.

---

Your completed `.env` file should look like this (with your real values):

```
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="abc123..."
CLOUDINARY_CLOUD_NAME="my-store"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="secret123"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="my-store"
```

---

## Step 4 — Create Database Tables

This command reads your database schema and creates all required tables automatically. You only need to run this once (and again if you ever reset your database).

```bash
npx prisma db push
```

You should see output listing each table being created, ending with:

```
Your database is now in sync with your Prisma schema.
```

---

## Step 5 — Create Your Admin User

You need an admin account to access the dashboard. Run this command in your terminal, replacing the email and password with your own:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
p.user.create({
  data: {
    email: 'admin@yourstore.com',
    password: bcrypt.hashSync('your-secure-password', 10),
    name: 'Admin',
    role: 'ADMIN'
  }
}).then(console.log).finally(() => p.\$disconnect())
"
```

> **Choose a strong password.** This is the only account that can access your admin dashboard.

If the command succeeds, you will see the created user object printed in the terminal.

---

## Step 6 — Run Locally

Start the development server:

```bash
npm run dev
```

Open your browser and visit:

- **Storefront:** [http://localhost:3000](http://localhost:3000)
- **Admin dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)

Sign in at [http://localhost:3000/auth/signin](http://localhost:3000/auth/signin) with the email and password you created in Step 5.

---

## Step 7 — Deploy to Vercel

[Vercel](https://vercel.com) is the recommended hosting platform for this project. It has a free tier suitable for small businesses.

### 7a — Push your code to GitHub

If you haven't already, create a GitHub repository and push your code:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### 7b — Create a Vercel project

1. Go to [vercel.com](https://vercel.com) and sign up or log in
2. Click **Add New → Project**
3. Click **Import** next to your GitHub repository
4. Vercel will detect it is a Next.js project automatically

### 7c — Add environment variables

Before deploying, you must add all your environment variables to Vercel:

1. In the Vercel project setup screen, expand **Environment Variables**
2. Add each variable one by one — the names and values are exactly the same as your `.env` file:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_URL` | Your production URL, e.g. `https://yourstore.vercel.app` |
| `NEXTAUTH_SECRET` | The secret you generated with `openssl` |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Same as `CLOUDINARY_CLOUD_NAME` |

> **Important:** Set `NEXTAUTH_URL` to your actual Vercel URL (e.g. `https://yourstore.vercel.app`), not `localhost`.

### 7d — Set Node.js version

1. In your Vercel project, go to **Settings → General**
2. Scroll to **Node.js Version** and select **20.x**

### 7e — Deploy

Click **Deploy**. Vercel will build and deploy your project. The first deployment takes about 2–3 minutes.

Once complete, visit your Vercel URL to confirm the storefront loads.

### 7f — Initialize the production database

After the first deploy, you need to create the database tables in your production database. Run this command on your local machine (it uses your `.env` DATABASE_URL which should point to your production database, or update it temporarily):

```bash
npx prisma db push
```

Then create your production admin user (same command as Step 5, using your production DATABASE_URL).

---

## Step 8 — First-Time Admin Setup

After deploying, log in to your admin dashboard and complete the following setup steps:

### Configure store information

1. Go to **Admin → Settings**
2. Enter your store name, upload your logo and favicon
3. Add your WhatsApp number in the format `01XXXXXXXXX` (11 digits, starting with `01`)
4. Add your contact email, phone number, and address
5. Add your Facebook and Instagram links
6. Click **Save**

### Enable payment methods

1. Still in **Admin → Settings**, scroll to **Payment & SMS**
2. Toggle on the payment methods you accept (bKash, Nagad, Rocket, COD)
3. Enter the merchant phone number for each mobile banking method
4. Click **Save**

Customers will see exactly these payment options at checkout. If a method has no merchant number, it will be hidden automatically.

### Upload hero banner slides

1. Go to **Admin → Content**
2. Click **Add New Banner**
3. Upload a banner image, add a title and CTA button text
4. Click **Save**

At least one active banner is needed for the homepage slider to display.

### Add product categories

1. Go to **Admin → Products**
2. Before adding products, you need at least one category
3. Categories are managed via the API or can be seeded — contact your developer if you need help with this initial setup

### Add your first product

1. Go to **Admin → Products → New Product**
2. Fill in the product name (English and Bengali), select a category, add a price
3. Upload at least one product image
4. Click **Save**

### Customize your theme

1. Go to **Admin → Theme**
2. Choose a preset (Green-Gold for Eid, Luxury Pink for Ramadan, or Minimalist White)
3. Adjust individual colors if needed
4. Click **Save** — the storefront will update within 30 seconds

---

## Troubleshooting

### `prisma: command not found`

Run `npm install` to reinstall dependencies. The `prisma` CLI is installed as a local package.

```bash
npm install
```

### `DATABASE_URL` environment variable error

Check that your connection string is in the correct format:
```
postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```
For Neon and Supabase, ensure you copied the **pooled connection** string. For local PostgreSQL, confirm your username, password, and database name are correct.

### Images not loading after deployment

1. Verify all four Cloudinary environment variables are set correctly in Vercel
2. Confirm `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set (not just `CLOUDINARY_CLOUD_NAME`)
3. Check that your Cloudinary cloud name contains no typos — it is case-sensitive

### Cannot sign in to admin dashboard

1. Confirm the admin user was created successfully (Step 5 should have printed the user object)
2. Check that `NEXTAUTH_SECRET` is set in your environment (locally in `.env`, in production in Vercel)
3. Check that `NEXTAUTH_URL` matches the URL you are accessing exactly (protocol and domain must match)
4. Try running the admin user creation command again — if it throws a unique constraint error, the user already exists

### Blank page or build errors after deployment

1. Check the **Vercel deployment logs** for specific error messages (Vercel Dashboard → your project → Deployments → click the failed deployment)
2. The most common cause is a missing environment variable — verify all 7 variables are set in Vercel
3. Ensure Node.js version is set to **20.x** in Vercel project settings

### SMS confirmations not sending

SMS is optional. To enable it, configure your SMS gateway credentials in **Admin → Settings → Payment & SMS**. The platform supports any HTTP-based Bangladeshi SMS gateway (bd-SMS, Twilio-compatible APIs). Leave these fields blank if you do not use SMS — orders will still be created normally.

### Theme changes not appearing immediately

Theme changes are cached for up to 30 seconds. Wait 30 seconds and hard-refresh your browser (`Ctrl+Shift+R` on Windows, `Cmd+Shift+R` on Mac).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server at `http://localhost:3000` |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server (after `build`) |
| `npm run lint` | Run ESLint to check for code issues |
| `npx prisma db push` | Sync your database schema with `prisma/schema.prisma` |
| `npx prisma studio` | Open a visual database browser at `http://localhost:5555` |

---

## Project Structure (Overview)

```
eid-ecommerce/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── app/
│   │   ├── (store)/           # Customer-facing pages
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── api/               # API route handlers
│   │   └── auth/              # Sign-in page
│   ├── components/
│   │   ├── admin/             # Admin UI components
│   │   ├── layout/            # Navbar, Footer, Sidebar
│   │   ├── storefront/        # Customer-facing components
│   │   └── ui/                # Reusable UI primitives
│   ├── context/               # React Context providers
│   └── lib/                   # Utilities, Prisma client, helpers
├── .env.example               # Environment variable template
└── README.md                  # This file
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Database:** PostgreSQL 15 via Prisma ORM
- **Authentication:** NextAuth.js v5 (JWT sessions)
- **Image storage:** Cloudinary
- **Styling:** Tailwind CSS with dynamic CSS custom properties
- **Animations:** Framer Motion
- **PWA:** next-pwa (installable on Android)

---

## License

MIT License — free for personal and commercial use. You may use this source code to build and sell storefronts for clients. You may not resell the source code itself as a template product.

---

## Support

For deployment help, open an issue on the GitHub repository. For urgent support, contact the developer via WhatsApp (number provided at purchase).