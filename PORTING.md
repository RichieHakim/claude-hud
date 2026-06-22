# Porting this fork (RichieHakim/claude-hud)

This fork's **`main`** = upstream **v0.3.0** + **one commit** that adds a stacked
"hamburger" usage bar (`display.usageStackedBar`). Because the customization lives
on `main`, a plain `git clone` is ready to use — no branch checkout needed.

Upstream is tracked via the `upstream` remote (`jarrodwatts/claude-hud`); see
"Updating later" below. There is no separate upstream-mirror branch.

> The reasoning-effort display (`[Fable 5 ◑ high]`) is now **upstream-native**
> (`display.showEffortLevel`), so it is no longer a customization carried here.

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
# 1. Clone the fork (default branch `main` already has the customization + built dist/)
git clone https://github.com/RichieHakim/claude-hud.git ~/github_repos/claude-hud
#   (To rebuild after editing src/:  cd ~/github_repos/claude-hud && npm install && npm run build)

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
git rebase <newest upstream tag, e.g. v0.4.0>   # on main; resolve small render conflicts
npm install && npm run build                    # recommit dist
git push origin main                            # (--force-with-lease, since rebase rewrites history)
```

The customization is small and self-contained: `src/render/colors.ts` (the
`stackedBar` helper), `src/render/lines/usage.ts` (numeric `elapsedWindowPercent`
+ wiring into the expanded usage path), and `src/config.ts` (the toggle in the
interface, defaults, and migration block).
