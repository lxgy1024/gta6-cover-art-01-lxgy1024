# gta6-cover-art-01-lxgy1024

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lxgy1024/gta6-cover-art-01-lxgy1024/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lxgy1024/gta6-cover-art-01-lxgy1024/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Vice Cover Studio — a web app that turns your photo and a caption into GTA-poster-style cover art: a three-panel photo grid with thick white poster frames, four layouts (Hero left, Hero right, Triptych, Wide band), four sunset/neon colour grades (Sunset, Neon, Palm Dusk, Noir), per-panel crop and pan (click a panel, drag it, or use the sliders), bold slanted caption lettering with a subtitle, film grain and a vignette, and PNG export in 1080 × 1080, 1080 × 1350 and 1920 × 1080. It runs entirely offline in a desktop browser from its own static files — photos are read on your machine and never uploaded. No Rockstar logos, artwork or fonts are used.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or serve `app/` with any static server (for example `python3 -m http.server` inside `app/`) and open `app/index.html` in desktop Chrome. Load a photo, pick a layout and grade, type a caption, and hit Export PNG. `main.ts` copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` (set `MAKEFUN_OUTPUT_DIR` to choose another output directory).

---

<sub>Entered on [make.fun](https://make.fun/?ref=s7zff8f6&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
