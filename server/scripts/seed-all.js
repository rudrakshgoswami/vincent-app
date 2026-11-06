/*
 * Runs every seed a fresh database needs, in the order they depend on each
 * other, so bringing up a new cluster is one command instead of six.
 *
 *     npm run seed
 *
 * Each script is spawned as its own process because they each connect to
 * MongoDB and exit; sharing one connection between them would mean rewriting
 * all six. Order matters: venues create the catering packages that the menu
 * seeds attach food items to, and the users come last so a failure earlier
 * does not leave accounts pointing at data that was never created.
 */
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

// The individual scripts each load this themselves; this process needs it
// too, only to check MONGO_URI is there before spawning any of them.
dotenv.config({ path: new URL('../.env', import.meta.url) });

const here = path.dirname(fileURLToPath(import.meta.url));

const STEPS = [
    'seed-venues.js',
    'seed-new-catering.js',
    'seed-all-items.js',
    'create-admin.js',
    'create-demo-users.js'
];

const run = (script) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(here, script)], {
        stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', (code) => (
        code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`))
    ));
});

const main = async () => {
    if (!process.env.MONGO_URI) {
        console.error('\nMONGO_URI is not set. Put it in server/.env first.\n');
        process.exit(1);
    }

    for (const script of STEPS) {
        console.log(`\n────── ${script} ──────`);
        await run(script);
    }
    console.log('\nAll seeds finished.\n');
};

main().catch((err) => {
    console.error(`\nSeeding stopped: ${err.message}\n`);
    process.exit(1);
});
