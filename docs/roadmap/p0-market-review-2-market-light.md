# P0 Roadmap: Market Review 2.0 and Market Light

Date: 2026-05-01

## Positioning

Market review and the red/yellow/green market light should be one report, not two separate
outputs. The full market review is the report. The market light is the structured conclusion
at the top of that report and should be reused by Web, notifications, Agent, and alert rules.

## Current Direction

DSA already supports market review for A-share, Hong Kong, US, and combined regions, and the
report already has a market temperature concept. Market Review 2.0 should formalize that
work into a stable schema and a reusable product surface.

## Report Structure

```text
Market Review Report
├── Market Light
│   ├── Status: green / yellow / red
│   ├── Score: 0-100
│   ├── Key reasons: 3-5 items
│   └── Action guidance: position, risk, next-session watchlist
├── Index performance
├── Advance/decline distribution
├── Sector and capital-flow themes
├── Hot stocks / risk stocks
├── Northbound capital / external variables
├── News and policy highlights
├── Risk notes
└── Next-session focus
```

## Concept Boundaries

| Concept | Role |
| --- | --- |
| Market review | The complete market report. |
| Market light | The structured conclusion at the top of the report. |
| Market temperature score | The numerical score behind the market light. |
| Alert linkage | Alert rules read the same structured market light result. |
| Web market overview | Web renders the same structured report data. |

## Goals

| Goal | Expected outcome |
| --- | --- |
| Stable schema | A `MarketLightSnapshot` can be consumed by Web, notifications, Agent, and alerts. |
| Better review content | The report includes sector themes, hot stocks, risk stocks, and next-session focus. |
| Data transparency | Northbound capital, market breadth, and external variables include date and source context. |
| Reusable output | One report powers CLI, Web, Bot, notifications, and Agent context. |
| Alert integration | Red/yellow states can trigger portfolio and market risk alerts. |

## Market Light Schema Sketch

| Field | Meaning |
| --- | --- |
| `region` | `cn`, `hk`, `us`, or combined region. |
| `trade_date` | Market date used by the review. |
| `status` | `green`, `yellow`, or `red`. |
| `score` | 0-100 market temperature score. |
| `dimensions` | Per-dimension score and explanation. |
| `reasons` | Top 3-5 reasons for the light status. |
| `guidance` | Position, risk, and next-session guidance. |
| `data_quality` | Missing, stale, estimated, or degraded data flags. |

## Scoring Dimensions

| Dimension | Notes |
| --- | --- |
| Index trend | Major index direction, moving average state, volatility. |
| Market breadth | Advance/decline distribution, limit-up/limit-down counts where available. |
| Volume and turnover | Expansion, contraction, abnormal turnover. |
| Capital flow | Sector flows, main capital flow, and northbound capital for A-shares. |
| Sector diffusion | Whether strength is broad or concentrated in a few themes. |
| Sentiment | News tone, risk headlines, hot-stock behavior. |
| External risk | US indices, USD/CNH, commodities, crypto risk sentiment, where relevant. |

## Northbound Capital Rules

Northbound capital should be high weight for A-share review but must not be treated casually:

- always mark data date and source;
- distinguish final data from intraday or estimated data;
- never silently use yesterday's value as today's value;
- include口径说明 when multiple sources disagree;
- degrade the dimension rather than hallucinating a value when data is missing.

## Product Surfaces

| Surface | Use |
| --- | --- |
| Web home | Show today's light, score, reasons, and recent trend. |
| Market overview page | Render full report sections and dimension breakdown. |
| Notification | Send concise market light plus reasons and next-session focus. |
| Bot / IM | `/market` returns the same structured summary. |
| Agent | Use the snapshot as market context for stock and portfolio answers. |
| Alert center | Red light or sudden score drop can trigger risk alerts. |

## Non-Goals

- Do not create a separate "red light report" in addition to market review.
- Do not rely only on LLM prose for the light status.
- Do not fabricate missing breadth, flow, or northbound capital data.
- Do not make every market use the same dimension weights without market-specific tuning.

## Acceptance Criteria

- Market review emits a structured market light snapshot.
- The report clearly shows status, score, reasons, and action guidance.
- A-share northbound capital includes date and source context.
- Notifications can render a concise version from the same report data.
- Web and Bot can consume the same structured payload without parsing prose.
- Alert rules can subscribe to red/yellow status or large score changes.

## Suggested PR Slices

1. `MarketLightSnapshot` schema and report payload contract.
2. A-share scoring dimensions and northbound capital handling.
3. Web market overview card and report detail rendering.
4. Notification and Bot templates for market light.
5. Alert-center linkage for red/yellow market states.
