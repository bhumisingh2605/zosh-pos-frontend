# Zosh POS — Frontend

A React (Vite) frontend for the Zosh POS Spring Boot backend. Covers auth, store/branch
management, products, inventory, customers, employees, a cashier POS terminal, order
history, refunds, and shift reports.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your backend if it's not on :5000
npm run dev
```

The app runs at `http://localhost:5173` by default — this origin is already allowed by
the backend's CORS config (`SecurityConfig.java`), so no backend changes are needed as
long as you run `npm run dev` on the default port.

Make sure your Spring Boot backend is running (default `http://localhost:5000`, port
set in `application.properties`).

## First-time flow

1. **Sign up** at `/signup` as a "Store admin" — this is a normal account with no store
   attached yet.
2. Log in — you'll land on **Stores**, prompted to create your store.
3. Add a **branch** under Branches.
4. Add a **category**, then **products** in that category.
5. Add **stock** for those products in Inventory (per branch).
6. Open the **POS terminal** to start a shift and ring up a sale.
7. Employees (managers/cashiers) are added from the **Employees** page — they log in
   with the email/password you set for them there, not through the signup page.

## Roles

| Role | Scope |
|---|---|
| `ROLE_ADMIN` | Platform-wide — reviews and moderates all stores |
| `ROLE_STORE_ADMIN` / `ROLE_STORE_MANAGER` | One store, all its branches |
| `ROLE_BRANCH_MANAGER` | One branch |
| `ROLE_BRANCH_CASHIER` | One branch, POS-focused |

The sidebar and dashboard adapt to whichever role is logged in.

## Structure

```
src/
  api/          one file per backend controller (axios calls)
  store/        auth state, workspace (active store/branch) context, toasts
  components/   shared UI (buttons, tables, modals, form fields)
  layouts/      AdminLayout (sidebar shell)
  pages/        one folder per feature area
```

## Build

```bash
npm run build
```

Outputs a static `dist/` folder you can deploy anywhere (Netlify, Vercel, S3, nginx, etc).
