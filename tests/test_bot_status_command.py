# -*- coding: utf-8 -*-
"""Tests for bot /status command output."""

from bot.commands.status import StatusCommand
from src.config import Config


def test_status_command_reports_unified_llm_and_notification_channels():
    model_list = [
        {
            "model_name": "deepseek/deepseek-v4-flash",
            "litellm_params": {
                "model": "deepseek/deepseek-v4-flash",
                "api_key": "sk-test",
            },
        }
    ]
    config = Config(
        stock_list=["600519", "AAPL"],
        litellm_model="deepseek/deepseek-v4-flash",
        agent_litellm_model="openai/gpt-4o-mini",
        llm_channels=[
            {
                "name": "deepseek",
                "models": ["deepseek/deepseek-v4-flash"],
            }
        ],
        llm_models_source="llm_channels",
        llm_model_list=model_list,
        custom_webhook_urls=["https://example.com/webhook"],
        slack_webhook_url="https://hooks.slack.com/services/T/B/C",
        serverchan3_sendkey="SCT123",
    )
    command = StatusCommand()

    status = command._collect_status(config)
    text = command._format_status(status, "telegram")

    assert status["ai_available"] is True
    assert "主模型: deepseek/deepseek-v4-flash" in text
    assert "Agent 模型: openai/gpt-4o-mini" in text
    assert "LLM 渠道: deepseek" in text
    assert "自定义 Webhook: ✅" in text
    assert "Slack: ✅" in text
    assert "PushPlus/Pushover/Server酱3: ✅" in text
    assert "系统就绪" in text


def test_status_command_warns_when_no_llm_source_configured():
    config = Config(stock_list=["600519"])
    command = StatusCommand()

    status = command._collect_status(config)
    text = command._format_status(status, "telegram")

    assert status["ai_available"] is False
    assert "主模型: 未配置" in text
    assert "AI 服务未配置" in text
    assert "LITELLM_MODEL" in text


def test_status_command_does_not_treat_managed_model_name_as_ready():
    config = Config(
        stock_list=["600519"],
        litellm_model="openai/gpt-4o-mini",
        llm_model_list=[],
    )
    command = StatusCommand()

    status = command._collect_status(config)
    text = command._format_status(status, "telegram")

    assert status["ai_available"] is False
    assert "AI 服务未配置" in text


def test_status_command_requires_primary_model_in_configured_router_models():
    config = Config(
        stock_list=["600519"],
        litellm_model="openai/gpt-4o-mini",
        llm_channels=[
            {
                "name": "deepseek",
                "models": ["deepseek/deepseek-v4-flash"],
            }
        ],
        llm_models_source="llm_channels",
        llm_model_list=[
            {
                "model_name": "deepseek/deepseek-v4-flash",
                "litellm_params": {
                    "model": "deepseek/deepseek-v4-flash",
                    "api_key": "sk-test",
                },
            }
        ],
    )
    command = StatusCommand()

    status = command._collect_status(config)
    text = command._format_status(status, "telegram")

    assert status["ai_available"] is False
    assert "AI 服务未配置" in text
    assert "系统就绪" not in text


def test_status_command_does_not_treat_invalid_yaml_path_as_active():
    config = Config(
        stock_list=["600519"],
        litellm_config_path="missing.yaml",
        llm_models_source="legacy_env",
        llm_model_list=[],
    )
    command = StatusCommand()

    status = command._collect_status(config)
    text = command._format_status(status, "telegram")

    assert status["ai_yaml"] is False
    assert status["ai_available"] is False
    assert "LiteLLM YAML: ❌" in text
    assert "AI 服务未配置" in text


def test_status_command_treats_direct_env_provider_model_as_ready():
    config = Config(
        stock_list=["600519"],
        litellm_model="cohere/command-r-plus",
        llm_model_list=[],
    )
    command = StatusCommand()

    status = command._collect_status(config)
    text = command._format_status(status, "telegram")

    assert status["ai_available"] is True
    assert "系统就绪" in text
