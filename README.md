# Adunni

**Digital ajo/esusu savings circles, mobile-first web app.**

Ajo (Yoruba) or esusu is a rotating savings group common across Nigeria and West Africa. A group of people each contribute a fixed amount every week or month, and each cycle one member takes home the whole pot. It runs on trust, so it usually depends on one organizer keeping track of everything in a notebook or a WhatsApp group.

Adunni puts that whole cycle in one place: create a circle, invite members with a code, agree on the payout order, track who has paid each cycle, and pay out the pot in turn.

> **Live demo:** _coming soon_
> **Payments run in test mode.** No real money moves; see [Payments](#payments-test-mode).

<!-- Add screenshots here: Home, Circle detail, Pay, Wallet -->

## Features

**Circles**
- Create a circle with a contribution amount, weekly or monthly frequency, and number of members
- Invite people with a 6-character code (copy or share sheet)
- While the circle is forming, the organizer can reorder the payout list, remove members, or edit the terms; members can leave
- Start the circle on a chosen date, optionally shuffling the payout order. This creates the full schedule: one cycle per member with due dates and recipients
- Track each cycle: who has paid, what's been collected, what's due or overdue
- Organizer closes each cycle once the pot is paid out; the circle completes after the last one

**Money**
- Wallet with test top-ups and a full activity log (top-ups, contributions, payouts) with references
- Pay a contribution from the wallet or by (simulated) bank transfer
- When a cycle closes, the collected pot is credited to the recipient's wallet
- Organizer can also mark cash payments as received

**Overview**
- Home dashboard: total saved, progress against your commitment, contributions due this cycle, and your next payout
- Groups list with search and Active / Forming / Completed filters
- Contribution history with paid and outstanding totals, filterable by circle
- Profile settings

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS v4, lucide-react icons |
| Backend | Supabase (Postgres, Auth, Row Level Security, PL/pgSQL functions) |
| Tooling | oxlint |

There is no separate API server. The frontend talks to Supabase directly, and anything that must be trusted runs inside Postgres.

## Engineering highlights

**Security enforced by the database, not the UI.** Every table has Row Level Security. Users can only read circles they belong to, and can only see the profiles of people who share a circle with them.

**Money logic lives in transactional Postgres functions.** Paying a contribution, topping up, and paying out a cycle are `security definer` functions that check who is calling, validate state, and update balances and records in a single transaction. Clients cannot write to wallet balances or contribution status directly; triggers reject those writes.

**Money is stored as integers in kobo** (1 naira = 100 kobo), never as floating-point numbers, to avoid rounding errors.

**The circle lifecycle is a state machine in the database.** `draft → active → completed`. The terms of a circle (amount, frequency, size) are locked once it starts, payout order is locked, and only the organizer can advance cycles.

**Joining by invite code without leaking data.** Groups are private to members, so joining goes through a function that validates the code, checks capacity and duplicate membership, and assigns the next payout position, without giving the caller read access to other groups.

**A recursive RLS bug, fixed.** The first membership policy queried `group_members` from inside a policy on `group_members`, which Postgres rejects as infinite recursion. It's resolved with a `security definer` helper; see [`0003_fix_group_members_recursion.sql`](supabase/migrations/0003_fix_group_members_recursion.sql).

## Data model

```
profiles ─┬─< group_members >── groups
          │        │               │
          │        │               └─< cycles (one per member; recipient + due date)
          │        │                      │
          │        └──────────────< contributions (one per member per cycle)
          │
          └─< wallet_transactions (top-ups, contributions, payouts)
```

| Table | Purpose |
| --- | --- |
| `profiles` | One per user, created automatically on sign-up; holds wallet balance |
| `groups` | A circle: amount, frequency, size, status, current cycle, invite code |
| `group_members` | Membership and each member's payout position |
| `cycles` | One per payout turn: recipient, due date, paid-out flag |
| `contributions` | One per member per cycle: status, method, reference |
| `wallet_transactions` | Ledger of every wallet movement with the balance after it |

All schema changes are in [`supabase/migrations`](supabase/migrations), in order.

## Payments (test mode)

Payments are simulated so the full flow can be demonstrated without a payment provider:

- **Wallet top-ups** add test funds (capped at ₦1,000,000 per top-up)
- **Wallet payments** deduct the balance and fail if funds are insufficient
- **Bank transfer** shows a test account and simulates confirmation
- **Payouts** credit the recipient's wallet with what was actually collected

All of this runs through the same database functions a real integration would use. The next step is swapping the mock for a provider such as Paystack or Flutterwave, confirming payments through their webhooks.

## Running locally

**Requirements:** Node.js 20+ and a free [Supabase](https://supabase.com) project.

1. Install dependencies
   ```bash
   npm install
   ```
2. Create `.env.local` from the example and add your Supabase project URL and anon key (Project Settings → API)
   ```bash
   cp .env.example .env.local
   ```
3. Set up the database: in the Supabase SQL Editor, run each file in `supabase/migrations` **in order** (`0001` through `0007`)
4. Start the dev server
   ```bash
   npm run dev
   ```
   Then open http://localhost:5173

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint with oxlint |

## Project structure

```
src/
  pages/        One component per screen (Home, GroupDetail, Pay, Wallet, …)
  components/   Shared UI (app shell, group card, status badge)
  hooks/        Data access with TanStack Query (queries and mutations)
  lib/          Supabase client, auth, toasts, confirm dialog, formatting
  types/        Database types
supabase/
  migrations/   Schema, policies, and database functions
```

## Roadmap

- Real payments via Paystack or Flutterwave
- Reminders before contributions are due (email, SMS, or WhatsApp)
- Automated tests and CI
- Dark mode
- Organizer reports and exportable statements
