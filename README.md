# 📈 股票智能分析系统

[![GitHub stars](https://img.shields.io/github/stars/ZhuLinsen/daily_stock_analysis?style=social)](https://github.com/ZhuLinsen/daily_stock_analysis/stargazers)
[![CI](https://github.com/ZhuLinsen/daily_stock_analysis/actions/workflows/ci.yml/badge.svg)](https://github.com/ZhuLinsen/daily_stock_analysis/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Ready-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/)

<div align="center">

<p>
  <a href="https://trendshift.io/repositories/18527" target="_blank"><img src="https://trendshift.io/api/badge/repositories/18527" alt="ZhuLinsen%2Fdaily_stock_analysis | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
  <a href="https://hellogithub.com/repository/ZhuLinsen/daily_stock_analysis" target="_blank"><img src="https://api.hellogithub.com/v1/widgets/recommend.svg?rid=6daa16e405ce46ed97b4a57706aeb29f&claim_uid=pfiJMqhR9uvDGlT&theme=neutral" alt="Featured｜HelloGitHub" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</p>

</div>

> 🤖 基于 AI 大模型的 A股/港股/美股自选股智能分析系统，每日自动分析并推送「决策仪表盘」到企业微信/飞书/Telegram/Discord/Slack/邮箱

[**核心能力**](#-核心能力) · [**快速开始**](#-快速开始) · [**推送效果**](#-推送效果) · [**运行与部署**](#-运行与部署) · [**文档导航**](#-文档导航)

简体中文 | [English](docs/README_EN.md) | [繁體中文](docs/README_CHT.md)

## 💖 赞助商 (Sponsors)
<div align="center">
  <a href="https://serpapi.com/baidu-search-api?utm_source=github_daily_stock_analysis" target="_blank">
    <img src="./sources/serpapi_banner_zh.png" alt="轻松抓取搜索引擎上的实时金融新闻数据 - SerpApi" height="160">
  </a>
</div>
<br>

## ✨ 核心能力

- 每日自动生成 AI 决策仪表盘（买入/观望/卖出结论 + 关键点位 + 操作清单）
- 覆盖 A 股、港股、美股及主要指数的市场扫描
- 多源数据与模型入口：行情、新闻检索、情绪、技术面、基本面
- 回测与持仓链路：AI 预测与次日验证、持仓事件与风险快照
- 多渠道消息推送 + Web + API + Bot 多端统一体验
- GitHub Actions、Docker、FastAPI 服务和本地模式一体化运行

> 长桥只在配置 `LONGBRIDGE_*` 时参与 US/HK 行情；未配置时不调用 Longbridge，行为沿用原有数据源优先级。

### 技术栈与数据来源

| 类型 | 支持 |
|------|------|
| AI 模型 | [AIHubMix](https://aihubmix.com/?aff=CfMq)、Gemini、OpenAI 兼容、DeepSeek、通义千问、Claude、Ollama 本地模型 等（统一通过 [LiteLLM](https://github.com/BerriAI/litellm) 调用，支持多 Key 负载均衡）|
| 行情数据 | AkShare、Tushare、Pytdx、Baostock、YFinance、[Longbridge](https://open.longbridge.com/)（美股/港股首选数据源） |
| 新闻搜索 | Tavily、SerpAPI、Bocha、Brave、MiniMax |
| 社交舆情 | [Stock Sentiment API](https://api.adanos.org/docs)（Reddit / X / Polymarket，仅美股，可选） |

> **长桥优先策略（仅美/港股）**：在配置 `LONGBRIDGE_APP_KEY` / `LONGBRIDGE_APP_SECRET` / `LONGBRIDGE_ACCESS_TOKEN` 的前提下，美股与港股的 **日线 K 线** 与 **实时行情** 由 **Longbridge 优先拉取**；若长桥失败或部分字段缺失，再由 **YFinance（美股）/ AkShare（港股）** 兜底或合并补全字段。**未配置长桥凭据时不会调用 Longbridge**，美股/港股仍以 YFinance / AkShare 为主数据源（与未集成长桥前的行为一致）。**美股大盘指数**（如 SPX）始终以 YFinance 优先（长桥不提供指数行情）。**A 股**路由不变，仍为 Efinance → AkShare → Tushare → Pytdx → Baostock。详见 `.env.example` 与 [完整指南](docs/full-guide.md) 中长桥说明。

### 内置交易纪律

| 规则 | 说明 |
|------|------|
| 严禁追高 | 乖离率超阈值（默认 5%，可配置）自动提示风险；强势趋势股自动放宽 |
| 趋势交易 | MA5 > MA10 > MA20 多头排列 |
| 精确点位 | 买入价、止损价、目标价 |
| 检查清单 | 每项条件以「满足 / 注意 / 不满足」标记 |
| 新闻时效 | 可配置新闻最大时效（默认 3 天），避免使用过时信息 |

### 📎 已下沉配置明细（简化目录）

<details>
<summary>AI 与通知配置快速检索（与完整指南保持一致）</summary>

### AI 模型配置（示例）

> 详细配置见 [完整指南](docs/full-guide.md) 与 [LLM 配置指南](docs/LLM_CONFIG_GUIDE.md)。
> 💡 **推荐 [AIHubMix](https://aihubmix.com/?aff=CfMq)**：一个 Key 即可使用 Gemini、GPT、Claude、DeepSeek 等全球主流模型，无需科学上网，含免费模型（glm-5、gpt-4o-free 等），付费模型高稳定性无限并发。本项目可享 **10% 充值优惠**。

| Secret 名称 | 说明 | 必填 |
|------------|------|:----:|
| `AIHUBMIX_KEY` | [AIHubMix](https://aihubmix.com/?aff=CfMq) API Key | 可选 |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) API Key | 可选 |
| `OPENAI_API_KEY` | OpenAI 兼容 API Key | 可选 |
| `OPENAI_BASE_URL` | OpenAI 兼容 API 地址 | 可选 |
| `OPENAI_MODEL` | 模型名称 | 可选 |
| `OPENAI_VISION_MODEL` | 图片识别专用模型 | 可选 |
| `OLLAMA_API_BASE` | Ollama 本地服务地址（不要使用 OPENAI_BASE_URL） | 可选 |

### 通知渠道与基本变量

| Secret 名称 | 说明 | 必填 |
|------------|------|:----:|
| `WECHAT_WEBHOOK_URL` | 企业微信 Webhook URL | 可选 |
| `FEISHU_WEBHOOK_URL` | 飞书 Webhook URL | 可选 |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | 可选 |
| `TELEGRAM_CHAT_ID` | Telegram Chat ID | 可选 |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | 可选 |
| `SLACK_BOT_TOKEN` | Slack Bot Token | 可选 |
| `EMAIL_SENDER` | 发件人邮箱 | 可选 |
| `EMAIL_PASSWORD` | 邮箱授权码 | 可选 |
| `PUSHPLUS_TOKEN` | PushPlus Token | 可选 |
| `CUSTOM_WEBHOOK_URLS` | 自定义 Webhook（逗号分隔） | 可选 |
| `MARKDOWN_TO_IMAGE_CHANNELS` | Markdown 转图渠道 | 可选 |
| `MARKDOWN_TO_IMAGE_MAX_CHARS` | Markdown 转图阈值 | 可选 |
| `REPORT_TYPE` | 报告类型 | 可选 |
| `REPORT_LANGUAGE` | 报告语言 | 可选 |
| `REPORT_SUMMARY_ONLY` | 仅返回汇总结果 | 可选 |
| `REPORT_TEMPLATES_DIR` | Jinja2 模板目录 | 可选 |
| `REPORT_RENDERER_ENABLED` | 启用模板渲染 | 可选 |
| `REPORT_INTEGRITY_ENABLED` | 报告完整性校验 | 可选 |
| `REPORT_INTEGRITY_RETRY` | 完整性重试次数 | 可选 |
| `ANALYSIS_DELAY` | 分析间隔（秒） | 可选 |
| `SINGLE_STOCK_NOTIFY` | 单股推送开关 | 可选 |
| `MAX_WORKERS` | 并发工作线程 | 可选 |

### 运行模式与数据源

| Secret 名称 | 说明 | 必填 |
|------------|------|:----:|
| `STOCK_LIST` | 自选股列表 | ✅ |
| `TAVILY_API_KEYS` | 新闻搜索 API | 推荐 |
| `MINIMAX_API_KEYS` | MiniMax 搜索 API | 可选 |
| `SERPAPI_API_KEYS` | SerpAPI 搜索 API | 可选 |
| `BOCHA_API_KEYS` | 博查搜索 API | 可选 |
| `BRAVE_API_KEYS` | Brave Search API | 可选 |
| `SEARXNG_BASE_URLS` | SearXNG 自建实例地址 | 可选 |
| `SEARXNG_PUBLIC_INSTANCES_ENABLED` | 自动发现公共实例开关 | 可选 |
| `TUSHARE_TOKEN` | Tushare Pro Token | 可选 |
| `TICKFLOW_API_KEY` | TickFlow API Key | 可选 |
| `LONGBRIDGE_APP_KEY` | Longbridge App Key | 可选 |
| `LONGBRIDGE_APP_SECRET` | Longbridge App Secret | 可选 |
| `LONGBRIDGE_ACCESS_TOKEN` | Longbridge Access Token | 可选 |
| `LONGBRIDGE_STATIC_INFO_TTL_SECONDS` | Longbridge 缓存 TTL | 可选 |
| `LONGBRIDGE_HTTP_URL` | Longbridge HTTP 接口 | 可选 |
| `LONGBRIDGE_QUOTE_WS_URL` | 行情 WebSocket 地址 | 可选 |
| `LONGBRIDGE_TRADE_WS_URL` | 交易 WebSocket 地址 | 可选 |
| `LONGBRIDGE_REGION` | 覆盖接入点 | 可选 |
| `LONGBRIDGE_ENABLE_OVERNIGHT` | 夜盘行情开关 | 可选 |
| `LONGBRIDGE_PUSH_CANDLESTICK_MODE` | K 线推送模式 | 可选 |
| `LONGBRIDGE_PRINT_QUOTE_PACKAGES` | 行情包打印开关 | 可选 |
| `PREFETCH_REALTIME_QUOTES` | 实时行情预取开关 | 可选 |
| `WECHAT_MSG_TYPE` | 企微消息类型 | 可选 |
| `NEWS_STRATEGY_PROFILE` | 新闻策略窗口 | 可选 |
| `NEWS_MAX_AGE_DAYS` | 新闻最大时效 | 可选 |
| `BIAS_THRESHOLD` | 乖离率阈值 | 可选 |

> 旧版 README 中这部分原为详细参数矩阵；当前仅保留入口，完整解释见下列标题入口（实际以 full-guide 为准）：
> - [AI 模型配置（至少配置一个）](docs/full-guide.md#ai-模型配置)
> - [通知渠道配置](docs/full-guide.md#通知渠道配置可同时配置多个)
> - [其他配置](docs/full-guide.md#其他配置)
> - [GitHub Actions 详细配置](docs/full-guide.md#gitHub-actions-详细配置)

#### 2. 配置 Secrets

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

> 旧文档提示：可选 [AIHubMix / Gemini / Anthropic / Ollama]、通知渠道、数据源与运行参数，见全量环境变量表。

### 方式三：Docker 与服务化

```bash
cp .env.example .env
docker compose up -d
```

### 方式四：GitHub Actions 触发项

`Actions` → `每日股票分析` → `Run workflow` → `Run workflow`

</details>

## 🚀 快速开始

### 方式一：GitHub Actions（推荐）

> 5 分钟完成部署，零成本，无需服务器。

#### 1. Fork 本仓库

点击右上角 `Fork` 按钮（顺便点个 Star⭐ 支持一下）

#### 2. 配置 Secrets

最少建议配置：

- `AIHUBMIX_KEY` 或 `GEMINI_API_KEY` 或 `OPENAI_API_KEY`（任选其一）
- `STOCK_LIST`（例如 `600519,hk00700,AAPL`）
- `WECHAT_WEBHOOK_URL` 或 `TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID`（至少一个推送渠道）
- `TAVILY_API_KEYS`（新闻检索）

完整变量含义、优先级与高级配置详见 [完整指南](docs/full-guide.md)。

#### 3. 启用 Actions

进入 `Actions` 页签 → `I understand my workflows, go ahead and enable them`。

选择 `每日股票分析` → `Run workflow` 执行一次。

#### 4. 手动测试

`Actions` → `每日股票分析` → `Run workflow` → `Run workflow`

#### 完成

默认每个**工作日 18:00（北京时间）**自动执行，也可手动触发。默认非交易日（含 A/H/US 节假日）不执行。

### 方式二：本地运行 / Docker 部署

```bash
git clone https://github.com/ZhuLinsen/daily_stock_analysis.git
cd daily_stock_analysis
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
vim .env
python main.py
```

### 方式三：本地 API 与定时

```bash
python main.py --schedule
python main.py --market-review
python main.py --stocks 600519,AAPL,hk00700
python main.py --serve
python main.py --serve-only
python main.py --debug
python main.py --dry-run
```

## 📱 推送效果

报告输出与模板渲染参数（是否分批、是否转图、语言与短报模式）见 [完整指南](docs/full-guide.md) 与 [LLM 配置说明](docs/LLM_CONFIG_GUIDE.md)。

## 📦 运行与部署

### 常用命令

```bash
docker compose up -d
python main.py --help
python main.py --serve --port 8000
```

### 可选入口

- Web 服务：`python main.py --serve` 后访问 `http://127.0.0.1:8000/docs`
- GitHub Actions：Fork 仓库后在 `Actions` 配置并触发
- Docker 部署：`docker compose up -d`（结合 `.env` 与 `compose` 文件）

> WebUI、Docker 与桌面端的行为差异与兼容性请继续查阅 `docs/full-guide.md`。

## 📚 文档导航

- [完整配置与部署指南](docs/full-guide.md)
- [常见问题（FAQ）](docs/FAQ.md)
- [更新日志](docs/CHANGELOG.md)
- [LLM 配置指南](docs/LLM_CONFIG_GUIDE.md)
- [贡献说明](docs/CONTRIBUTING.md)
