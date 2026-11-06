# Deploying Vincent

Vincent is live on Vercel as two projects in the `rudraksh8` team:

| | Project | URL |
|---|---|---|
| Client | `vincent-app` | https://vincent-app-omega.vercel.app |
| API | `vincent-api` | https://vincent-api.vercel.app |

Both deploy with `vercel deploy --prod` from `client/` and `server/`. Vercel
detects the Express app in `server/` on its own — the framework preset is
Express, and it runs `server.js`, which is why there is no handler of our own
under `server/api/`.

## The one thing still missing

`MONGO_URI`. Until it is set, every `/api` route answers:

```json
{ "message": "The database is not reachable from this deployment." }
```

The site renders, the client reaches the API, and CORS is already correct.
Only the data is absent.

### Setting it

The Atlas cluster is ready: **Cluster0** (free M0) in the project named
`project`, resumed, with `0.0.0.0/0` already on the IP access list and a
database user `rudrakshgoswami5555_db_user` holding `atlasAdmin`.

What is missing is that user's password, which only you have. Either use the
one you set, or open
[Database Access](https://cloud.mongodb.com/v2/694a63e1346a7179401924e7#/security/database/users)
→ **Edit** → **Edit Password** → **Autogenerate Secure Password** → **Copy**.

The connection string is then:

```
mongodb+srv://rudrakshgoswami5555_db_user:THEPASSWORD@cluster0.XXXXX.mongodb.net/vincent_db
```

Take the `cluster0.XXXXX` host from **Connect → Drivers** on the cluster. Keep
`/vincent_db` on the end — without a database name, Mongoose writes to `test`.

Set it in two places:

1. **Vercel**, so the deployed API can reach it:
   ```bash
   cd server && vercel env add MONGO_URI production
   ```
   Paste the string when prompted, then redeploy: `vercel deploy --prod`.

2. **`server/.env`**, so the seed scripts can reach it. Replace the
   `mongodb://localhost:27017/vincent_db` line that is there now.

### Then seed it

A new cluster is empty. One command fills it:

```bash
cd server && npm run seed
```

That runs venues, catering, menu items, the admin account and the demo users,
in the order they depend on each other. Check it worked by opening
https://vincent-app-omega.vercel.app/venues — six venues, prices from ₹30,000.

## What this host does not do

Three things work locally, under `npm run dev`, and not on Vercel, because
functions do not stay alive between requests:

- **Socket.io.** The live floor plan, the slot-availability push and the admin
  order feed. The client reports this once in the console and carries on; no
  page depends on it.
- **The 30-second lock cleanup.** It does not run. This cannot cause a double
  booking: every availability query filters on `lockExpiresAt`, and
  `VenueSlotLock` carries a TTL index that MongoDB enforces itself. What is
  lost is tidying of stale `pending` rows in the admin list.
- **Image uploads from the admin panel.** The filesystem is read-only, so
  `multer` cannot write to `server/uploads/`. The seeded images, which are
  committed, still serve. Moving uploads to Vercel Blob would fix this.

If all three matter, the same code runs unchanged on a host that keeps a
process alive — Render, Railway and Fly all take `npm start` with the root
directory set to `server`. `server.js` still creates the HTTP server, attaches
Socket.io and starts the cleanup job; that path was never removed.

## Environment variables

Already set on `vincent-api`:

| Variable | |
|---|---|
| `JWT_SECRET` | generated |
| `JWT_REFRESH_SECRET` | generated |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | the client URL |

Already set on `vincent-app`:

| Variable | |
|---|---|
| `VITE_BACKEND_URL` | the API URL |

Vite bakes its variables in at build time, so changing `VITE_BACKEND_URL`
means redeploying the client, not just saving the variable.

`FRONTEND_URL` takes a comma-separated list. Every Vercel deployment also gets
a preview domain, and with `NODE_ENV=production` the CORS check rejects any
origin not in that list, so add preview domains there if you need them to call
the API.

Email, SMS and Razorpay keys are unset; those flows fall back to the demo
behaviour described in the README. Razorpay is in test mode.
