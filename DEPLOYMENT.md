# Deploying Vincent

Vincent is live on Vercel as two projects in the `rudraksh8` team:

| | Project | URL |
|---|---|---|
| Client | `vincent-app` | https://vincent-app-omega.vercel.app |
| API | `vincent-api` | https://vincent-api.vercel.app |

Both deploy on a push to `main`, each from its own subdirectory. Vercel
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
database user holding `atlasAdmin`. The cluster hostname and the user's
name are in `server/.env`, which is gitignored and stays out of this
repository.

What is missing is that user's password, which only you have. Either use the
one you set, or open
[Database Access](https://cloud.mongodb.com/) in the Atlas dashboard
→ **Edit** → **Edit Password** → **Autogenerate Secure Password** → **Copy**.

The connection string has this shape, with your own cluster hostname and
user in place of the placeholders:

```
mongodb+srv://USER:PASSWORD@YOUR-CLUSTER.mongodb.net/vincent_db?retryWrites=true&w=majority
```

Keep `/vincent_db` on the end — without a database name Mongoose writes to
`test`, and the seeds and the API would then disagree about where the data
is. If the password contains `@`, `:`, `/` or `%`, percent-encode it or
autogenerate a new one, because those characters end a field in a connection
string and it will fail to parse.

Set it in two places. Start with `server/.env`, because the Vercel step
reads the value back out of that file rather than asking you to paste a
password twice:

1. **`server/.env`**, so the seed scripts can reach it. Run the helper and
   type the password at the prompt — it is not echoed, so it never lands
   in your shell history, and it builds the whole connection string for
   you including percent-encoding:

   ```bash
   cd server && python scripts/set-mongo-password.py
   ```

   Editing the `MONGO_URI` line by hand works too. Keep `/vincent_db` on
   the end if you do.

2. **Vercel**, so the deployed API can reach it. `MONGO_URI` already
   exists there holding a placeholder, and `vercel env add` will not
   overwrite an existing key, so remove it first:

   ```bash
   cd server && vercel env rm MONGO_URI production --yes
   ```

   ```bash
   cd server && grep '^MONGO_URI=' .env | cut -d= -f2- | vercel env add MONGO_URI production
   ```

   Piping it from the file means the password is never typed on a command
   line. A change to an environment variable does not rebuild anything on
   its own, so push a commit — or hit Redeploy on the latest deployment in
   the dashboard — to pick it up.

### Then seed it

A new cluster is empty. `npm run seed` fills it, but read this first if the
password lives only on Vercel.

`npm run seed` reads `server/.env`, which points at your local MongoDB. Run
it as-is and it will fill your laptop, not the cluster, and print "Seeding
Complete!" either way. That is not hypothetical: one of these scripts had a
hardcoded localhost URI and did exactly that.

To seed the deployed database, pull its connection string from Vercel and
run the seed against that instead:

```bash
cd server && vercel env pull .env.production.local --environment production
```

```powershell
$env:NODE_OPTIONS='--require=./scripts/with-production-env.cjs'; npm run seed; Remove-Item env:NODE_OPTIONS
```

The preload puts the pulled URI into the environment before dotenv runs.
dotenv does not overwrite variables that are already set, so it wins over
`server/.env` without that file changing. It prints the host and database it
is about to seed before anything is written, and refuses a URI with no
database name. `.env.production.local` is gitignored; delete it afterwards.

If `server/.env` already holds the Atlas string, none of that is needed —
just `npm run seed`.

Either way it runs the menu categories and items, the catering packages and
their menus, the venues, add-ons and services, then the admin account and the
demo users, in the order they depend on each other. The seeds begin by
emptying the collections they own, so check which database you are pointed at
before running them against anything you care about. Check it worked by
opening https://vincent-app-omega.vercel.app/venues — six venues, prices from
₹30,000.

## A note on the access list

`0.0.0.0/0` is on the Atlas IP access list because Vercel functions have no
fixed egress addresses on this plan, so there is no narrower range to allow.
That makes the database user's password the only thing between the internet
and the data. Two things follow:

- Keep the password autogenerated, and never put it in a file that git
  tracks. `server/.env` is ignored; `server/.env.example` is not, and it
  holds placeholders only.
- This repository is public. Nothing secret has been committed, but if you
  would rather the deployment details were not readable by anyone, make it
  private in the GitHub settings.

## Pushing to GitHub is how you deploy

A push to `main` builds and deploys both projects. Nothing else is needed,
and there is no CLI deploy step.

Each project builds from its own subdirectory:

| Project | Root directory |
|---|---|
| `vincent-app` | `client` |
| `vincent-api` | `server` |

**`vercel deploy --prod` from inside `client/` or `server/` no longer
works.** With a root directory set, Vercel looks for that folder *inside*
whatever the CLI uploads, and the CLI uploads the folder you ran it in, so
it goes looking for `client/client`. Push instead.

### What this replaced

Both projects used to build from the repository root, where neither of them
builds — the client's `vite build` finds no `vite` there — so every push
started two production builds and both failed in about three seconds. The
site never went down, because a failed build is never aliased and the last
good one keeps serving, but the dashboard showed two red deployments per
push, which looks exactly like a broken site.

It was set with:

```bash
vercel project update vincent-app --root-directory client --yes
```

```bash
vercel project update vincent-api --root-directory server --yes
```

To go back to deploying from the CLI instead, clear the root directories
(`--auto-detect root-directory`) and turn off automatic deployments for
`main` under each project's Git settings, so pushes only push.

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
