# Vincent

A restaurant, venue and catering booking platform. Table reservations with a
live floor plan, venue bookings with slot locking, build-your-own catering
packages, online ordering, payments and an admin dashboard.

Built as a final-year BCA team project at Dollyben Desai Institute of Computer
Application, VNSGU Surat, then cleaned up, fixed and opened up.

![Node](https://img.shields.io/badge/Node-18%2B-5FA04E?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101?style=flat-square&logo=socketdotio&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## What it does

**For guests**

- Browse venues with galleries, amenities, policies and a month-at-a-glance
  availability calendar
- Book a venue slot, with a short lock so two people cannot take the same slot
  while one of them is paying
- Build a catering package: pick a tier, then choose within per-category limits,
  add live counters, beverages, dietary options and service styles
- Reserve a table from a visual floor plan, including merging tables for larger
  groups
- Order food for delivery or dine-in
- Phone OTP sign-in, order history, reviews

**For staff**

- Admin dashboard with revenue and booking charts
- Manage venues, menus, catering packages, tables and users
- Confirm, reschedule and cancel bookings, with advance and balance payments
  tracked separately

---

## Stack

| | |
|---|---|
| **Frontend** | React 19, Vite, React Router, Tailwind, Recharts, Three.js via React Three Fiber |
| **Backend** | Node, Express 5, MongoDB with Mongoose |
| **Realtime** | Socket.io, used for slot locks and live availability |
| **Auth** | JWT access and refresh tokens, bcrypt, phone OTP |
| **Payments** | Razorpay, advance and balance split |
| **Media** | Multer uploads, client-side cropping |

Roughly 30,000 lines across 123 source files, 19 Mongoose models and 13 route
groups.

---

## Running it

You need Node 18 or newer and a MongoDB instance (local is fine).

```bash
git clone https://github.com/rudrakshgoswami/vincent-app.git
cd vincent-app

# Backend
cd server
npm install
cp .env.example .env     # then fill it in, see below
npm run dev              # http://localhost:5000

# Frontend, in a second terminal
cd client
npm install
npm run dev              # http://localhost:5173
```

### Configuration

Copy `server/.env.example` to `server/.env` and fill it in. The only two
values you need to get started are `MONGO_URI` and `JWT_SECRET`; email, SMS
and payments can stay as placeholders until you need those flows.

Use Razorpay **test mode** keys. Never commit `.env`; it is gitignored.

### Seeding

The `db_export/` folder holds a sample dataset: venues, catering packages,
food items, tables and a handful of bookings. Every record in it is dummy
data (see [Data](#data) below).

```bash
cd server
node scripts/seed-venues.js        # venues and service packages
node scripts/seed-new-catering.js  # catering packages, categories, items
node scripts/seed-all-items.js     # restaurant menu
node scripts/create-admin.js       # admin user, reads ADMIN_EMAIL / ADMIN_PASSWORD
```

Seeded user accounts all share the password **`Password123!`**.

---

## Data

The sample data is **not real**. Every name, email address, phone number,
postal address, review comment and payment reference was replaced with
generated stand-ins before this repository was made public. Passwords are a
single shared bcrypt hash of the demo password above.

What was kept is the structure: record ids, the relationships between
collections, dates, amounts and the business catalogue, so the seeded app
behaves exactly as the original did.

`server/uploads/` ships only the images the sample data points at. A running
instance writes new uploads into that folder and git ignores them.

---

## What was fixed before publishing

Running the project from a clean checkout turned up several things that had
never surfaced during development.

**Two crashes that the build could not see.** ESLint flagged three `no-undef`
errors. `VenueDetails.jsx` called `toast.error()` twice, and nothing in the
project imports a toast library: it is the only file that mentions `toast` at
all. One of those calls sits in `handleBookNow` ahead of the redirect to the
login page, so a logged-out visitor pressing **Book Now** got a
`ReferenceError` and never reached login. That is the main booking entry
point. Both now use the inline error state the same file already uses for
review errors. Separately, `Profile.jsx` read `process.env.NODE_ENV`, and
`process` does not exist in a browser; it was a debug panel whose own comment
said to remove it after testing, so it was removed.

Neither broke `vite build`. Bundlers resolve imports, they do not check that
every identifier exists, which is exactly why both shipped.

**Two seed scripts could never have run.** `seed-catering.js` imported three
models that do not exist in the repository and has been superseded by
`seed-new-catering.js`, so it was deleted. `seed-venues.js` imported a
`CateringExtra` model that also does not exist, while the application itself
aliases `CateringAddOn` under that name; the seed now does the same, which
makes its 30-plus rows of catering extras load.

**Security packages installed but never wired up.** `express-rate-limit` and
`express-mongo-sanitize` are both dependencies and neither is imported
anywhere, so there is no rate limiting on login or OTP and no NoSQL injection
filtering. See [Known limitations](#known-limitations).

**A hardcoded admin password.** `create-admin.js` contained
`const adminPassword = 'admin123'`. It now reads `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from the environment and exits if they are missing, because
a default in a public repository becomes the password everywhere nobody
changed it.

**Repository hygiene.** Twelve ad-hoc debug scripts (`findWhy.js`,
`diagnoseAdminIssue.js`, `quickCheck.js` and similar) were removed and the
seeds moved into `server/scripts/`. Of 446 files in `uploads/`, 13 were
referenced by any data; the rest were test orphans. Together with a 122 MB
scratch image folder that nothing referenced, that took the repository from
roughly 250 MB to 14 MB.

---

## Known limitations

Honest list, in rough order of how much they matter.

- **No rate limiting.** `express-rate-limit` is installed but unused. Login
  and OTP endpoints are open to brute force.
- **No NoSQL injection filtering.** `express-mongo-sanitize` is likewise
  installed but unused.
- **No automated tests.** The project has none. Everything above was found
  with ESLint, a build and a careful read.
- **86 remaining lint findings**, mostly unused variables and incomplete React
  hook dependency arrays. They are hygiene rather than bugs, and "fixing"
  hook dependencies without understanding the intent can introduce render
  loops, so they were left alone.
- **1.36 MB JavaScript bundle**, 355 KB gzipped, in one chunk. Three.js is
  most of it. Route-level code splitting would help.
- **CORS allows any `192.168.x` or `10.x` origin** so the app can be tested
  from a phone on the same network. Tighten before deploying anywhere real.
- The server prints `MongoDB Connected` on listen whether or not the database
  actually connected.

---

## Team

Vincent was a group project. The code here is the work of the whole team, not
one person, and it is published with their agreement.

- Akshar Vala
- Rudraksh Goswami ([@rudrakshgoswami](https://github.com/rudrakshgoswami))

---

## License

MIT. See [LICENSE](LICENSE).
