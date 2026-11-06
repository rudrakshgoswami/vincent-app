# Deploying Vincent

Vincent is a MERN app with live sockets, file uploads and a background job, so
it does not go up as one static site. The client is a Vite build and belongs on
Vercel. The server is a long-running Node process and belongs somewhere that
keeps a process alive.

## What has to exist first

**A hosted MongoDB.** `server/.env` currently points at `mongodb://localhost`,
which nothing outside this machine can reach. Create a free M0 cluster at
[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register), add a database
user, and allow access from anywhere (`0.0.0.0/0`) so your host can connect.

Vercel's marketplace has Postgres, DynamoDB, Redis, Convex and Turso, but no
MongoDB, so this one cannot be provisioned through Vercel. Moving to Postgres
instead would mean rewriting every Mongoose model and query in the project.

## 1. The database

Put the Atlas connection string in `server/.env`:

```
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/vincent
```

Then seed it, exactly as on a fresh local checkout:

```bash
cd server
node scripts/seed-venues.js
node scripts/seed-new-catering.js
node scripts/seed-all-items.js
node scripts/create-admin.js
node scripts/create-demo-users.js
```

Confirm it worked by starting the server and watching for `MongoDB Connected`.

## 2. The server

It needs a host that runs `node server.js` continuously, because of three
things a serverless function cannot do:

- **Socket.io** holds open connections for the live floor plan, slot locks and
  the admin order feed
- **`startReservationLockCleanup()`** runs on a 30-second interval
- **multer** writes uploads to `server/uploads/`, which must survive restarts

Render, Railway and Fly all run this unchanged on a free or cheap tier. Set the
start command to `npm start`, the root directory to `server`, and these
variables:

| Variable | Value |
|---|---|
| `MONGO_URI` | the Atlas string from step 1 |
| `JWT_SECRET` | a long random string |
| `JWT_REFRESH_SECRET` | a different long random string |
| `FRONTEND_URL` | your Vercel URLs, comma separated |
| `NODE_ENV` | `production` |
| `PORT` | whatever the host provides |

`FRONTEND_URL` takes a list because every Vercel deployment gets a preview
domain alongside the production one, and CORS rejects anything not listed once
`NODE_ENV=production`. Email, SMS and Razorpay keys can stay unset; those flows
fall back to the demo behaviour described in the README.

For uploads to survive a redeploy, mount a persistent disk at
`server/uploads`. Without one, images uploaded through the admin panel vanish
on the next deploy, while the seed images committed to the repo stay.

## 3. The client

```bash
cd client
vercel --prod
```

Set the root directory to `client`; Vercel detects Vite and uses `npm run
build` into `dist`. Add one environment variable:

```
VITE_BACKEND_URL=https://your-server-host.example.com
```

`client/src/api.js` reads it and falls back to `http://localhost:5000`, so
without it a deployed client will quietly try to call your laptop.

Redeploy after setting it — Vite bakes environment variables into the bundle at
build time, so changing the variable alone does nothing.

## 4. Check it

- The venue list loads and prices are not all ₹0 — that means Mongo is
  connected and seeded
- The browser console shows `Socket.IO connected` — that means websockets
  reached the server
- Sign in as `customer@example.com` / `Password123!` and open a booking; the
  slot lock countdown should start at 15:00
- No `CORS Blocked Origin` lines in the server log

If the venue list is empty but the page renders, the client reached the server
and the server did not reach Mongo. If every request fails, check
`VITE_BACKEND_URL` was set *before* the build that is live.
