# -*- coding: utf-8 -*-
"""Tests for bot /status command output."""

from bot.commands.status import StatusCommand
from src.config import Config


def test_status_command_reports_unified_llm_and_notification_channels():
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
        custom_webhook_urls=["https://example.com/webhook"],
        slack_webhook_url="https://hooks.slack.com/services/T/B/C",
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
