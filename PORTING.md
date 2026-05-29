# Porting this fork (RichieHakim/claude-hud)

This fork = upstream **v0.0.12** + one commit that adds a labeled model line with
a colored reasoning-effort level (`Model [Opus] · high`). The customization lives
on the branch **`feat/model-effort-display`**. `main` is left mirroring upstream
so `git pull upstream main` stays easy.

## What makes the HUD "mine" (only two things)

1. **This repo's `dist/`** — the compiled statusline. `dist/` is committed, and the
   plugin has **zero runtime dependencies**, so a clone runs as-is. No `npm`/`tsc`
   needed on the target machine (only if you edit `src/` and rebuild).
2. **`~/.claude/plugins/claude-hud/config.json`** — display tuning. The statusline
   reads this from `$HOME` (honors `CLAUDE_CONFIG_DIR`) regardless of where this
   repo lives, so the same file works on any machine.

The marketplace plugin (`claude-hud@claude-hud`) is optional — keep it installed
only for the `/claude-hud:configure` skill. The HUD itself needs only this repo +
the config.json.

## Port to a new machine (e.g. macOS)

Prereqs: `git`, Node ≥ 18 (`node -v`), Claude Code installed.

```bash
# 1. Clone the fork and check out the customization branch
git clone https://github.com/RichieHakim/claude-hud.git ~/github_repos/claude-hud
cd ~/github_repos/claude-hud
git checkout feat/model-effort-display
#   (dist/ is already built — nothing to compile. To rebuild: npm install && npm run build)

# 2. Drop in the config (create the dir if the marketplace plugin isn't installed)
mkdir -p ~/.claude/plugins/claude-hud
#   then write ~/.claude/plugins/claude-hud/config.json with the contents below
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

4. Verify before restarting Claude Code:

```bash
echo '{"model":{"display_name":"Opus"},"effort":{"level":"high"},"cwd":"'"$PWD"'","context_window":{"context_window_size":1000000,"used_percentage":45},"rate_limits":{"five_hour":{"used_percentage":7,"resets_at":9999999999},"seven_day":{"used_percentage":10,"resets_at":9999999999}}}' \
  | /opt/homebrew/bin/node ~/github_repos/claude-hud/dist/index.js
# Expect a line: Model [Opus] · high   (with "high" in green)
```

## config.json (current, with effort enabled)

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
    "showEffortLevel": true
  }
}
```

## Effort color key

`low`=dim · `medium`=cyan · `high`=green · `xhigh`=yellow · `max`=magenta · `ultra`=bright magenta.
Toggle the whole feature with `display.showEffortLevel`. The level comes from Claude
Code's statusline stdin (`effort.level`, live per-session); on older builds it falls
back to the parent process's `--effort` flag.

## Notes vs. your old 0.0.10 setup

- The `| Max` plan label is **gone** at v0.0.12 — upstream removed the OAuth usage
  API and now reads limits only from stdin `rate_limits`. The model line is `[Opus]`.
- The usage limits render as two labeled lines (`Usage` 5h, `Weekly` 7d).

## Updating later

```bash
git fetch upstream
git checkout feat/model-effort-display
git rebase upstream/v0.0.13   # or a newer tag; resolve the small render conflicts
npm install && npm run build  # recommit dist
```
