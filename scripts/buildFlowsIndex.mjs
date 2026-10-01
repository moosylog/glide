// scripts/buildFlowsIndex.mjs — generates flows/index.json from the individual flows/**/*.flows
// files. Run via `npm run build:flows` whenever a .flows file is added, changed, or removed; CI
// also runs this automatically (see .github/workflows/sync-flows-index.yml) so a forgotten manual
// rebuild never ships a stale index.
//
// Each .flows file is a single TOML-ish document (same uid/title/description/script/manifest/
// param shape as flows4json, plus a GLIDE-only `successMessage` field). This script just parses
// every file under flows/shared, flows/glove80, and flows/go60, and writes them out as the flat
// JSON array core/capabilities/catalogSchema.js's parseCatalog() expects.
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as toml from 'smol-toml';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const flowsRoot = join(repoRoot, 'flows');
const outPath = join(flowsRoot, 'index.json');

const FOLDERS = ['shared', 'glove80', 'go60'];

const entries = [];
const seenUids = new Map(); // uid -> file path, to catch duplicates across folders
let fileCount = 0;

for (const folder of FOLDERS) {
    const dir = join(flowsRoot, folder);
    let files;
    try {
        files = readdirSync(dir).filter((f) => f.endsWith('.flows'));
    } catch (err) {
        if (err.code === 'ENOENT') continue; // folder doesn't exist yet -- fine, just nothing in it
        throw err;
    }
    for (const file of files) {
        const filePath = join(dir, file);
        if (!statSync(filePath).isFile()) continue;
        fileCount++;

        let parsed;
        try {
            parsed = toml.parse(readFileSync(filePath, 'utf8'));
        } catch (err) {
            throw new Error(`Failed to parse flows/${folder}/${file}: ${err.message}`);
        }

        if (!parsed.uid || typeof parsed.uid !== 'string') {
            throw new Error(`flows/${folder}/${file} is missing a uid.`);
        }
        if (!parsed.script || typeof parsed.script !== 'string' || !parsed.script.trim()) {
            throw new Error(`flows/${folder}/${file} (uid "${parsed.uid}") has no runnable script.`);
        }
        if (seenUids.has(parsed.uid)) {
            throw new Error(`Duplicate uid "${parsed.uid}": flows/${folder}/${file} and ${seenUids.get(parsed.uid)}.`);
        }
        seenUids.set(parsed.uid, `flows/${folder}/${file}`);

        // Folder placement is informational for authors (shared/glove80/go60), but the actual
        // keyboard gating GLIDE uses at runtime is manifest.keyboards -- keep them consistent so a
        // flow in flows/go60/ without "go60" in its manifest doesn't silently show up everywhere.
        if (folder !== 'shared') {
            const kbs = parsed.manifest && Array.isArray(parsed.manifest.keyboards) ? parsed.manifest.keyboards : null;
            if (!kbs || !kbs.includes(folder)) {
                throw new Error(
                    `flows/${folder}/${file} (uid "${parsed.uid}") is filed under "${folder}" but its ` +
                    `manifest.keyboards is ${JSON.stringify(kbs)} -- add "${folder}" to manifest.keyboards, ` +
                    `or move the file to flows/shared if it should work on both keyboards.`
                );
            }
        }

        entries.push(parsed);
    }
}

entries.sort((a, b) => a.uid.localeCompare(b.uid));

writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n');
console.log(`Wrote flows/index.json: ${entries.length} entries from ${fileCount} .flows files.`);
