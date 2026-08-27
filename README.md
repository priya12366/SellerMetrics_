# SellerMetrics — E-Commerce Seller Management & Analytics System

A full-stack web application that helps an online marketplace seller turn raw
**order** and **settlement/payment** exports into a clear operational picture:
dashboards, reconciliation between orders and payouts, returns/RTO analysis,
product-level breakdowns, product-cost management, profitability estimation,
period comparisons and consolidated reports.

Everything shown in the UI is computed from data the user uploads into a MySQL
database — there is no mock or hard-coded business data. Where a value cannot be
reliably derived from the uploaded data (for example, profit when a product's
cost has not been configured), the app deliberately shows **N/A** instead of
inventing a number.

---

## Table of Contents

1. [Main Features](#main-features)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Backend API Overview](#backend-api-overview)
5. [Database Setup](#database-setup)
6. [Environment Setup](#environment-setup)
7. [Windows Setup (step by step)](#windows-setup-step-by-step)
8. [Port Conflict Troubleshooting](#port-conflict-troubleshooting)
9. [Frontend Setup](#frontend-setup)
10. [Backend Setup](#backend-setup)
11. [Production Build](#production-build)
12. [Login / Demo Information](#login--demo-information)
13. [Project Structure](#project-structure)

---

## Main Features

The user-facing application has **11 working sections**, all reachable from the
dashboard sidebar:

| # | Section | What it does |
|---|---------|--------------|
| 1 | **Dashboard** | Headline KPIs (gross sales, settlement received, gross profit, margin), a profit snapshot, a monthly view and a product-performance summary — all from uploaded data. |
| 2 | **Upload Seller Data** | Upload your marketplace **orders** file and **settlement/payment** file. Rows are parsed and written to MySQL; each upload is tracked in import history. |
| 3 | **Orders** | Browse every uploaded order with its details. |
| 4 | **Settlements** | Browse settlement/payment rows actually paid out by the platform. |
| 5 | **Returns & RTO** | Returns and Return-To-Origin analysis derived from order status. |
| 6 | **Products** | Per-product view across your uploaded catalogue/sales. |
| 7 | **Product Costs** | Configure each SKU's **Cost Per Unit** (COGS). These values drive all profit/margin calculations. |
| 8 | **Period Analysis** | Compare a chosen month/period: gross sales, settlement, orders, and (when costs are configured) profit and margin. |
| 9 | **Profitability** | Estimated gross profit and per-product margins, based on your configured costs and actual settlement amounts. Flags loss-making and cost-missing products. |
| 10 | **Analytics** | Reconciliation summary, matched/unmatched breakdown, historical trend and profit summary. |
| 11 | **Reports** | Consolidated read-only report: processing overview, financial summary (matched orders only), known fees/deductions, reconciliation quality and a monthly breakdown. |

> **Forecasting / ML is NOT part of the final user-facing product.**
> There is no "Forecasting" item in the sidebar. Some machine-learning helper
> code remains in the backend (`app/services/forecast_service.py` and the
> `/api/ml/forecast` route) but it is intentionally **not surfaced anywhere in
> the UI**.

### Profit / Margin behavior (important)

Profit and margin are only shown as numbers when the underlying **product costs
(COGS) are fully configured** for the SKUs in scope. If any contributing SKU is
missing its Cost Per Unit, the app shows **N/A** for Profit and Margin (on the
Dashboard, Reports monthly breakdown, Period Analysis and Profitability) rather
than assuming a cost of zero and reporting misleading "100% margin" profit.
Gross Sales, Settlement and order counts are always real values.

---

## Technology Stack

**Frontend**
- **React 19**
- **Vite 8** (dev server + build tool)
- **React Router 7** (routing)
- **Tailwind CSS 3** (styling)
- **Recharts 3** (charts)
- **lucide-react** (icons)
- **framer-motion** (animation)

**Backend**
- **Python 3.12**
- **FastAPI** (REST API) + **Uvicorn** (ASGI server)
- **SQLAlchemy 2** (ORM) + **PyMySQL** (MySQL driver)
- **Pydantic 2** (request/response validation)
- **python-jose** (JWT) + **bcrypt** (password hashing)
- **openpyxl** (parsing settlement `.xlsx` uploads), stdlib `csv` (orders)
- **python-multipart** (file-upload form handling)
- **pandas / numpy / scikit-learn** (internal analytics + the non–user-facing forecasting service)

**Database**
- **MySQL** (schema `sellermetrics`)

**Auth**: JWT bearer tokens (HS256). The token is stored in the browser's
`localStorage` and sent as `Authorization: Bearer <token>` on API calls.

---

## Architecture

```
   ┌─────────────────────────┐
   │      React Frontend      │   Vite dev server (http://localhost:5173)
   │  (pages, charts, tables) │
   └────────────┬─────────────┘
                │  HTTP + JWT  (fetch → http://127.0.0.1:8000)
                ▼
   ┌─────────────────────────┐
   │     FastAPI Backend      │   Uvicorn (http://127.0.0.1:8000)
   │  routers under /api/...  │
   └────────────┬─────────────┘
                │  ORM
                ▼
   ┌─────────────────────────┐
   │       SQLAlchemy         │   models + sessions
   └────────────┬─────────────┘
                │  mysql+pymysql://
                ▼
   ┌─────────────────────────┐
   │      MySQL Database      │   schema: sellermetrics
   └─────────────────────────┘
```

**Data flow**

1. **Upload** — On the *Upload Seller Data* page the user submits an orders file
   (CSV) and a settlement/payment file (`.xlsx`). The backend upload endpoints
   (`POST /api/orders/upload`, `POST /api/payments/upload`) parse each row and
   persist it via SQLAlchemy into the `orders` / `payments` tables, and record
   the upload in `import_history`.
2. **Storage** — All business data lives in MySQL. Tables are created
   automatically on backend startup (see [Database Setup](#database-setup)).
3. **Calculation** — The analytics/report endpoints read the stored rows on
   demand and compute derived values: matching orders to payments, gross vs.
   settlement gaps, returns/RTO, monthly/period aggregates, and profitability
   (settlement − configured COGS). Profit/margin resolve to **N/A** when COGS is
   incomplete for the scope being computed.
4. **Display** — The React pages call these endpoints (base URL
   `http://127.0.0.1:8000`) and render KPIs, tables and charts.

> **Important — API base URL is fixed to port 8000.**
> The frontend calls the backend at **`http://127.0.0.1:8000`** (hard-coded in
> the pages). Run the backend on **port 8000** so the two line up. This is the
> normal, expected setup.

---

## Backend API Overview

All endpoints are prefixed with `/api/...` (except the two root health checks).
Endpoints below marked *(auth)* require a valid `Authorization: Bearer` token.

**Health**
- `GET /` — liveness check (`{"message": "SellerMetrics Backend Running"}`).
- `GET /database-status` — verifies the MySQL connection.

**Auth** — `app/routes/auth.py`
- `POST /api/auth/register` — create a new user (email + password).
- `POST /api/auth/login` — verify credentials, return a JWT access token.
- `GET  /api/auth/me` *(auth)* — return the current user's profile.

**Orders** — `app/routes/orders.py`
- `POST /api/orders/upload` *(auth)* — upload & parse the orders file.
- `GET  /api/orders` *(auth)* — list uploaded orders.

**Payments / Settlements** — `app/routes/payments.py`, `app/routes/settlements.py`
- `POST /api/payments/upload` *(auth)* — upload & parse the settlement `.xlsx`.
- `GET  /api/settlements` *(auth)* — list settlement/payment rows.

**Product Costs** — `app/routes/product_costs.py`
- `GET    /api/product-costs/` *(auth)* — list configured SKU costs.
- `GET    /api/product-costs/summary` *(auth)* — how many SKUs have / are missing a cost.
- `POST   /api/product-costs/` *(auth)* — create a SKU cost.
- `PUT    /api/product-costs/{cost_id}` *(auth)* — update a SKU cost.
- `DELETE /api/product-costs/{cost_id}` *(auth)* — remove a SKU cost.

**Analytics** — `app/routes/analytics.py`
- `GET /api/analytics/matching-summary` *(auth)* — order↔payment reconciliation totals.
- `GET /api/analytics/unmatched-orders` *(auth)* — orders with no matching payment.
- `GET /api/analytics/unmatched-payments` *(auth)* — payments with no matching order.
- `GET /api/analytics/profit-summary` *(auth)* — total settlement, product cost, gross profit & margin (profit/margin = **null → N/A** when COGS incomplete).
- `GET /api/analytics/product-profitability` *(auth)* — per-product settlement, cost, estimated profit, margin (flags `has_cost`).
- `GET /api/analytics/historical-trend` *(auth)* — trend over a number of days.
- `GET /api/analytics/monthly-summary` *(auth)* — month-by-month orders, gross, settlement, returns, RTO, profit, margin (profit/margin = **null → N/A** for any month missing a SKU cost).
- `GET /api/analytics/available-periods` *(auth)* — the periods present in the data.
- `GET /api/analytics/period-analysis` *(auth)* — totals for a chosen year/month.

**Reports** — `app/routes/reports.py`
- `GET /api/reports/summary` *(auth)* — processing + matched financial totals.
- `GET /api/reports/matching-summary` *(auth)* — reconciliation + data-quality metrics.
- `GET /api/reports/unmatched-orders` *(auth)* — unmatched orders detail.
- `GET /api/reports/unmatched-payments` *(auth)* — unmatched payments detail.

**Import History** — `app/routes/history.py`
- `GET /api/import-history` *(auth)* — record of past uploads.

**Machine Learning (NOT user-facing)** — `app/routes/ml.py`
- `GET /api/ml/forecast` — forecasting helper. Retained in the backend but not
  exposed anywhere in the UI.

> Interactive API docs are available at **`http://127.0.0.1:8000/docs`** (Swagger
> UI, provided automatically by FastAPI) once the backend is running.

---

## Database Setup

The backend uses **MySQL** with a schema named **`sellermetrics`**.

1. **Install MySQL** (MySQL Community Server 8.x) and make sure the MySQL
   service is running. On Windows you can install via the MySQL Installer, or
   use XAMPP/WAMP if you prefer.

2. **Create the database** (one time). In a MySQL client / MySQL Shell:
   ```sql
   CREATE DATABASE sellermetrics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Credentials** are read from `backend/.env` (see below). By default the app
   connects as user `root` on `localhost:3306` to the `sellermetrics` schema.
   The connection string is assembled in `backend/app/config.py` as:
   ```
   mysql+pymysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>
   ```

4. **Tables are created automatically.** On startup, `backend/app/main.py` calls
   `Base.metadata.create_all(bind=engine)`, which creates any missing tables
   (`users`, `orders`, `payments`, `import_history`, `product_costs`).
   **No manual migrations are required** — just create the empty `sellermetrics`
   schema and start the backend.

5. **Load your data through the app**, not by hand: log in, then use the
   *Upload Seller Data* page to import your orders and settlement files.

---

## Environment Setup

Environment variables are read from **`backend/.env`**. A template is provided
at the project root: **`.env.example`**.

Copy the template and fill in your own values (see the [Windows steps](#windows-setup-step-by-step)):

```
Windows:       copy .env.example backend\.env
macOS/Linux:   cp .env.example backend/.env
```

Variables (names must match exactly — they map to `backend/app/config.py`):

| Variable | Meaning | Example |
|----------|---------|---------|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | Schema name | `sellermetrics` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | *(your password)* |
| `SECRET_KEY` | JWT signing secret | *(long random string)* |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `30` |

> **Never commit your real `backend/.env`.** It holds your DB password and JWT
> secret and is already excluded by `.gitignore`.

---

## Windows Setup (step by step)

Open **Command Prompt** (or PowerShell) and run the following. Commands assume
you extracted the ZIP to a folder called `SellerMetrics`.

**1. Extract the project** and enter it:
```bat
cd path\to\SellerMetrics
```

**2. Create your environment file** (from the template at the project root):
```bat
copy .env.example backend\.env
```
Then open `backend\.env` in a text editor and set `DB_USER`, `DB_PASSWORD` and a
`SECRET_KEY`.

**3. Start MySQL** and make sure the `sellermetrics` schema exists:
```sql
CREATE DATABASE IF NOT EXISTS sellermetrics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**4. Set up the backend (Python 3.12):**
```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**5. Start the FastAPI backend on port 8000** (from the `backend` folder, with
the venv activated):
```bat
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Verify it is up: open <http://127.0.0.1:8000/database-status> — you should see
`{"status":"connected", ...}`. API docs are at <http://127.0.0.1:8000/docs>.

**6. Set up the frontend** (open a **second** terminal):
```bat
cd path\to\SellerMetrics\frontend
npm install
```

**7. Start the Vite dev server:**
```bat
npm run dev
```

**8. Open the app** in your browser at the URL Vite prints (usually
<http://localhost:5173>). Register a user, then upload your data.

> Keep **both** terminals running: the backend on port 8000 and the frontend dev
> server. The frontend talks to the backend at `http://127.0.0.1:8000`.

---

## Port Conflict Troubleshooting

**If port 8000 is already occupied, stop the application using that port before
starting SellerMetrics** (the frontend expects the backend at
`http://127.0.0.1:8000`).

On Windows, find and stop the process holding port 8000:

```bat
netstat -ano | findstr :8000
```
The last column is the **PID**. Stop it with:
```bat
taskkill /PID <PID> /F
```

Then start the backend again on port 8000. (The Vite dev server will
automatically pick the next free port — e.g. 5174 — if 5173 is busy; the backend
already allows both 5173 and 5174 for CORS.)

---

## Frontend Setup

From the `frontend` folder:

```bat
npm install
npm run dev
```

- Dev server URL: **http://localhost:5173** (or 5174 if 5173 is taken).
- The frontend calls the backend at **http://127.0.0.1:8000**.
- Available scripts (see `frontend/package.json`): `dev`, `build`, `preview`, `lint`.

---

## Backend Setup

From the `backend` folder, using **Python 3.12**:

```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- The server must run **from inside the `backend` folder** so that `app` is
  importable and `python-dotenv` picks up `backend\.env`.
- On macOS/Linux, activate the venv with `source venv/bin/activate` instead of
  `venv\Scripts\activate`.

> **Note:** the Python virtual environment (`venv/`) is **not** included in the
> ZIP — create it fresh with the commands above.

---

## Production Build

To create and preview an optimized frontend build:

```bat
cd frontend
npm run build
```
This outputs static assets to `frontend/dist/`.

To preview the production build locally **on an origin the backend already
allows** (5174 is in the backend CORS list):

```bat
npm run preview -- --port 5174
```
Then open <http://localhost:5174> with the backend running on port 8000.

> If you serve the build on a different origin/port, add that origin to the CORS
> `allow_origins` list in `backend/app/main.py`.

---

## Login / Demo Information

No demo credentials are shipped with this project.

**Create/register a user locally or use your own database credentials.** Start
the backend and frontend, open the app, go to **Register**, create an account,
then log in and upload your data.

---

## Project Structure

```
SellerMetrics/
├── frontend/                 # React + Vite application (the UI)
│   ├── src/
│   │   ├── pages/            # Dashboard, Orders, Settlements, Reports, ...
│   │   ├── components/       # shared UI pieces
│   │   ├── styles/           # CSS
│   │   ├── assets/           # images/icons used by the app
│   │   ├── App.jsx           # routes
│   │   └── main.jsx          # entry point
│   ├── public/               # static files served as-is
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                  # FastAPI application (the API)
│   ├── app/
│   │   ├── main.py           # app entry, CORS, table creation, routers
│   │   ├── config.py         # reads .env, builds the DB URL
│   │   ├── database.py       # SQLAlchemy engine/session
│   │   ├── models/           # SQLAlchemy models (users, orders, payments, ...)
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── routes/           # API routers (auth, orders, analytics, reports, ...)
│   │   ├── services/         # report + (non-UI) forecast services
│   │   └── utils/            # security helpers (JWT, hashing)
│   └── requirements.txt      # Python dependencies (Python 3.12)
│
├── README.md
├── .gitignore
└── .env.example              # copy to backend/.env and fill in
```

**Not included in the package** (create/generate locally): `node_modules/`,
`frontend/dist/`, the Python `venv/`, `__pycache__/`, and any real `.env`.
