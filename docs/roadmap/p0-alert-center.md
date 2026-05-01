# P0 Roadmap: Realtime Alert Center

Date: 2026-05-01

## Positioning

The Alert Center is the core loop that turns DSA from a daily report tool into a practical
watchlist and portfolio monitoring assistant. It should connect market data, technical
signals, portfolio risk, market review results, and notification routing into one reliable
workflow.

## Problem

DSA has early event monitoring capability, but the product loop is incomplete:

- users cannot manage alert rules from Web;
- there is no durable trigger history for review and debugging;
- notification routing and cooldown policy are not first-class alert concepts;
- current rules are too narrow for portfolio and market-level monitoring;
- alert failures are hard to distinguish from data source or notification failures.

## Goals

| Goal | Expected outcome |
| --- | --- |
| Alert model | Persist rules, trigger records, notification records, and cooldown state. |
| Alert API | Support create, read, update, delete, enable, disable, test, and trigger history. |
| Web Alert Center | Users can manage rules and inspect recent triggers from Web. |
| Rich rule types | Cover price, return, volume, moving average, RSI, MACD, KDJ, CCI, and event rules. |
| Portfolio linkage | Alerts can target holdings, watchlists, or manually selected symbols. |
| Market linkage | Market red-light state, index drops, and sector anomalies can trigger alerts. |
| Notification integration | Alerts use severity, routing, cooldown, and digest settings from the notification gateway. |

## Rule Categories

| Category | Example rules |
| --- | --- |
| Price | Price crosses threshold, breaks support/resistance, reaches stop-loss. |
| Return | Intraday gain/loss exceeds configured percentage. |
| Volume | Volume spike, abnormal turnover, volume ratio threshold. |
| Technical indicator | MA cross, RSI overbought/oversold, MACD cross, KDJ, CCI. |
| Portfolio risk | Concentration limit, drawdown threshold, stop-loss proximity, stale price warning. |
| Calendar | Earnings date, dividend date, scheduled report date. |
| Market review | Market light turns red/yellow, index crash, sector risk event. |
| News intelligence | Negative news, policy risk, high-severity event for holdings or watchlist. |

## Data Model Sketch

| Entity | Purpose |
| --- | --- |
| `alert_rule` | User-defined condition, target scope, schedule, severity, and channel policy. |
| `alert_trigger` | Immutable record of a rule firing, including observed values and reason. |
| `alert_notification` | Delivery attempts and results for each trigger. |
| `alert_cooldown` | Rule-level and target-level cooldown state. |

The first implementation can use existing storage patterns and avoid introducing a new
database migration framework until storage upgrade work begins.

## API Surface

Suggested endpoints:

- `GET /api/v1/alerts/rules`
- `POST /api/v1/alerts/rules`
- `PATCH /api/v1/alerts/rules/{rule_id}`
- `DELETE /api/v1/alerts/rules/{rule_id}`
- `POST /api/v1/alerts/rules/{rule_id}/test`
- `GET /api/v1/alerts/triggers`
- `GET /api/v1/alerts/notifications`

All APIs should avoid leaking provider credentials, webhook URLs, or raw notification headers.

## Web Experience

The Web Alert Center should include:

- rule list with enabled state, severity, last trigger time, and next eligible trigger time;
- rule creation form with type-specific fields;
- trigger history table with observed values and reason;
- notification result details;
- quick filters for holdings, watchlist, market, and system alerts;
- one-click pause or resume for noisy rules.

## Scheduling and Evaluation

Initial implementation should keep evaluation predictable:

- use configured polling intervals;
- respect market calendars and trading sessions;
- skip stale or unavailable data where appropriate;
- mark degraded evaluations instead of pretending data is complete;
- avoid running expensive LLM calls for every rule evaluation.

LLM-assisted interpretation can be added later for digest summaries and high-severity events.

## Non-Goals

- Do not support automatic real-money trading.
- Do not evaluate every possible technical indicator in the first version.
- Do not require users to configure alerts before running daily analysis.
- Do not let a single alert rule failure stop other rules or the main analysis pipeline.

## Acceptance Criteria

- Users can create, pause, test, and delete basic alert rules from Web.
- Price, return, volume, and at least one technical indicator rule are supported.
- Alerts can target holdings and watchlist symbols.
- Trigger history explains why a rule fired.
- Notification delivery is routed through the notification gateway and records success or failure.
- Cooldown prevents repeated messages from the same rule and target.

## Suggested PR Slices

1. Alert rule and trigger storage model.
2. Alert CRUD and test APIs.
3. Worker evaluation for price, return, volume, and indicator rules.
4. Web Alert Center MVP.
5. Portfolio and market-review linkage.
6. Notification routing, cooldown, and digest integration.
