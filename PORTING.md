# Porting this fork (RichieHakim/claude-hud)

This fork = upstream **v0.3.0** + **one commit** that adds a stacked "hamburger"
usage bar (`display.usageStackedBar`). The customization lives on the branch
**`feat/stacked-usage-bar`**. `main` is left mirroring upstream so
`git pull upstream main` stays trivial.

> The old `feat/model-effort-display` branch is retired: upstream now ships the
> reasoning-effort display natively (`display.showEffortLevel`, shown as
> `[Fable 5 ◑ high]`), so that customization is no longer carried here.

## What makes the HUD "mine" (only two things)

1. **This repo's `dist/`** — the compiled statusline. `dist/` is committed and the
   plugin has **zero runtime dependencies**, so a clone runs as-is. No `npm`/`tsc`
   needed on the target machine (only if you edit `src/` and rebuild).
2. **`~/.claude/plugins/claude-hud/config.json`** — display tuning. The statusline
   reads this from `$HOME` (honors `CLAUDE_CONFIG_DIR`) regardless of where this
   repo lives, so the same file works on any machine.

No marketplace plugin is required. (`/claude-hud:configure` came from the optional
marketplace plugin; we edit `config.json` directly instead.)

## Port to a new machine

Prereqs: `git`, Node ≥ 18 (`node -v`), Claude Code installed.

```bash
# 1. Clone the fork and check out the customization branch
git clone https://github.com/RichieHakim/claude-hud.git ~/github_repos/claude-hud
cd ~/github_repos/claude-hud
git checkout feat/stacked-usage-bar
#   dist/ is already built — nothing to compile.
#   (To rebuild after editing src/:  npm install && npm run build)

# 2. Drop in the config
mkdir -p ~/.claude/plugins/claude-hud
#   then write ~/.claude/plugins/claude-hud/config.json (contents below)
```

3. Point the statusline at this repo's `dist/index.js` in `~/.claude/settings.json`.
   Use an **absolute node path** — the statusline shell may not have `node` on PATH.
   Find yours with `which node` (e.g. `/opt/homebrew/bin/node`, or an nvm path).
   macOS home is `/Users/<you>`, not `/n/home03/...`.

```json
  "statusLine": {
    "type": "command",
    "command": "/opt/homebrew/bin/node /Users/<you>/github_repos/claude-hud/dist/index.js"
  }
```

4. Verify before restarting Claude Code (expect a stacked Usage bar + `[Opus ◑ high]`):

```bash
NOW=$(date +%s)
echo '{"model":{"display_name":"Opus"},"effort":{"level":"high"},"cwd":"'"$PWD"'","context_window":{"context_window_size":1000000,"used_percentage":45},"rate_limits":{"five_hour":{"used_percentage":25,"resets_at":'"$((NOW+7200))"'},"seven_day":{"used_percentage":11,"resets_at":'"$((NOW+259200))"'}}}' \
  | /opt/homebrew/bin/node ~/github_repos/claude-hud/dist/index.js
```

## config.json (current)

```json
{
  "elementOrder": ["context", "project", "usage", "tools", "agents", "todos"],
  "gitStatus": { "enabled": false },
  "display": {
    "showProject": false,
    "showSessionName": false,
    "showTools": true,
    "showAgents": true,
    "showTodos": true,
    "showDuration": true,
    "showConfigCounts": false,
    "showUsage": true,
    "usageStackedBar": true,
    "sevenDayThreshold": 0,
    "showEffortLevel": true
  }
}
```

## The stacked usage bar (`usageStackedBar`)

Each window (5h, Weekly) renders as one row of upper-half-blocks (`▀`) whose
**top half = quota used** (green → amber → orange → red) and **bottom half =
time elapsed in that window** (teal). When the colored top sticks out past the
teal bottom, you're spending quota faster than the window's clock — pace down.

- Toggle with `display.usageStackedBar` (default off upstream-side; on here).
- `sevenDayThreshold: 0` forces the Weekly bar to always show (default hides it
  until ≥80%).
- Needs live `rate_limits` from Claude Code's statusline stdin — there's no cache
  fallback. If the Usage line is missing entirely, that's a data problem (auth /
  subscription / CC version), not the renderer.

## Updating later (pull newer upstream)

```bash
git fetch upstream --tags
git checkout main && git merge --ff-only upstream/main   # keep main mirroring upstream
git checkout feat/stacked-usage-bar
git rebase <newest upstream tag, e.g. v0.4.0>            # resolve small render conflicts
npm install && npm run build                            # recommit dist
```

The customization is small and self-contained: `src/render/colors.ts` (the
`stackedBar` helper), `src/render/lines/usage.ts` (numeric `elapsedWindowPercent`
+ wiring into the expanded usage path), and `src/config.ts` (the toggle in the
interface, defaults, and migration block).
