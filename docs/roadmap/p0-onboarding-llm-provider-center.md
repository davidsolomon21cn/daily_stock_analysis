# P0 Roadmap: First-Run Setup and LLM Provider Center

Date: 2026-05-01

## Positioning

This roadmap item turns the existing configuration surface into a guided setup path.
DSA already has `LLM_CHANNELS`, LiteLLM routing, fallback models, a Web LLM channel editor,
and the read-only setup status API. The next step is not to rewrite those foundations,
but to make them understandable and testable for first-time users.

## Problem

New users still need to understand too much before they can run the first useful analysis:

- which deployment mode they are using: local, Docker, GitHub Actions, or Desktop;
- which LLM provider keys and model names are required;
- how `LLM_CHANNELS`, `LITELLM_MODEL`, `AGENT_LITELLM_MODEL`, and fallback models relate;
- why GitHub Actions needs explicit secret and variable mappings;
- whether a failure is caused by authentication, quota, network, model discovery, JSON parsing, or tool calling.

## Goals

| Goal | Expected outcome |
| --- | --- |
| Web first-run wizard | A user can complete the minimum setup without reading the full `.env.example` first. |
| CLI setup | `dsa init` can generate a minimal `.env` for terminal and server users. |
| Configuration diagnosis | `dsa doctor` and Web diagnostics explain what is missing and how to fix it. |
| LLM provider presets | Users can pick common providers without manually finding base URLs and model examples. |
| GitHub Actions helper | Users can map local config to Actions secrets and variables confidently. |
| Minimal config template | `.env.minimal.example` documents the shortest supported path to a working setup. |

## Provider Scope

The first batch should cover providers users are most likely to request or already use:

| Provider | Suggested preset key | Notes |
| --- | --- | --- |
| OpenAI | `openai` | Official OpenAI API and OpenAI-compatible defaults. |
| DeepSeek | `deepseek` | Official DeepSeek channel and common fallback model examples. |
| Gemini | `gemini` | Existing Gemini path, including vision where applicable. |
| Claude | `anthropic` | Anthropic-compatible channel. |
| Kimi / Moonshot | `moonshot` | Include Kimi temperature caveats already documented in the LLM guide. |
| Qwen / DashScope | `dashscope` | OpenAI-compatible path where supported. |
| Zhipu | `zhipu` | Prefer OpenAI-compatible preset if the selected API supports it. |
| MiniMax | `minimax` | Preserve existing `minimax/<model>` model-name handling. |
| Volcengine Ark | `volcengine` | Treat as provider preset, not a separate runtime architecture. |
| SiliconFlow | `siliconflow` | Common OpenAI-compatible aggregation provider. |
| OpenRouter | `openrouter` | Common multi-model aggregation provider. |
| Ollama | `ollama` | Local model path; should not require an API key. |

## Proposed User Flows

### Web first-run wizard

1. Detect setup status through the existing read-only setup status API.
2. Ask for deployment mode: local, Docker, GitHub Actions, or Desktop.
3. Let the user choose an LLM provider preset.
4. Collect API key, base URL, primary model, Agent model, fallback models, and optional vision model.
5. Run a staged LLM test:
   - model discovery;
   - chat completion;
   - structured JSON response;
   - tool calling, when supported;
   - vision, when configured.
6. Let the user add one to three watchlist stocks.
7. Offer optional notification setup.
8. Run a dry-run or one-stock smoke test.

### CLI setup

`dsa init` should produce the same effective `.env` shape as the Web setup flow:

- ask only the minimum questions first;
- offer provider presets;
- write `.env` without printing secrets back to the terminal;
- support `--provider`, `--actions`, and `--dry-run` flags later.

### Diagnostics

`dsa doctor` and the Web diagnostics page should report structured failures:

| Field | Meaning |
| --- | --- |
| `stage` | `model_discovery`, `chat_completion`, `response_parse`, `tool_calling`, `vision`, or `storage`. |
| `error_code` | `auth`, `quota`, `timeout`, `model_not_found`, `empty_response`, `format_error`, or `network_error`. |
| `retryable` | Whether retrying without config changes is useful. |
| `message` | Human-readable explanation. |
| `suggestion` | The next concrete action the user can take. |

## Non-Goals

- Do not replace `.env`, `LLM_CHANNELS`, or LiteLLM routing.
- Do not silently migrate or delete existing legacy provider keys.
- Do not store plain API keys in frontend state or return unmasked secrets through APIs.
- Do not make notification setup mandatory for first successful analysis.

## Acceptance Criteria

- Empty or partial configuration states are clearly detected and explained.
- A new user can configure at least one supported LLM provider and run a smoke test from Web.
- A terminal-only user can generate a minimal `.env` with `dsa init`.
- LLM test failures show a clear failure stage and error category.
- GitHub Actions users can copy a provider-specific secrets and variables checklist.
- Documentation covers local, Docker, GitHub Actions, and Desktop setup paths.

## Suggested PR Slices

1. Provider preset metadata and docs.
2. Web first-run wizard MVP using the existing setup status API.
3. `dsa init` and `.env.minimal.example`.
4. `dsa doctor` staged diagnostics.
5. GitHub Actions configuration export and provider examples.
