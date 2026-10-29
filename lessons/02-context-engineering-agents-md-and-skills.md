# Lesson 2: Context engineering: what goes in AGENTS.md, and what becomes a skill

**Time:** about 10–15 minutes
**Goal:** understand why the instruction files in this repository are deliberately short, why the long recipes live in skills instead, and how to make that call yourself.

By the end of this lesson you should be able to answer three questions:

1. What does an AI coding agent actually "see" during a session, and why is that space a budget?
2. What is the "dumb zone", and why does it start long before the context window is full?
3. Given a paragraph of guidance, where does it belong: `AGENTS.md`, a skill, or the bin?

Lesson 1 explained _where_ the instruction files live and how each tool finds them (section 3.5). This lesson is about _what goes in them_.

---

## 1. The context window is a budget

Every model has a **context window**: the maximum number of tokens it can take into account for one answer. A token is roughly four characters of English, so 200K tokens is about 150,000 words. That sounds like a lot until you look at what has to fit in it.

![One 200K-token context window drawn as a bar. Fixed costs at the start of every session: system prompt and tool definitions, instruction files, skill names and descriptions. Variable costs that grow during the session: files read, tool and test output, the conversation.](images/context-budget.svg)

Two kinds of content share that space:

**Fixed cost, paid every session.** Before you type anything, the agent has already loaded its own system prompt, the definition of every tool it can call, your instruction files (`AGENTS.md` / `CLAUDE.md` at the root, plus the ones for the apps it is editing), and one line of name and description per installed skill. You pay this whether the task is a typo fix or a new module.

**Variable cost, growing with the session.** Every file the agent reads, every build log, every test run, every message in both directions stays in the window until the session is cleared or compacted. A single `pnpm check` with a failing build can add thousands of tokens. Reading a large generated file "just to be sure" can add tens of thousands.

In Claude Code you can see the breakdown at any time with `/context`. The useful question is not "how big is the window?" but "how much of it is doing useful work right now?".

---

## 2. The dumb zone

If the window were a hard disk, filling it would not matter. It is not. A model's ability to use what is in its context **degrades as the context grows**, and it degrades long before the limit.

![Output quality against context used on a 200K-token window: flat in the smart zone up to roughly 40 percent, declining as returns diminish, falling steeply in the dumb zone past roughly 150K tokens. Three mechanisms: context rot, lost in the middle, distractors.](images/smart-zone-dumb-zone.svg)

### The evidence

- **Context rot.** In July 2025, Chroma tested 18 frontier models (GPT-4.1, Claude 4, Gemini 2.5, Qwen3 and others) on tasks as simple as "find this sentence and repeat it". Every model got worse as the input grew, even though the task never changed. Performance also dropped faster when the relevant text was less similar to the question, and a single similar-but-wrong "distractor" measurably hurt accuracy.
- **Lost in the middle.** A 2023 Stanford study showed a U-shaped curve: models recall information at the start and the end of a long prompt well, and information in the middle poorly. Your instruction files are loaded first, so every file read and tool result that follows pushes them further towards the middle.
- **Attention budget.** Anthropic's engineering team describes the same thing from the model side: each token draws on a finite "attention budget", so the goal of context engineering is "the smallest possible set of high-signal tokens" that gets the job done.

### The rule of thumb

Dex Horthy of HumanLayer, who runs coding agents on large production codebases, calls the usable part of the window the **smart zone** and the rest the **dumb zone**. His guidance is to design the whole workflow around keeping context utilisation at roughly 40–60%, and to clear or compact rather than push through.

You will see different numbers attached to this idea: 40% of the window, 75K tokens, 150K tokens. They are not contradicting each other. They are all saying that the usable window is far smaller than the advertised one, and that the drop is gradual rather than a cliff. On today's 200K models, **by 150K tokens you are unmistakably in the dumb zone**, and the slide started well before that. The exact threshold moves with each model generation, so treat 150K as "clearly too late", not as a target.

### What it looks like in practice

The symptoms are easy to recognise once you know them:

- **Instruction amnesia.** The agent followed the `.js` import rule for an hour, then stops. The rule is still in the window. It is just in the middle now.
- **Repetition.** It suggests a fix it already tried.
- **Context bleed.** Details from an earlier, unrelated task leak into the current one.
- **Confident nonsense.** The answer sounds sure and is wrong.

None of these are fixed by a better prompt. They are fixed by a smaller context.

### Why this is a lesson about instruction files

Instruction files are the one part of the budget **you control completely**, and they are paid on every single session. A 300-line `AGENTS.md` costs you three times on every task:

1. It eats fixed budget before the work starts.
2. It is the first thing in the window, so everything the agent does afterwards pushes it deeper into the middle, where it is read least reliably.
3. Rules the agent does not need right now are, from the model's point of view, distractors.

A long rulebook makes the agent follow rules _less_ reliably, not more.

---

## 3. Two kinds of knowledge: always on, or on demand

The way out is to separate two things that usually get mixed in one file.

**Rules** are short, apply to almost every task, and cause a mistake if the agent does not know them. "Relative imports need `.js`." "Never hand-write API types; derive them from the contract." "Run `pnpm check` before you finish." These belong in `AGENTS.md`, where the agent sees them every time.

**Recipes** are long, apply to one kind of task, and are useless on every other task. The six-step workflow for adding a feature. The template for a Spring controller test. The Docker command for running the stack. These belong in **skills**.

A skill is a folder with a `SKILL.md` file that starts with a name and a one-line description:

```markdown
---
name: add-feature
description: Step-by-step recipe and file templates for adding a feature end to end (JPA entity, Flyway migration, Spring controller + DTO, React page, tests). Use when adding or changing a model, API route, or screen.
---

# Add a feature (contract-first)

...
```

The mechanism that makes this work is **progressive disclosure**:

![Left column, always loaded: the root AGENTS.md, each app's AGENTS.md when that app is edited, and one line of name plus description per skill. Right column, loaded on demand: the full SKILL.md files. Arrows show that a task matching a description makes the agent read that one body.](images/progressive-disclosure.svg)

At the start of a session the agent loads **only the name and description** of each skill, about one line each. When a task matches a description ("add a customers endpoint" matches `add-feature`), the agent reads that skill's full body into context. The other skills stay on disk. The agent pays for a rule every session, but for a recipe only when it uses it.

The description line is doing a lot of work here. It is the only thing the agent sees when deciding whether to load the skill, so it has to say both what the skill contains and **when to use it**. Compare:

- "Testing notes" (vague: never loaded, or loaded for everything)
- "How api `*.spec.ts` and web `*.test.tsx` are written and run. Use when adding or fixing tests." (precise: loaded exactly when needed)

Skills are an open format. The same `SKILL.md` folder is read by Claude Code, Codex, Cursor and Kiro, so the recipe is written once for every tool the team uses.

### The sorting rule

When you are unsure where a paragraph belongs, ask three questions in order:

| Question                                                                           | Answer | Where it goes |
| ---------------------------------------------------------------------------------- | ------ | ------------- |
| Would the agent make a mistake on an _ordinary_ task without this?                 | yes    | `AGENTS.md`   |
| Is it only needed for one kind of task (a workflow, a template, a command recipe)? | yes    | a skill       |
| Can the agent get it from the code, the config, or the tooling anyway?             | yes    | delete it     |

![Decision flow with three questions in order. Would the agent make a mistake on an ordinary task without this? Yes: AGENTS.md, always loaded. Is it only needed for one kind of task? Yes: a skill, loaded on demand. Can the agent get it from the code, the config or the tooling anyway? Yes: delete it. If every answer is no, it is background for humans and belongs in README.md.](images/sorting-rule.svg)

Stop at the first "yes". If every answer is "no", the paragraph is background rather than guidance: keep it in `README.md` for humans and out of the agent's window.

The third question is the one people skip. A Prettier config already exists in the repo and `pnpm format` applies it, so a paragraph describing the quote style is pure cost. A list of the libraries in `package.json` is pure cost. A rule repeated in the root file and in an app file is paid twice.

---

## 4. What we changed in this repository

This repository went through exactly that exercise. Here is the before and after.

![Before: three AGENTS.md files of 52, 24 and 26 lines, about 1,800 tokens, all always loaded. After: 34, 10 and 9 lines, about 1,000 tokens always loaded, plus three skills of about 2,900 tokens loaded on demand. The sorting rule: every session to AGENTS.md, one kind of task to a skill, derivable to delete.](images/agents-md-before-after.svg)

Token counts are estimates (four characters per token). The point is the shape, not the digits: the always-on cost roughly halved, and the total amount of guidance available to the agent went **up**, because the skills can afford to carry full templates that the old files could not.

### What moved into skills

| Was in               | Content                                                              | Now in          |
| -------------------- | -------------------------------------------------------------------- | --------------- |
| root `AGENTS.md`     | the six-step "add a feature" workflow                                | `add-feature`   |
| root `AGENTS.md`     | Flyway migration/seed/reset notes, Docker, `--filter`, Maven gotchas | `repo-commands` |
| root `AGENTS.md`     | env var registration steps (`.env.example`)                          | `repo-commands` |
| `apps/api/AGENTS.md` | the Tests section (`@SpringBootTest`, `MockMvc`)                     | `write-tests`   |
| `apps/web/AGENTS.md` | the Tests section (`QueryClientProvider`, `vi.stubGlobal`)           | `write-tests`   |
| `apps/web/AGENTS.md` | how to add a shadcn/ui component                                     | `add-feature`   |

Each of these got _longer_ in its new home. The test section used to be four bullets pointing at an example file. The skill now contains a complete, copyable spec and component test, because the agent only reads it when it is writing tests.

### What was deleted

- The Prettier settings (single quotes, trailing commas, width 100). `.prettierrc` is the source of truth and `pnpm format` applies it.
- The "Stack" headings in both app files. The root table already names the stack.
- The ESM import rule and the env var rule, which appeared in both the root and the api file. Now stated once.
- The `typescript-config` and `eslint-config` table rows. Nobody edits those during a feature.

### What stayed

Everything left in the three files passes the first question: the agent would do the wrong thing on an ordinary task without it.

- `AGENTS.md`: the package map, contract-first (Java owns it), import rules, where env vars live, "run `pnpm check` and `mvn verify` before finishing", and a list of the skills with one line each on when to use them.
- `apps/api/AGENTS.md`: one package per feature, `@RestController` under `/api`, DTOs as records, JPA repositories only, Spring Security for auth.
- `apps/web/AGENTS.md` (9 lines): typed client only, same-origin `/api`, where routes and components live, Tailwind with `cn()`.

Notice that the root file still ends with a **skill list**. The agent gets skill descriptions from the tool anyway, but a human reading `AGENTS.md` should also learn that the recipes exist and where they are.

---

## 5. How each tool finds the skills

Skills are stored once, in `.agents/skills/`, and the tool-specific folders are symlinks to it:

```
.agents/skills/            ← the real files
  add-feature/SKILL.md
  write-tests/SKILL.md
  repo-commands/SKILL.md
.claude/skills/add-feature → ../../.agents/skills/add-feature
.kiro/skills/add-feature   → ../../.agents/skills/add-feature
```

| Tool        | Where it looks                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Claude Code | `.claude/skills/`. Skills also appear as `/add-feature` style slash commands.                   |
| Codex       | `.agents/skills/` in the repo root and working directory, no symlink needed.                    |
| Cursor      | `.agents/skills/` and `.cursor/skills/`, and it also reads `.claude/skills/` for compatibility. |
| Kiro        | `.kiro/skills/`. Steering files (`.kiro/steering/*.md`) still provide the `AGENTS.md` rules.    |

All four load only the name and description up front and the body on demand. The behaviour you learned in section 3 is the same everywhere.

---

## 6. Other levers

Instruction files are the lever this lesson is about, but the dumb zone theory points at a few more habits worth adopting:

- **Start fresh between tasks.** `/clear` in Claude Code throws away the conversation and keeps the fixed cost. A new task rarely benefits from the previous task's build logs.
- **Compact on purpose.** Before the window fills, have the agent write what it has learned into a short plan or progress file, then clear and continue from that file. HumanLayer calls this "intentional compaction". A good commit message is a form of it.
- **Delegate exploration.** Searching a codebase produces a lot of low-value tokens. A sub-agent can read twenty files and return three sentences, and only the three sentences enter your window. Lesson 6 is about this.
- **Keep tool output terse.** `pnpm check` with `--filter=@erp/web` produces a fraction of the log of a full run. Turborepo's cache does the same for packages you did not touch.
- **Prefer deterministic checks.** A type error from the shared contract is a few lines the agent can act on. "Look through the code for mismatches" is an open-ended search that fills the window with files.
- **Count your tools.** Every MCP server loads all of its tool definitions at startup. Five servers can cost more than every instruction file in this repository combined.

---

## Summary

- The **context window is a budget**. Instruction files, tool definitions and skill descriptions are a fixed cost paid every session; files, logs and conversation are a variable cost that only grows.
- Models degrade long before the window is full. The **smart zone** is roughly the first 40% of the window; by **150K tokens** on a 200K model you are firmly in the **dumb zone**. The mechanisms are context rot, lost-in-the-middle, and distractors.
- Keep **rules** in `AGENTS.md`: short, universal, costly to miss. Move **recipes** into **skills**: long, task-specific, loaded on demand through progressive disclosure. **Delete** anything the agent can derive from the code or tooling.
- This repository halved its always-on instruction cost and gained three full-length recipes by applying exactly that rule.

---

## Optional: try it later

This isn't part of the session. If you're curious, open Claude Code in the repo root and:

```
/context                      # see the budget: system prompt, tools, instruction files, skills
```

Then ask it to add a small feature, for example "add a GET /customers endpoint that returns an empty list", and watch which skill it loads. It should read `add-feature` and nothing else. When it is done, run `/context` again to see how much the work cost, then `/clear` before the next task.

---

## Further reading

- Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (September 2025): context rot, the attention budget, and the "smallest set of high-signal tokens" principle.
- Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) (October 2025): how progressive disclosure works for skills.
- Chroma, [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://www.trychroma.com/research/context-rot) (July 2025): the 18-model study.
- Liu et al., [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) (2023): the U-shaped recall curve.
- HumanLayer, [Advanced Context Engineering for Coding Agents](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents) (`ace-fca.md`): the 40–60% utilisation guidance and intentional compaction.
- [Agent Skills](https://agentskills.io): the open `SKILL.md` format used by Claude Code, Codex, Cursor and Kiro.
