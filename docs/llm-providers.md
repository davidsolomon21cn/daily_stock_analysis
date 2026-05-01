# LLM 服务商配置速查

本文面向首次配置用户，说明 Web 设置页「AI 模型配置」预设与 `.env` 多渠道变量的对应关系。实际可用模型、额度、区域限制和价格以各服务商控制台为准；如果模型列表拉取失败，可在 Web 中手动填写模型名。

## 配置方式

推荐优先使用 Web 设置页：

1. 打开设置页的「AI 模型配置」。
2. 在「快速添加渠道」选择服务商预设。
3. 填入 API Key，必要时点击「获取模型」。
4. 选择主模型、Agent 主模型、备选模型和 Vision 模型后保存。
5. 点击「测试连接」确认鉴权、模型名、额度和响应格式正常。

也可以直接在 `.env` 使用多渠道格式：

```env
LLM_CHANNELS=deepseek
LLM_DEEPSEEK_PROTOCOL=deepseek
LLM_DEEPSEEK_BASE_URL=https://api.deepseek.com
LLM_DEEPSEEK_API_KEY=sk-xxx
LLM_DEEPSEEK_MODELS=deepseek-v4-flash,deepseek-v4-pro
LITELLM_MODEL=deepseek/deepseek-v4-flash
```

## 常用服务商预设

| 服务商 | 渠道名 | 协议 | Base URL | 模型示例 |
| --- | --- | --- | --- | --- |
| OpenAI | `openai` | `openai` | `https://api.openai.com/v1` | `gpt-4o-mini,gpt-4o` |
| DeepSeek | `deepseek` | `deepseek` | `https://api.deepseek.com` | `deepseek-v4-flash,deepseek-v4-pro` |
| Gemini | `gemini` | `gemini` | 留空 | `gemini-2.5-flash,gemini-2.5-pro` |
| Anthropic Claude | `anthropic` | `anthropic` | 留空 | `claude-3-5-sonnet-20241022` |
| Kimi / Moonshot | `moonshot` | `openai` | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 通义千问 / DashScope | `dashscope` | `openai` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus,qwen-turbo` |
| 智谱 GLM | `zhipu` | `openai` | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash,glm-4-plus` |
| MiniMax | `minimax` | `openai` | `https://api.minimaxi.com/v1` | `MiniMax-M2.7,MiniMax-M2.7-highspeed` |
| 火山方舟 / 豆包 | `volcengine` | `openai` | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-seed-1-6-250615,doubao-seed-1-6-thinking-250615` |
| Ollama | `ollama` | `ollama` | `http://127.0.0.1:11434` | `llama3.2,qwen2.5` |

## 官方来源与兼容性

| 服务商 | 官方来源 | 兼容说明 |
| --- | --- | --- |
| MiniMax | [OpenAI API 兼容](https://platform.minimaxi.com/docs/api-reference/text-openai-api)、[获取模型列表](https://platform.minimaxi.com/docs/api-reference/models/openai/list-models) | 官方文档示例使用 `OPENAI_BASE_URL=https://api.minimaxi.com/v1`，并列出 `MiniMax-M2.7`、`MiniMax-M2.7-highspeed` 等 OpenAI SDK 可用模型。 |
| 火山方舟 / 豆包 | [在线推理（常规）](https://www.volcengine.com/docs/82379/2121998)、[联网内容插件示例](https://www.volcengine.com/docs/82379/1338552) | 官方示例使用 `https://ark.cn-beijing.volces.com/api/v3` 与 `doubao-seed-1-6-*` 模型；如使用 Coding Plan，请改用其专用 Base URL 和模型名，不要套用本表的在线推理模板。 |
| LiteLLM | [OpenAI-Compatible Endpoints](https://docs.litellm.ai/docs/providers/openai_compatible) | OpenAI 兼容端点需要把运行时模型写成 `openai/<model>`，Base URL 只填到服务商兼容入口，不额外拼接 `/chat/completions`。 |

当前仓库锁定 `litellm>=1.80.10,<1.82.7`（见 `requirements.txt`）。本页预设只保证配置形状与当前依赖的 OpenAI-compatible 路由规则一致；实际连通性仍取决于服务商账号权限、地域、额度和模型开通状态。回退方式：在 Web 设置页删除对应渠道，或从 `.env` 移除 `LLM_MINIMAX_*` / `LLM_VOLCENGINE_*` 并恢复原 `LITELLM_MODEL`、`LITELLM_FALLBACK_MODELS`。

## 排障要点

- 鉴权失败：检查 API Key 是否填错、复制了空格，或服务商是否要求额外项目权限。
- 模型不存在：先在 Web 中点击「获取模型」，若服务商不支持 `/models`，改为手动填写控制台里的模型 ID。
- 请求超时：检查 Base URL、代理、防火墙和本地 Ollama 服务是否可达。
- 空响应或格式异常：尝试换用兼容 Chat Completions 的模型，或切换到该服务商推荐的 OpenAI Compatible 入口。
- 多渠道 fallback：把备用渠道模型写入 `LITELLM_FALLBACK_MODELS`，单个模型失败时主流程会继续尝试备用模型。
