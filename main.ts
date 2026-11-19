// Vice Lights Cover Studio — the entry program (Node 22, standard library only).
//
// The app itself is plain static files under app/ (app/index.html plus its ES
// modules, no library and no network request), and this program hands it in:
// it copies app/ and screenshots/ from beside this file into /output and
// writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program runs twice and both runs must write the same bytes, so it does
// nothing time- or randomness-dependent: it copies files and writes the
// dossier the library builds from them. Before writing it checks the gate's
// own caps on the screenshots and on app/ and refuses loudly instead of
// handing in an entry the scorer would refuse.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

// The gate's caps (RULES.txt, "The gate"): at most 4 screenshots, each a
// whole PNG or JPEG of at most 256 KiB; app/ at most 993 files and
// directories together and 48 MiB in all, every path at most 1000 bytes.
const SHOT_LIMIT = 4;
const SHOT_MAX_BYTES = 256 * 1024;
const APP_MAX_ENTRIES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const APP_PATH_MAX_BYTES = 1000;

/** Walks a directory tree and returns every entry below it (files and directories). */
function walkTree(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    found.push(path);
    if (statSync(path).isDirectory()) found.push(...walkTree(path));
  }
  return found;
}

/** Refuses the run when the screenshots break the gate's caps. */
function checkShots(dir: string): void {
  if (!existsSync(dir)) throw new Error('screenshots/ is missing: the entry needs 3 or 4 screenshots');
  const shots = readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isFile());
  if (shots.length < 3 || shots.length > SHOT_LIMIT) {
    throw new Error(`screenshots/ holds ${shots.length} images, the gate wants 3 or 4`);
  }
  for (const shot of shots) {
    const bytes = statSync(shot).size;
    if (bytes > SHOT_MAX_BYTES) throw new Error(`${shot} is ${bytes} bytes, over the 256 KiB cap`);
  }
}

/** Refuses the run when app/ breaks the gate's caps. */
function checkApp(dir: string): void {
  const entries = walkTree(dir);
  if (entries.length > APP_MAX_ENTRIES) {
    throw new Error(`app/ holds ${entries.length} entries, over the 993 cap`);
  }
  let total = 0;
  for (const path of entries) {
    if (Buffer.byteLength(path, 'utf8') > APP_PATH_MAX_BYTES) {
      throw new Error(`app/ path over the 1000-byte cap: ${path}`);
    }
    if (statSync(path).isFile()) total += statSync(path).size;
  }
  if (total > APP_MAX_BYTES) throw new Error(`app/ is ${total} bytes, over the 48 MiB cap`);
  if (!existsSync(join(dir, 'index.html'))) throw new Error('app/index.html is missing');
}

checkShots(shotsDir);
checkApp(appDir);

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The dossier is byte for byte what the vendored library writes from app/
// and screenshots/, capped at 160 KiB of source text.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: SHOT_LIMIT, max_bytes: SHOT_MAX_BYTES },
    app_max_files: APP_MAX_ENTRIES,
    app_max_bytes: APP_MAX_BYTES,
    app_path_max_bytes: APP_PATH_MAX_BYTES,
  }),
);
console.log(`handed in ${outDir}`);
