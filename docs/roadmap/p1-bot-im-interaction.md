# P1 Roadmap: Bot and IM Interaction Entry

Date: 2026-05-01

## Positioning

Bot interaction is not the same as notification delivery.

- Notification is system-initiated: DSA pushes reports, alerts, and failures to users.
- Bot interaction is user-initiated: users ask questions, trigger tasks, inspect status,
  manage alerts, and fetch portfolio or market summaries from chat channels.

Many DSA users will interact through Feishu, WeChat Work, Telegram, AstrBot, NapCat, or similar
IM environments more often than they open the Web UI. Bot interaction should therefore become
a lightweight product entry point.

## Goals

| Goal | Expected outcome |
| --- | --- |
| Unified command protocol | Common commands behave consistently across supported bot channels. |
| Market query | `/market` returns the same market review and market light summary used by Web and notifications. |
| Stock analysis | `/analyze 600519` or natural stock mentions can trigger a short analysis or background task. |
| Portfolio summary | Users can query position summary and risk highlights from chat. |
| Alert management | Users can list, pause, resume, and create simple alert rules. |
| Task status | Users can see queued, running, completed, and failed states. |
| Permission controls | Private chat, group chat, admin-only commands, and allowlists are respected. |
| Audit trail | Bot-triggered actions are recorded with channel, user, command, and result. |

## Priority Channels

| Channel | Recommendation |
| --- | --- |
| Feishu | High priority because existing docs and webhook usage are already important to users. |
| WeChat Work | High priority for Chinese enterprise and group notification workflows. |
| Telegram | High priority for individual power users and global deployment. |
| AstrBot / NapCat | Support through webhook/body-template bridge first, then evaluate native adapters. |
| Discord / Slack | Keep existing notification support; interactive commands can be later-stage. |

## Command Set

| Command | Purpose |
| --- | --- |
| `/help` | Show supported commands and examples. |
| `/market` | Return market review light, score, reasons, and next-session focus. |
| `/analyze <symbol>` | Trigger or fetch a stock analysis. |
| `/portfolio` | Return portfolio summary, PnL, and risk highlights. |
| `/alerts` | List active alert rules and recent triggers. |
| `/alert add ...` | Create simple price or return threshold alert. |
| `/alert pause <id>` | Pause an alert rule. |
| `/status <task_id>` | Show task state and failure reason. |
| `/settings` | Show safe, non-secret configuration status. |

Natural-language routing can be layered on top, but explicit commands should remain stable
and documented.

## Interaction Behaviors

### Stock parsing

Bot input should reuse the same stock resolution logic as Web and Agent:

- stock code;
- Chinese name;
- pinyin initials;
- A-share, Hong Kong, and US market prefixes;
- low-confidence confirmation instead of silently choosing the wrong symbol.

### Confirmation

Bot should ask for confirmation when:

- multiple stock candidates match;
- an action may be expensive;
- a command affects alert rules or persistent state;
- the chat is a group and the command targets private portfolio information.

### Task state

Long-running analysis should not leave the user guessing. Bot responses should expose:

- accepted;
- queued;
- running;
- completed;
- failed;
- cancelled;
- degraded because a data source, LLM, or notification channel failed.

## Permission Model

| Scope | Requirement |
| --- | --- |
| Public market query | Can be allowed in group chats. |
| Stock analysis | Can be allowed in group chats, with rate limits. |
| Portfolio query | Private chat or allowlisted users only. |
| Alert changes | Admin or owner confirmation. |
| Configuration status | Safe summary only; never return secrets. |
| Local tools | Read-only by default and gated by explicit allowlists. |

## Shared Components

Bot interaction should reuse existing and planned components rather than inventing parallel logic:

| Component | Reuse |
| --- | --- |
| Notification gateway | Message sending, templates, channel health, delivery logs. |
| Alert center | Alert CRUD, trigger history, pause/resume actions. |
| Market review 2.0 | `/market` and market-light responses. |
| Agent tools | Stock resolution, analysis history, portfolio snapshot. |
| Task queue | Background task creation, progress, and cancellation. |
| Audit log | User, channel, command, target, and result. |

## Non-Goals

- Do not implement every IM platform as a first-class native adapter.
- Do not expose private portfolio data in group chats by default.
- Do not allow real-money trading or broker actions through bot commands.
- Do not rely only on LLM intent routing; explicit commands must remain reliable.

## Acceptance Criteria

- A user can query market review from at least one bot channel.
- A user can trigger stock analysis and inspect task status.
- Basic alert listing and pause/resume commands are supported.
- Permission checks prevent portfolio leaks in group chats.
- Bot responses use concise mobile-friendly templates.
- Bot-triggered actions are auditable.

## Suggested PR Slices

1. Unified bot command contract and response schema.
2. `/market`, `/analyze`, `/status`, and `/help` MVP.
3. Stock resolution and low-confidence confirmation.
4. Alert list and pause/resume commands.
5. Portfolio summary with private-chat and allowlist gates.
6. Audit logging for bot-triggered actions.
