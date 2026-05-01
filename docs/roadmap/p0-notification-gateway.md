# P0 Roadmap: Notification Gateway

Date: 2026-05-01

## Positioning

Notification is the outbound side of DSA's daily workflow. Reports, alerts, system failures,
LLM budget warnings, and portfolio risk events should not all be treated as the same generic
message. The goal is to evolve the current notification module into a testable, routable,
and noise-controlled gateway.

## Current Direction

DSA already supports several native channels, including WeChat Work, Feishu, Telegram, email,
Pushover, PushPlus, ServerChan, Discord, Slack, AstrBot, and custom webhook. The next step is
not to add every possible platform as first-class code. The next step is to make notification
delivery manageable.

## Goals

| Goal | Expected outcome |
| --- | --- |
| Channel testing | Users can verify a channel from Web before trusting it for alerts. |
| Delivery logs | Successful and failed sends are visible with latency and error summaries. |
| Routing policy | Reports, alerts, system errors, cost warnings, and portfolio risks can use different channels. |
| Webhook body templates | Users can adapt generic webhooks to AstrBot, NapCat, and similar integrations. |
| Noise controls | Deduplication, cooldown, quiet hours, severity levels, and digest mode reduce alert fatigue. |
| Long-tail channel support | Bark, ntfy, Gotify, WebPush, and other channels can be supported without bloating the core. |

## Apprise Boundary

Apprise should be considered an optional aggregation layer, not a replacement for native
high-value channels.

| Area | Recommendation |
| --- | --- |
| Core channels | Keep native implementations for channels with existing usage and custom behavior. |
| Long-tail channels | Evaluate Apprise for Bark, ntfy, Gotify, Matrix, Mastodon, and similar channels. |
| User experience | Hide Apprise complexity behind presets where possible. |
| Risk | Do not make Apprise a hard dependency for users who only need existing channels. |

## Proposed Capabilities

### Channel test API

Each configured channel should be testable through API and Web:

- validates required fields;
- sends a small test message;
- records success, failure, latency, and sanitized error details;
- never exposes tokens, webhook secrets, cookies, or raw headers.

### Notification routing

Suggested event classes:

| Event class | Examples |
| --- | --- |
| `analysis_report` | Single-stock report, batch report, market review. |
| `realtime_alert` | Price, indicator, volume, portfolio risk, market red light. |
| `system_error` | Data source failure, worker crash, scheduler failure. |
| `llm_cost` | Budget warning, provider quota issue, fallback exhaustion. |
| `portfolio_risk` | Stop-loss proximity, concentration risk, drawdown threshold. |

Routing should support:

- default channel;
- per-event channel override;
- severity-based override;
- digest mode for low-severity events;
- immediate delivery for high-severity events.

### Webhook body templates

Custom webhook should support configurable request bodies, not only a fixed payload:

- method, URL, headers, and body template;
- variables such as `title`, `content`, `severity`, `event_type`, `stock_code`, `stock_name`;
- JSON and form body presets;
- dry-run preview before sending.

This unlocks integrations such as AstrBot, NapCat, and other bot bridges without adding
one bespoke sender for every platform.

### Noise controls

| Control | Meaning |
| --- | --- |
| Deduplication | Avoid sending the same alert repeatedly in a short window. |
| Cooldown | Do not resend the same rule until its cooldown expires. |
| Quiet hours | Suppress or digest non-critical events during configured hours. |
| Severity | `info`, `warning`, `critical` should drive delivery behavior. |
| Digest | Combine low-priority events into daily or session summaries. |

## Non-Goals

- Do not implement every bot platform as a native notification sender.
- Do not make Apprise mandatory for existing notification users.
- Do not let one failed channel fail the analysis pipeline.
- Do not expose webhook secrets or API keys in Web test results.

## Acceptance Criteria

- A user can test each configured channel from Web and see a readable result.
- Custom webhook supports user-defined body templates.
- Notification failures are stored or surfaced without breaking the main analysis flow.
- Routing can send different event classes to different channels.
- Cooldown and deduplication prevent repeated low-value alerts.
- Documentation explains native channels, custom webhook, and optional Apprise usage.

## Suggested PR Slices

1. Notification test API and Web test action.
2. Delivery result model and recent notification log view.
3. Custom webhook body template support.
4. Routing policy and severity model.
5. Bark, ntfy, Gotify, WebPush, and optional Apprise integration.
