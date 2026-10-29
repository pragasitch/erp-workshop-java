# Lesson 5: Hooks: a guard between the agent and the shell

**Time:** about 15–20 minutes
**Goal:** register one hook, chosen by the project and committed with it, that stops the agent from running four destructive commands, whichever tool you use.

By the end of this lesson you should be able to answer three questions:

1. What is a hook, and what can it do that a rule in `AGENTS.md` can't?
2. Why did lesson 3 switch hooks off, and why does this lesson switch one on?
3. What does CI already cover, and what is left for a hook to do?

Lesson 4 ended with tickets. Lesson 7 hands one of them to an agent that will run migrations, start the app, commit and push, in a window that gets deeper into the dumb zone with every step. Before that, two short lessons prepare the agent. This one puts a guard between it and the shell.

---

## 1. What a hook is

![Left to right: you type a prompt; the agent decides on a tool call such as a shell command; before the command runs, the harness pipes the call to the guard script as JSON. If the script exits 0 the command runs and its output goes back to the agent. If it exits 2 the command never runs and the script's stderr goes back to the agent as the reason, and the agent asks you. A note at the bottom says CI checks the result after the push, while the hook checks the action before it runs.](images/hook-guard.svg)

A **hook** is a shell command that the agent's harness runs at a fixed moment in the agent's turn. The harness pipes a JSON description of the moment to the command's stdin, waits, and reads the exit code. There are more moments than the one this lesson uses:

![A timeline of one session, left to right: the session starts, you type a prompt, the agent picks a tool call, the tool runs and its result comes back, the agent finishes its turn, the session ends. A loop arrow shows the agent making many tool calls per turn. Under each moment is the hook event that fires there: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, SessionEnd. Only PreToolUse is highlighted as able to refuse the action in all three tools. The others add context, see a result that already happened, or send the agent back to work. A note says every event gets JSON on stdin and answers with an exit code, but only PreToolUse sits before the action.](images/hook-events.svg)

Current releases of Kiro, Claude Code and Codex use the same PascalCase names for these moments; Kiro's older 2.x format spelled them in camelCase and called the first one `agentSpawn`, which section 5 comes back to. Most of them can only watch. `SessionStart` adds text to the window, `PostToolUse` sees a result that already happened, `Stop` can send the agent back to work. **Before a tool call** is the one moment where a script can still say no, and that is the only hook this lesson registers. For that moment, `PreToolUse`, the contract is the same in all three tools:

| Exit code     | What the harness does                                                                    |
| ------------- | ---------------------------------------------------------------------------------------- |
| `0`           | Runs the tool call as planned.                                                           |
| `2`           | Does not run it. Whatever the hook wrote to stderr goes back to the agent as the reason. |
| anything else | Runs it anyway and shows the stderr as a warning. A broken hook fails open, not closed.  |

Add the state lesson 3 left you in, hooks switched off, and the guard is always in one of four states:

![Four columns. Off: hooks are disabled or the hook is not registered, the script never runs, the reset runs, the agent sees its output, you see nothing special; this is where lesson 3 left you. Allows: the script exits 0 because no rule matched, the command runs, the agent sees its output, you see nothing because the hook is silent; the example is a migration. Refuses: a rule matched, the script writes one sentence to stderr and exits 2, the command never runs, the agent sees the sentence as the tool's error, you see the agent report the block and ask you. Broken: the script crashes, exits 1 or times out, the command runs anyway, the agent sees its output, you see the stderr as a warning; a broken hook fails open. A note at the bottom says the check in section 6 tells the states apart.](images/hook-states.svg)

Two of the four look the same from the agent's side: in **Off** and in **Broken** the reset runs. Only the warning on your screen tells them apart, which is why section 4 has you run the script by hand before any agent does, and why section 6 ends with a reset request that should be refused.

The thing to notice is what a hook is not. It is not a model, not a prompt, and not an instruction the agent reads. It is a program, and it runs every time, whether or not the agent remembers the rule, whether the window is fresh or 150k tokens deep. Lesson 2's list of levers ended with "prefer deterministic checks". `AGENTS.md` says "never reset the database"; an agent in the dumb zone reads that line at the start and forgets it by the time it decides that a reset would "fix" a migration conflict. A hook doesn't forget.

---

## 2. What CI already does, and what it can't

This repository runs `pnpm check` in CI on every push: format, lint, typecheck, test, build. Lesson 7's loop waits for that check to go green before you `/clear`. So the first hook most people write, "run the checks after every edit", mostly duplicates what the `implement` skill and CI already do. This lesson doesn't write it.

What CI cannot do is in the table:

| CI                                                                | A `PreToolUse` hook                              |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| Checks the **result**: the diff that was pushed                   | Checks the **action**: the command about to run  |
| After the push, minutes later, when the agent has already stopped | Inside the agent's turn, before anything happens |
| Can fail. Can't stop anything                                     | Can refuse                                       |
| Sees nothing a command did that isn't in the diff                 | Sees the command itself                          |

`pnpm db:reset` drops every table in your development database and replays the migrations. It leaves no trace in a diff, CI never sees it, and the seed data you typed in during the demo is gone. `docker compose down -v` deletes the Postgres volume. `git push --force` rewrites a branch someone else may have pulled. `rm -rf` on a source folder removes files that may not be committed yet. None of these shows up in a pull request. All of them are one tool call away in lesson 7, and an agent that is stuck will reach for them.

A hook can refuse those. It cannot judge whether a diff is right, and it cannot tell a good migration from a bad one. The demo, the diff and the boxes in lesson 7 stay yours.

---

## 3. Why lesson 3 switched hooks off

Lesson 3's prompt listed hooks among the things to switch off, and the Claude Code settings it produced say `"disableAllHooks": true`. That was never a judgement about hooks. It was about **provenance**. A hook in your home directory runs in every repository you open, invisibly to the people you work with, and nobody in the room could say what theirs did. Lesson 3's inventory step turned up a few.

This lesson switches one hook on, and the difference is where it lives. The script is in the repository. The registration is in the project's committed config. Everyone who clones the repo gets the same guard, can read it in thirty seconds, and can see in `git log` who added it and why. Off was about who chose it. The project chooses this one.

---

## 4. The guard

The script is already in the repository: [`scripts/agent-guard.mjs`](../scripts/agent-guard.mjs). Open it. It is under eighty lines of Node, which the repo already requires, so there is nothing to install and the same file serves all three tools.

It reads the JSON the harness sends, finds the shell command in it, and tests the command against four rules:

| Rule                  | Catches                                                             | Why it is on the list                          |
| --------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| Database reset        | `prisma migrate reset`, `pnpm db:reset`                             | Drops every table and replays all migrations   |
| Docker volume removal | `docker compose down -v`, `docker volume rm`, `docker volume prune` | Deletes the Postgres volume and the data in it |
| Force push            | `git push --force`, `git push -f`. Not `--force-with-lease`         | Rewrites history on a branch others pull from  |
| Recursive delete      | `rm -r` on anything except `node_modules`, `dist` and `.turbo`      | Removes files that may not be in git           |

If a rule matches, the script writes one sentence to stderr and exits with `2`. The sentence names the rule, says what the command would have done, and tells the agent to stop and ask you instead of retrying or working around it. Anything else exits `0`. If the payload isn't a shell command at all, a file edit for example, the script lets it through, even if the file being written happens to contain the words `db:reset`.

Try it without an agent:

```bash
echo '{"tool_input":{"command":"pnpm db:reset"}}'   | node scripts/agent-guard.mjs; echo "exit $?"   # expect: the message, exit 2
echo '{"tool_input":{"command":"pnpm db:migrate"}}' | node scripts/agent-guard.mjs; echo "exit $?"   # expect: nothing, exit 0
```

Two things it deliberately doesn't do. It isn't a sandbox: a reset wrapped in a script the agent wrote, or a new `package.json` alias someone adds later, gets past it. And the list is short on purpose, four rules you can read and explain. When a run in lesson 7 shows you a fifth command you wish it had refused, add a rule, commit it, and everyone has it.

---

## 5. Register it

**Update Kiro first.** Kiro CLI is changing its hook format between its 2.x engine and the V3 engine, and the documentation for the old format is thin. Make sure everyone in the room is on the current release:

```bash
kiro-cli update
kiro-cli --version
```

Verified on `kiro-cli 2.34.0`: `kiro-cli --version` prints the version and `kiro-cli update` updates the CLI, both as shown. On that build the agent engine selected by `kiro-cli chat` is V2 by default; V3 is opt-in with `--v3` (or `--agent-engine v3`). But `--no-interactive` runs reach the V3 agent server, and `kiro-cli agent list` reports a hooks-bearing agent file as `(v3 format)`, so the registration below is read with the V3 schema even on a 2.34.0 binary. The format the agent writes, not the binary's version number, is what the check in section 6 confirms.

Then, like lesson 3, don't hand-write the registration. The format differs per tool and moves between versions, so have each tool consult its own documentation. One prompt, in Kiro CLI in the repository root, or in whichever tool you use:

```markdown
You are the expert on your own configuration. Register `scripts/agent-guard.mjs` in this repository as a hook that runs before every shell command and can block it.

**1. Consult your own documentation** for hooks: which committed, project-level file holds them for the engine I am running, the event that fires before a tool call, how to limit it to the shell tool, and how a hook blocks a call (exit code 2, stderr returned to you). Only use keys and event names your documentation names; never guess.

**2. Write the registration** in that file, with the command `node scripts/agent-guard.mjs`, run from the repository root. If a project setting from lesson 3 disables all hooks, change only that key. Don't edit the script, don't change anything unrelated to hooks, and don't edit anything in my home directory.

**3. Report**: the file you wrote, the event and matcher you used, the documentation page that names them, and how I can see the hook fire.
```

### What it produced

#### Kiro CLI: `.kiro/agents/erp.json`

Kiro keeps hooks on the custom agent, which in this repository is the `erp` agent from lesson 3. The current, documented form is an array of hooks with PascalCase triggers, limited to the shell tool by a matcher:

```json
{
  "name": "erp",
  "description": "Coding agent for this ERP repository: repo instructions and skills only, built-in tools only.",
  "tools": ["@builtin"],
  "excludedTools": ["knowledge"],
  "includeMcpJson": false,
  "includePowers": false,
  "resources": ["skill://.kiro/skills/*/SKILL.md"],
  "hooks": [
    {
      "name": "agent-guard",
      "trigger": "PreToolUse",
      "matcher": "^(execute_bash|execute_pwsh)$",
      "action": { "type": "command", "command": "node scripts/agent-guard.mjs" }
    }
  ]
}
```

Kiro's documentation describes this array as the V3 format and the older 2.x form as "an object keyed by camelCase event names such as `agentSpawn`, `preToolUse`, and `postToolUse`", which V3 "still recognizes as compatibility input". In our run on `kiro-cli 2.34.0` the agent wrote the array form above and `kiro-cli agent validate --path .kiro/agents/erp.json` accepted it, and `kiro-cli agent list` reported the `erp` agent as `(v3 format)`: the engine reads this file with the V3 schema even though the binary is a 2.x version. If your agent wrote the object form instead, it is on the older engine, and the object form is what that engine reads. Either way the check in section 6 is what counts, not the shape of the file. V3 also accepts standalone files in `.kiro/hooks/`, and `/upgrade-agent` converts an old agent file to the new shape.

The matcher names Kiro's shell tool. `execute_bash` is the tool ID the matcher sees; the tool is also called `shell` in the built-in tools list. Without a matcher the hook runs on every tool call, which the script tolerates but which costs a process start per file read.

Claude Code and Codex are in Appendix A.

---

## 6. Check that it worked

Start a fresh session and give the agent a reason to reset:

```
Reset the development database with pnpm db:reset, then tell me what happened.
```

Expect the agent to report that the command was blocked, repeat the guard's reason, and ask you to run it. If it ran, the hook isn't registered for the engine you are on: ask the agent to show the file it wrote and the documentation page it used, and compare with section 5. If it quietly tried `prisma migrate reset` instead and that was blocked too, good, the second rule caught it.

Then:

```
Run the migrations with pnpm db:migrate.
```

Expect it to run. The guard refuses resets, not migrations, and lesson 7's first ticket needs one.

Finally, `git status --short` should show one new or changed file, the registration, and nothing else. On a fresh clone `.kiro/agents/` is not yet tracked, so the file shows as untracked (`?? .kiro/agents/`) rather than modified; once it is committed, later edits show as modified. Commit it on `main` before lesson 7 branches:

```bash
git add .kiro/agents/erp.json           # or .claude/settings.json, .codex/hooks.json and .codex/config.toml
git commit -m "Register the agent guard hook"
git push
```

---

## Summary

- A **hook** is a program the harness runs at a fixed moment in the agent's turn. Before a tool call, exit `2` blocks the call and sends stderr back to the agent. It runs every time, in any window, and doesn't forget.
- **CI checks the result** after the push. **A hook checks the action** before it runs. Resets, volume deletes, force pushes and recursive deletes leave no trace in a diff, and CI never sees them.
- Lesson 3 switched hooks off because of **provenance**: hooks in a home directory run everywhere, invisibly. This hook is in the repository, read by everyone, chosen by the project.
- The guard is **four rules in one short script**, shared by three tools. It isn't a sandbox, and it won't judge a diff. Add a rule when a run shows you one.

---

## Optional: try it later

This isn't part of the session. The second hook worth having in this repository protects **applied migrations**: once a file under `packages/database/prisma/migrations/` is committed, editing it breaks every database that already ran it. The same guard pattern applies, on the file-writing tools instead of the shell: read the path from the payload, check whether the file is already tracked (`git ls-files --error-unmatch <path>`), and exit `2` if it is. Write it as a second script, register it the same way, and ask the agent to "fix a typo in the first migration" to see it refuse.

---

## Appendix A: the same hook in Claude Code and Codex

**Claude Code: `.claude/settings.json`.** Lesson 3 set `disableAllHooks` to `true` in this file. Remove that key, or set it to `false`, and add the hook. `$CLAUDE_PROJECT_DIR` is the folder the session started in, so the path works from any subfolder:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "autoMemoryEnabled": false,
  "enableAllProjectMcpServers": false,
  "outputStyle": "default",
  "spinnerTipsEnabled": false,
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR\"/scripts/agent-guard.mjs"
          }
        ]
      }
    ]
  }
}
```

`/hooks` in the session lists what is registered. The Bash tool's payload carries the command in `tool_input.command`, which is the first field the script looks for.

**Codex: `.codex/hooks.json` and `.codex/config.toml`.** Lesson 3 set `hooks = false` under `[features]` in `config.toml`; set it to `true`. Codex has no project-directory variable and runs the command from the session's working directory, so its docs suggest resolving the path from the git root:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$(git rev-parse --show-toplevel)/scripts/agent-guard.mjs\"",
            "statusMessage": "Checking shell command"
          }
        ]
      }
    ]
  }
}
```

Two Codex-specific steps. Project hooks only load once the project's `.codex/` folder is trusted, the same prompt lesson 3 mentioned. And each hook has to be approved once in the session with `/hooks`; Codex keys the approval to the hook's content, so editing the registration means approving it again.

---

## Further reading

- Kiro, [Hooks](https://kiro.dev/docs/hooks/), [Hook types](https://kiro.dev/docs/hooks/types/), [Hook exit codes](https://kiro.dev/docs/reference/exit-codes/) and [Migrating hooks to CLI V3](https://kiro.dev/docs/cli/v3/hooks-migration/): the two formats and what exit `2` does.
- Claude Code, [Hooks reference](https://code.claude.com/docs/en/hooks) and [Hooks guide](https://code.claude.com/docs/en/hooks-guide): the events, the stdin payload, and the `$CLAUDE_PROJECT_DIR` variable.
- Codex, [Hooks](https://learn.chatgpt.com/docs/hooks): the `hooks.json` format, trust, and the git-root path advice.
- Lesson 2, section 6, "prefer deterministic checks": the idea this lesson is an instance of.
