# LLM 服务商配置速查

本文面向首次上手用户和部署用户，提供「选配置方式 → 选厂商 → 配置映射 → 排障/回滚」的完整入口。所有模型名、URL 与示例参数仅为示例/模板，不等于可用性承诺；实际请以服务商控制台为准。

Web 设置页展示的 provider 能力标签、官方来源链接和配置注意事项来自前端 provider template，只用于配置提示；运行时能力由连接测试和当前账户权限最终决定。

> 关联文档：
> - `docs/LLM_CONFIG_GUIDE.md`（中文）
> - `docs/LLM_CONFIG_GUIDE_EN.md`（英文）
> - `.env.example`

## 先选配置方式（推荐顺序）

- 方式一：极简配置（最少参数，适合单账号）
  适合只跑 1~2 个模型、只配一个厂商密钥的用户，先把默认路径跑通，再决定是否上渠道。
- 方式二：Channels 渠道配置（推荐）
  适合多厂商、多模型和 fallback 场景，避免在 `.env` 写大量散落变量。
- 方式三：LiteLLM YAML（高级）
  适合已具备路由/配额精细控制能力的高级用户，优先级最高，适合复杂部署。

## 方式一：极简配置（适用场景）

1. 优先先在 `.env` 里放最常见的一组 key（例如 `OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`GEMINI_API_KEY`）；
2. 设置对应 `*_MODEL` 并保留默认 fallback 语义；
3. 启动后在 Web 设置页点开「AI 模型」仅查看鉴权状态；
4. 如鉴权成功再逐步迁移到 Channels。

注意：启用 `LLM_CHANNELS` 后，简单模式变量不会参与运行时优先级。

## 方式二：Channels 渠道配置（推荐）

1. 在 `LLM_CHANNELS` 声明启用渠道名，例如：`deepseek,minimax,volcengine`；
2. 对应渠道补齐 `LLM_<CHANNEL>_PROTOCOL / BASE_URL / API_KEY(S) / MODELS`；
3. 可在 Web 设置页点击“获取模型”填充模型列表（仅 OpenAI Compatible / DeepSeek 渠道）；
4. 点“测试连接”确认鉴权与模型可访问性；
5. 保存后只会落本次提交字段，不进行历史配置静默迁移。

## 方式三：LiteLLM YAML（高级）

在高级配置里直接管理 `LITELLM_CONFIG` 时，`LITELLM_CONFIG > LLM_CHANNELS > legacy keys` 的优先级不变；YAML 场景建议仅在已有渠道配置稳定后启用，确保便于回滚。

## 主要服务商模板（请与当前仓库模板保持一致）

| 服务商 | 渠道名 | 协议 | Base URL | 模型示例 | 配置边界 | 官方来源 |
| --- | --- | --- | --- | --- | --- | --- |
| AIHubmix | `aihubmix` | `openai` | `https://aihubmix.com/v1` | `gpt-5.5,claude-sonnet-4-6,gemini-3.1-pro-preview` | 部分账号仅支持固定模型映射，示例不保证全部可见 | [AIHubmix 平台](https://aihubmix.com/) |
| Anspire Open | `anspire` | `openai` | `https://open-gateway.anspire.cn/v6`（示例） | `Doubao-Seed-2.0-lite,Doubao-Seed-2.0-pro,qwen3.5-flash,MiniMax-M2.7`（示例） | `ANSPIRE_API_KEYS` 为兼容入口，是否可用以控制台/额度为准 | [Anspire Open](https://open.anspire.cn/?share_code=QFBC0FYC) |
| OpenAI | `openai` | `openai` | `https://api.openai.com/v1` | `gpt-5.5,gpt-5.4-mini` | 以官方账户额度和 region 限制为准 | [OpenAI Models](https://platform.openai.com/docs/models) |
| DeepSeek | `deepseek` | `deepseek` | `https://api.deepseek.com` | `deepseek-v4-flash,deepseek-v4-pro` | `deepseek-chat`/`deepseek-reasoner` 已提示下线窗口，建议以 V4 入口为主 | [DeepSeek 快速开始](https://api-docs.deepseek.com/) |
| Gemini | `gemini` | `gemini` | 留空 | `gemini-3.1-pro-preview,gemini-3-flash-preview` | 可用模型以官方发布与预发布标签为准 | [Gemini 模型列表](https://ai.google.dev/gemini-api/docs/models) |
| Anthropic Claude | `anthropic` | `anthropic` | 留空 | `claude-sonnet-4-6,claude-opus-4-7` | 某些区域需额外组织/应用权限 | [Anthropic Models](https://docs.anthropic.com/en/docs/about-claude/models/all-models) |
| Kimi / Moonshot | `moonshot` | `openai` | `https://api.moonshot.cn/v1` | `kimi-k2.6,kimi-k2.5` | 部分老型号将逐步下线，推荐以官方兼容入口为准 | [Kimi 兼容与模型](https://platform.kimi.com/docs/guide/compatibility)、[模型列表](https://platform.kimi.com/docs/models) |
| 通义千问 / DashScope | `dashscope` | `openai` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3.6-plus,qwen3.6-flash` | `/models` 与官方可见模型依赖账户权限 | [DashScope 兼容文档](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope) |
| 智谱 GLM | `zhipu` | `openai` | `https://open.bigmodel.cn/api/paas/v4` | `glm-5.1,glm-4.7-flash` | 有些区域网关返回格式兼容有限，建议先打模型发现 | [GLM 介绍](https://docs.bigmodel.cn/cn/guide/start/model-overview) |
| MiniMax | `minimax` | `openai` | `https://api.minimax.io/v1` | `MiniMax-M2.7,MiniMax-M2.7-highspeed` | 默认入口为 OpenAI Compatible，`LLM_MINIMAX_MODELS` 填服务商模型名本体，不额外加 `minimax/` 前缀 | [MiniMax OpenAI API](https://platform.minimax.io/docs/api-reference/text-chat)、[模型列表](https://platform.minimax.io/docs/api-reference/models/openai/list-models) |
| 火山方舟 / 豆包 | `volcengine` | `openai` | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-seed-1-6-251015,doubao-seed-1-6-thinking-251015` | 文档口径以 `volcengine` 为主；`ARK` 当前不做默认推荐名；部分场景需专用 region endpoint | [Volcengine 在线推理](https://www.volcengine.com/docs/82379/2121998)、[模型列表](https://www.volcengine.com/docs/82379/1949118) |
| 硅基流动 / SiliconFlow | `siliconflow` | `openai` | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3.2,Qwen/Qwen3-235B-A22B-Thinking-2507` | `/models` 需密钥授权，模型名称可能滚动更新 | [SiliconFlow 模型](https://docs.siliconflow.cn/quickstart/models) |
| OpenRouter | `openrouter` | `openai` | `https://openrouter.ai/api/v1` | `~anthropic/claude-sonnet-latest,~openai/gpt-latest` | 以 latest/alias 行为为准，不同 token 对 alias 授权差异较大 | [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/get-models) |
| Ollama | `ollama` | `ollama` | `http://127.0.0.1:11434` | `llama3.2,qwen2.5` | 建议部署本地服务；GitHub-hosted Runner 通常不可达 | [Ollama 接口](https://github.com/ollama/ollama) |

## GitHub Actions 环境映射（Secrets / Variables）

### 字段放置建议

| 变量 | 放置位置 | 示例 | 说明 |
| --- | --- | --- | --- |
| `LLM_CHANNELS` | Variables 或 Secrets | `primary,deepseek,minimax,volcengine` | 渠道列表；推荐放 Variables 便于跨环境复用 |
| `LLM_<CHANNEL>_PROTOCOL` | Variables 或 Secrets | `LLM_VOLCENGINE_PROTOCOL=openai` | 非敏感字段 |
| `LLM_<CHANNEL>_BASE_URL` | Variables 或 Secrets | `LLM_VOLCENGINE_BASE_URL=...` | 非敏感可放 Variables；专用私网可放 Secrets |
| `LLM_<CHANNEL>_MODELS` | Variables 或 Secrets | `LLM_VOLCENGINE_MODELS=doubao-seed-...` | 运行时可用模型清单；为空时后端会跳过该渠道，GitHub Actions 至少要填写一个可用模型 |
| `LLM_<CHANNEL>_ENABLED` | Variables 或 Secrets | `LLM_VOLCENGINE_ENABLED=true` | 默认开启；可显式关闭 |
| `LLM_<CHANNEL>_API_KEY` / `LLM_<CHANNEL>_API_KEYS` | **Secrets** | `LLM_VOLCENGINE_API_KEY=sk-...` | 密钥类字段必须放 Secrets |
| `LLM_<CHANNEL>_EXTRA_HEADERS` | Secrets 或 Variables | `LLM_<CH>_EXTRA_HEADERS={...}` | JSON 扩展参数/组织信息，包含鉴权字段时建议 Secrets |

### 已显式映射的主流 channel（参考）

`daily_analysis.yml` 显式覆盖常见的主流渠道：`primary`、`secondary`、`aihubmix`、`anspire`、`deepseek`、`dashscope`、`zhipu`、`moonshot`、`minimax`、`volcengine`、`siliconflow`、`openrouter`、`gemini`、`anthropic`、`openai`、`ollama`。

自定义渠道名（例如 `my_proxy`）如果没有同步加上 `LLM_MY_PROXY_*`，Actions 不会自动生效；本地 `.env` 与 Docker 则不会受此限制。

> 回头说明：当前文档与映射以 `volcengine` 为渠道名，不推荐再同步维护 `LLM_ARK_*` 默认推荐变量。

## Web UI 配置步骤（新手优先）

1. 打开 `设置 -> AI 模型配置`；
2. 先选择“方式二渠道”或“方式一极简”中你要采用的方式；
3. 先补齐 API Key，再补 Base URL 和模型列表；页面上的能力标签仅作静态配置提示；
4. 使用“测试连接”确认；
5. 非 OpenAI Compatible 渠道（或 /models 不可用渠道）可手动填模型，不影响保存；
6. 遇错先根据“常见错误”修复，再回头用“测试连接”确认闭环。

## 常见错误与处理（快速定位）

| 类别 | 典型报错/现象 | 处理建议 |
| --- | --- | --- |
| 鉴权 | 401/403、测试连接 fail | 校验 Key 是否过期、是否有空格、是否需要组织/租户头 |
| 模型不存在 | `model_not_found`、只返回空模型列表 | 到服务商控制台确认可见模型；不支持 /models 的渠道改手工填模型 |
| 网络可达 | timeout、DNS、connection refused | 检查 `BASE_URL`、代理、防火墙、是否 runner 环境无外网 |
| 额度与限流 | quota/rate_limit/insufficient balance | 降低并发与重试频率，确认账户余额与请求配额 |
| 格式兼容 | content null、empty_response、JSON 解析失败 | 先换官方推荐模型；必要时取消 JSON/tools/vision 假设并以纯文本路径重试 |
| 配置优先级冲突 | 有效 key 写在多个模式 | 仅保留一条主线（先 YAML，再 Channels，再 legacy） |

## 回滚方式

1. 进入 Web 设置页，删除该渠道并回填 `LITELLM_MODEL`、`LITELLM_FALLBACK_MODELS` 等 legacy 字段；
2. 使用桌面端「导入/导出配置」恢复历史备份；
3. 彻底回退到 `.env`：移除 `LITELLM_CONFIG`/`LITELLM_CONFIG_YAML`、`ANSPIRE_LLM_*`、`LLM_<CHANNEL>_*`、`LLM_CHANNELS` 后只保留 legacy 配置；
4. 无法直接判定时先移除或禁用 `LITELLM_CONFIG`/`LITELLM_CONFIG_YAML`，再清空 `LLM_CHANNELS`，确保主程序以 legacy 路径启动后分步恢复。

> 回滚说明：本文不修改现有 `LITELLM_CONFIG > LLM_CHANNELS > legacy keys` 的优先级，不做静默迁移，不改写历史 `.env` 字段。
