/*
 * Run a seed (or any script) against the deployed database, loaded with
 * --require so it applies to seed-all.js and every script it spawns.
 *
 *     vercel env pull .env.production.local --environment production
 *     $env:NODE_OPTIONS='--require=./scripts/with-production-env.cjs'; npm run seed
 *     Remove-Item env:NODE_OPTIONS
 *
 * It does two things, neither of which belongs in the project:
 *
 * 1. Points MONGO_URI at the production value pulled from Vercel, without
 *    that value ever touching server/.env or a command line. dotenv does
 *    not overwrite variables that are already set, so setting it here
 *    wins over the localhost URI in server/.env and the project's own
 *    files stay as they are.
 *
 * 2. Fixes DNS. Node takes its resolvers from the network configuration,
 *    and on this machine that list is 127.0.0.1 with nothing listening,
 *    so the SRV lookup a mongodb+srv:// URI needs fails with
 *    ECONNREFUSED. Windows itself resolves fine, which is why nslookup
 *    works and Node does not.
 *
 * Nothing here is printed except the host and database, so the password
 * stays out of the terminal and out of any transcript.
 */
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// --------------------------------------------------- 1. the connection
const SOURCE = process.env.SEED_URI_FILE
    || path.join(__dirname, '..', '.env.production.local');

if (!process.env.MONGO_URI_SET_BY_PRELOAD) {
    let raw;
    try {
        raw = fs.readFileSync(SOURCE, 'utf8');
    } catch (err) {
        console.error('[preload] cannot read %s: %s', SOURCE, err.code);
        process.exit(1);
    }

    const match = raw.match(/^[ \t]*MONGO_URI[ \t]*=[ \t]*(.*)$/m);
    if (!match) {
        console.error('[preload] no MONGO_URI in %s', SOURCE);
        process.exit(1);
    }

    const uri = match[1].trim().replace(/^["']|["']$/g, '');
    const location = uri.split('://')[1] || '';
    const afterAt = location.includes('@') ? location.split('@')[1] : location;
    const host = afterAt.split('/')[0];
    const database = afterAt.includes('/')
        ? afterAt.split('/')[1].split('?')[0]
        : '';

    if (!database) {
        console.error('[preload] that URI names no database, so Mongoose '
            + 'would write to "test". Refusing.');
        process.exit(1);
    }

    process.env.MONGO_URI = uri;
    process.env.MONGO_URI_SET_BY_PRELOAD = '1';
    console.log('[preload] MONGO_URI -> %s/%s', host, database);
}

// --------------------------------------------------- 2. the resolver
const servers = dns.getServers();
const allLoopback = servers.every(
    (s) => s === '::1' || s.startsWith('127.')
);
if (allLoopback) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    if (!process.env.DNS_FIXED_BY_PRELOAD) {
        process.env.DNS_FIXED_BY_PRELOAD = '1';
        console.log('[preload] resolver was %s; using 8.8.8.8 for this run',
            JSON.stringify(servers));
    }
}
