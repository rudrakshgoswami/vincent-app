# Vincent: what it does, and how to run and test it

Written for someone picking the project up cold. Everything below was checked
against the code, not remembered.

---

## Contents

1. [What the app is](#1-what-the-app-is)
2. [How a request flows](#2-how-a-request-flows)
3. [Every page](#3-every-page)
4. [Every API endpoint](#4-every-api-endpoint)
5. [The five flows that matter](#5-the-five-flows-that-matter)
6. [Running it locally](#6-running-it-locally)
7. [Testing it, step by step](#7-testing-it-step-by-step)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. What the app is

One platform doing four jobs for a restaurant business:

| | |
|---|---|
| **Restaurant** | Menu, online ordering for delivery or dine-in |
| **Tables** | Reservations from a visual floor plan, including merging tables |
| **Venues** | Event spaces with galleries, availability calendars and slot locking |
| **Catering** | Build-your-own packages with per-category limits, live counters, beverages |

Plus an admin dashboard over all of it, phone OTP auth, and Razorpay payments
split into advance and balance.

**Scale:** 123 source files, around 30,000 lines. 19 Mongoose models,
13 route groups, 28 client routes.

---

## 2. How a request flows

```
Browser (React 19 + Vite, :5173)
        |
        |  fetch, via client/src/api.js
        v
Express 5 (:5000)
        |
        |  server.js mounts 13 routers under /api
        v
Route  ->  middleware (protect / admin)  ->  controller  ->  Mongoose model
        |
        v
    MongoDB

Socket.io runs alongside, on the same HTTP server, for venue slot locks
and live availability.
```

Three React contexts hold shared state:

| Context | Holds |
|---|---|
| `AuthContext` | current user, tokens, login and logout |
| `CartContext` | the food order being built |
| `SocketContext` | the socket connection and event subscriptions |

---

## 3. Every page

### Public, no login

| Path | What it is |
|---|---|
| `/` | Home |
| `/menu` | Restaurant menu |
| `/reservations` | Reservation landing page |
| `/contact` | Contact form |
| `/venues` | Venue listing |
| `/venues/:id` | Venue detail: gallery, amenities, policies, availability calendar, reviews |
| `/login`, `/register`, `/verify-otp` | Auth |

### Signed in, wrapped in `RequireAuth`

| Path | What it is |
|---|---|
| `/venues/:id/book` | The venue booking form |
| `/catering` | Catering package builder |
| `/order` | Food ordering |
| `/checkout` | Cart checkout |
| `/reserve-table` | Table reservation with the floor plan |
| `/my-orders` | Order history |
| `/my-venue-bookings` | Venue booking history |
| `/my-table-reservations` | Reservation history |
| `/my-messages` | Replies to contact messages |
| `/profile` | Profile, addresses, password |

### Admin, under `AdminLayout`

`/admin/login`, then `/admin/dashboard`, `/admin/orders`,
`/admin/reservations`, `/admin/menu`, `/admin/users`, `/admin/tables`,
`/admin/analytics`, `/admin/messages`, `/admin/venues`,
`/admin/venue-bookings`, `/admin/catering`, `/admin/profile`.

---

## 4. Every API endpoint

All under `/api`.

### Auth, `/api/auth`

`POST /register` · `POST /verify-otp` · `POST /resend-otp` · `POST /login` ·
`POST /logout` · `POST /refresh` · `GET /me` · `POST /forgot-password` ·
`POST /reset-password` · `GET /profile`

### User

`GET|PUT /profile` · `POST /request-update-otp` · `POST /verify-update-otp` ·
`POST /request-password-otp` · `POST /verify-password-otp` ·
`GET /orders/my-orders` · `GET /orders/:id` · `GET /table-reservations/my`

### Menu

`GET /menu` · `GET /menu/categories` · `GET /menu/items`

### Tables, `/api/tables`

`GET /` · `GET /layout` · `POST /check-availability` · `GET /:id`
Admin: `POST /admin/create` · `GET /admin/stats` · `PUT|DELETE /admin/:id` ·
`PUT /admin/:id/block`

### Table reservations, `/api/table-reservations`

`POST /create-order` · `POST /verify-payment` · `GET /my` · `GET /:id` ·
`PUT /:id/cancel` · `PUT /:id/release` · `PUT /:id/arrive`
Admin: `GET /admin/all` · `GET /admin/stats` · `PUT /admin/:id/status`

### Venues, `/api/venues`

`GET /` · `GET /:id` · `GET /:id/availability` ·
`GET /:id/monthly-availability` · `POST /check-availability` ·
`GET /catering/packages` · `GET /catering/packages/:id` · `GET /catering/extras`
Admin: full CRUD on venues, media and blocked dates, plus catering packages
and extras.

### Venue bookings, `/api/venue-bookings`

`POST /lock-slot` · `POST /release-slot` · `PUT /:id/extend-lock` ·
`POST /create-order` · `POST /verify-payment` · `GET /my` · `GET /:id` ·
`GET /:id/invoice` · `PUT /:id/cancel` · `PUT /:id/review`
Admin: `GET /admin/all` · `GET /admin/stats` · `PUT /admin/:id/status` ·
`POST /admin/:id/note` · `POST /admin/:id/record-payment`

### Catering, `/api/catering`

CRUD on `/categories`, `/packages`, `/items`, `/live-counters`, `/extras`,
`/bookings`.

### Reviews, `/api/reviews`

`/` · `/admin` · `/venue/:venueId` · `/:id`

### Contact, `/api/contact`

`GET /info` · `POST /` · `GET /my-messages`
Admin: `GET /admin/messages` · `PUT /admin/messages/:id` ·
`POST /admin/messages/:id/reply` · `DELETE /admin/messages/:id`

### Payments, `/api/payment`

`GET /key` · `POST /create-order` · `POST /verify`

### Uploads, `/api/upload`

`POST /` · `POST /profile-picture`

### Admin

User management, menu CRUD, order management, settings, stats and admin
profile with OTP-protected password change.

---

## 5. The five flows that matter

### Phone OTP sign-up

`POST /api/auth/register` creates the user and generates a six digit code,
valid ten minutes. Delivery goes Fast2SMS, then Twilio, then **a console
fallback**. With no SMS keys configured the code is printed in the server
terminal inside a box. That is how you test this locally; see
[Running it locally](#6-running-it-locally).

`POST /api/auth/verify-otp` activates the account. Access and refresh tokens
are issued, and `POST /api/auth/refresh` renews the access token.

### Venue booking with slot locking

This is the most interesting part of the system.

1. `GET /api/venues/:id/monthly-availability` paints the calendar
2. Pressing **Book Now** calls `POST /api/venue-bookings/lock-slot`, which
   takes a short-lived lock on that slot so nobody else can pay for it while
   you are paying
3. The lock is broadcast over Socket.io, so other browsers watching the same
   venue see the slot go unavailable immediately
4. `PUT /:id/extend-lock` buys more time if checkout is slow
5. `POST /create-order` then `POST /verify-payment` completes it
6. `startReservationLockCleanup()` in `server.js` sweeps expired locks

Without locking, two people on the same slot both reach payment and one of
them loses money. This is the part of the project worth talking about.

### Catering package builder

Packages have tiers. Each food category carries a `selectionLimit` and an
`isMandatory` flag, and items are linked to the tiers they are available in
via `packageIds`. The builder enforces those limits as you pick. Live
counters, beverage packages, dietary options and service styles are priced
per plate or per person and added on top.

### Table reservation

`GET /api/tables/layout` returns tables with `position`, `shape`, `area` and
`capacity`, which the client draws as a floor plan. Reservations support
merging adjacent tables for a larger group, an advance payment, a grace
period after the booked time, and an `arrive` action for staff.

### Ordering

`CartContext` holds the basket. Checkout creates a Razorpay order, verifies
the signature server side, then writes the order with an `orderNumber`,
delivery or dine-in type, prep time estimate and a cancellation trail.

---

## 6. Running it locally

### Prerequisites

Node 18 or newer, and MongoDB running locally (or an Atlas connection string).

### Backend

```bash
cd server
npm install
cp .env.example .env
```

Open `server/.env`. **Only two values are required to boot:**

```
MONGO_URI=mongodb://localhost:27017/vincent_db
JWT_SECRET=any_long_random_string
JWT_REFRESH_SECRET=a_different_long_random_string
```

Leave the SMS, email and Razorpay values as the placeholders. The app starts
without them and tells you when a feature needs them.

```bash
npm run dev          # http://localhost:5000
```

You should see `Server running on port 5000`.

### Seed the database

```bash
cd server
node scripts/seed-venues.js        # venues, service packages, catering extras
node scripts/seed-new-catering.js  # catering tiers, categories, food items
node scripts/seed-all-items.js     # restaurant menu
node scripts/create-admin.js       # admin, reads ADMIN_EMAIL / ADMIN_PASSWORD
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` first; `create-admin.js`
refuses to run without them, on purpose.

### Frontend

```bash
cd client
npm install
npm run dev          # http://localhost:5173
```

### Signing in

Seeded accounts all share the password **`Password123!`**. Emails are in
`db_export/users.json`, all on `example.com`.

**To register a new account with no SMS configured**, watch the *server*
terminal after submitting the form. You will see:

```
╔══════════════════════════════════════════════════════════╗
║         📱 SMS NOT SENT - CONSOLE FALLBACK              ║
╠══════════════════════════════════════════════════════════╣
║  🔑 OTP CODE: 123456                                     ║
╚══════════════════════════════════════════════════════════╝
```

Type that code into the verify screen.

---

## 7. Testing it, step by step

There is no automated test suite. This is the manual pass that covers every
major flow. Keep the server terminal visible throughout.

### A. Public browsing, no login

1. `http://localhost:5173` loads, hero renders, stat counters show numbers
2. **Menu** lists seeded dishes with categories
3. **Venues** lists seeded venues
4. Open a venue: gallery, amenities, policies and reviews all render
5. Move through the availability calendar; months load without errors

### B. Registration and OTP

6. **Register** with any name, a 10 digit phone and an `example.com` email
7. Check the **server terminal** for the OTP box, enter the code
8. You land signed in

### C. The bug that used to be here

9. Sign out. Open a venue and press **Book Now** while logged out
10. You should be redirected to login

This crashed before publication. `toast.error()` was called and nothing in
the project imports a toast library, so it threw a `ReferenceError` and the
redirect never ran. Worth repeating because the build never caught it.

### D. Venue booking and the slot lock

11. Sign in, open a venue, pick a date, press **Book Now** on a slot
12. You reach the booking form, and the slot is now locked
13. **Open the same venue in a second browser window.** That slot shows as
    locked there. This is the Socket.io broadcast and it is the single best
    thing to demonstrate
14. Abandon the form and wait; the cleanup job releases the lock

### E. Catering builder

15. **Catering**, pick a tier
16. Try to exceed a category's selection limit; it should stop you
17. Add a live counter and a beverage package, watch the total update

### F. Table reservation

18. **Reserve Table**, the floor plan draws from seeded tables
19. Pick a date, time and party size; unavailable tables are not selectable
20. Try a party larger than one table to exercise merging

### G. Ordering

21. **Order Online**, add items, the cart badge updates
22. Checkout reaches the payment step

### H. Admin

23. `http://localhost:5173/admin/login`, use your `ADMIN_EMAIL`
24. **Dashboard**: revenue and booking charts render
25. **Venue Bookings**: your booking from step 12 appears; add a note,
    change status
26. **Tables**, **Menu**, **Venues**, **Catering**: create, edit, delete
27. **Users**: the seeded accounts are listed; toggle one active and back

### What you cannot test without keys

| Feature | Needs |
|---|---|
| Real SMS delivery | `FAST2SMS_API_KEY` or Twilio credentials |
| Email replies to contact messages | `EMAIL_USER`, `EMAIL_PASS` |
| Completing a payment | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, test mode |

Everything up to the payment step works without any of them.

---

## 8. Troubleshooting

**The server exits immediately on start.**
It used to do this when `RAZORPAY_KEY_ID` was unset, because the Razorpay
client was constructed at import time and threw before anything else ran.
That is fixed: the client is built on first use, so the app boots without
payment keys and only payment endpoints fail. If the server still exits,
check `MONGO_URI` and that MongoDB is actually running.

**`MongoDB Connected` prints but nothing works.**
That line is printed unconditionally when the server starts listening,
whether or not the database connected. Look for a Mongoose error above it.

**The OTP never arrives.**
Expected without SMS keys. Read it from the server terminal, see above.

**CORS errors from a phone on the same network.**
The CORS policy allows any `localhost`, `127.0.0.1`, `192.168.x` or `10.x`
origin, so this should work. Anything else is blocked and logged as
`CORS Blocked Origin:` in the server terminal.

**Seed scripts fail with `ERR_MODULE_NOT_FOUND`.**
Run them from inside `server/`, as `node scripts/seed-venues.js`. They
resolve `../src/models/...` relative to `server/scripts/`.

**Images are missing after seeding.**
Only the images the sample data references ship in the repo. Anything a
previous instance uploaded is gitignored and will not be there.
