# Medovaq Medical Supplies — Fullstack B2B Web Application

Welcome to the production repository for **Medovaq Medical Supplies**. This folder contains the complete, high-fidelity, and fully integrated application ready to be initialized as a Git repository (`git init`) and deployed to production.

Medovaq is an ISO 13485 certified manufacturer & exporter of surgical-grade medical products, including IV cannulas, latex-free disposable syringes, blood collection tubes, catheters, crepe bandages, and surgical gloves.

---

## 📦 Directory Structure

This repository is strictly organized and contains zero developmental clutter:

```
├── .env.example              # Template for server configuration & SMTP details
├── .gitignore                # Rules for excluding dependencies, .env, and local databases
├── server.js                 # Production-grade B2B Express server (Dynamic Routing)
├── package.json              # Node.js dependencies & execution scripts
├── package-lock.json         # Lock file for exact node version matches
├── index.html                # Homepage & Main Presentation Layer
├── about.html                # Corporate Identity & Compliance Page
├── products.html             # Premium Medical Equipment Catalog with Search/Filter
├── blogs.html                # Insights & Technical Articles dynamic listing
├── blog-detail.html          # Dynamic Blog Reader template page
├── contact.html              # B2B RFQ Lead Capture form
├── admin.html                # Operations & CRM spreadsheet reader dashboard
├── privacy.html              # Privacy policies
├── terms.html                # Service Terms & wholesale conditions
├── robots.txt                # Search engine crawler directives
├── sitemap.xml               # Dynamic XML sitemap route configuration
├── css/
│   └── style.css             # Premium glassmorphic global styling stylesheet
├── js/
│   └── main.js               # Client interactive logic, AJAC forms, CRM controllers
├── data/
│   ├── blogs.json            # Active articles database (seed data pre-populated)
│   ├── submissions.json      # Dynamic Lead storage (initialized empty)
│   ├── submissions.csv       # Excel/CSV CRM spreadsheet (initialized with headers)
│   └── newsletter.json       # Subscriber lists database (initialized empty)
├── images/
│   ├── certs/                # Certification logo badges (FDA, CE, ISO, WHO GMP)
│   └── ...                   # Medical device transparent renders and maps
└── syringe-promo/            # Specialized campaign landing page
    ├── index.html            # Syringe-specific high-converting sales page
    └── css/
        └── style.css         # Promotional custom landing page styling
```

---

## 🚀 Quick Start (Local Setup)

To execute the Medovaq application on your machine:

1. **Install Node.js** (v16.0.0 or higher recommended).
2. **Open your terminal** in this directory.
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Setup Environment Credentials**:
   - Copy `.env.example` into a new file named `.env`:
     ```bash
     cp .env.example .env
     ```
   - Customize your credentials (e.g., set your secure `ADMIN_PASSWORD`).
5. **Launch the Server**:
   * For production launch:
     ```bash
     npm start
     ```
   * For active development (hot reloading):
     ```bash
     npm run dev
     ```
6. **Access the portal**: Open `http://localhost:5000` in your web browser.

---

## 🛠️ Configuring Dynamic Pipelines

The website is equipped with a powerful B2B CRM pipeline and dynamic content engines managed by `server.js`:

### 1. Request for Quote (RFQ) Form
When a global distributor fills out the RFQ form on the `contact.html` or campaign pages, the Express server:
- Assigns a unique reference ID (e.g., `RFQ-KR89X7P`).
- Persists the lead details inside `data/submissions.json` (asynchronous JSON database).
- Synchronously appends the sanitized fields as a new row in `data/submissions.csv` (Excel-compliant CRM spreadsheet).
- Dispatches transactional emails (using **Nodemailer**) if SMTP is configured.

### 2. SMTP Transactional Mail
To activate automated email notifications (alerting your sales team of new leads and emailing professional receipts to clients), open `.env` and fill in your SMTP relay parameters:
```ini
SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_USER=your_username@provider.com
SMTP_PASS=your_secure_password
SMTP_FROM=sales@medovaq.com
RECEIVER_EMAIL=leads@medovaq.com
```
*If SMTP is unconfigured (blank), the server will safely bypass email dispatch, log a warning, and store all data locally without crashing.*

### 3. CRM Dashboard & Blog Panel (`admin.html`)
Medovaq includes a built-in admin dashboard accessible at `/admin` (mapped to `admin.html`).
- **Authorization**: Protected via base64 bearer token logic. Enter the password matching your `.env` value (Default: `login777`).
- **Features**:
  - Live preview and download of the consolidated `submissions.csv` CRM spreadsheet.
  - Interactive form to compose, upload images, and publish new dynamic blogs instantly.
  - Table showing active articles with individual deletion capability.

---

## ☁️ Deployment Guide

### Option A: Fullstack Deployment (Recommended)
To keep the RFQ forms, CRM dashboard, and blog publishing operations alive, deploy this application to a cloud host supporting **Node.js**:

#### Deploying on Render (render.com):
1. Create a free account on **Render** and link your GitHub repository.
2. Select **New Web Service**.
3. Configure the following parameters:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Go to the **Environment** tab in Render and add the environment variables from `.env.example` (especially `ADMIN_PASSWORD` and SMTP settings if using emails).
5. Click **Deploy**. Render will host your site on a secure HTTPS domain!

*(Similar procedures apply for hosting on **Railway.app**, **Heroku**, or a custom **Linux VPS** using PM2 for daemon processes).*

---

### Option B: Static Presentation Deployment
If you only need a static showcase and plan to route forms or dynamic items to a external API/Form provider later:
1. **GitHub Pages**: You can publish the repository directly. Keep in mind that static hosting does not run `server.js`.
2. **HTML Navigation**: The static pages contain natural paths. If deploying as static files, navigation is optimized via individual `.html` redirects, which are supported naturally by standard CDNs (Vercel, Netlify, Github Pages).
3. **Forms**: You can replace the form action endpoint in `js/main.js` from `/api/contact` to form services like **Formspree** or **Getform** for static compliance.

---

## 🔒 Security Best Practices
- **Change Default Passwords**: Never run in production with `ADMIN_PASSWORD=login777`. Update this in your `.env` configuration on Render/VPS.
- **Git Safety**: The `.gitignore` file is pre-configured to ensure local inquiries inside `data/*.csv` or sensitive configuration files do not get committed to public repositories.

---

*Medovaq Medical Supplies — Global Supplies, Uncompromised Reliability.*
