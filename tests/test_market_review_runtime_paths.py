# -*- coding: utf-8 -*-
"""Additional market review runtime-path regressions for both/hotspot behavior."""

import importlib
import sys
import unittest
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock, patch

from tests.litellm_stub import ensure_litellm_stub

ensure_litellm_stub()


def _build_optional_module_stubs() -> dict[str, ModuleType]:
    stubs: dict[str, ModuleType] = {}
    google_module: ModuleType | None = None

    for module_name in ("google.generativeai", "google.genai", "anthropic"):
        try:
            importlib.import_module(module_name)
            continue
        except ImportError:
            stub = ModuleType(module_name)
            stubs[module_name] = stub
            if not module_name.startswith("google."):
                continue
            if google_module is None:
                try:
                    google_module = importlib.import_module("google")
                except ImportError:
                    google_module = ModuleType("google")
                    stubs["google"] = google_module
            setattr(google_module, module_name.split(".", 1)[1], stub)

    return stubs


sys.modules.update(_build_optional_module_stubs())
import src.core.market_review as market_review_module

run_market_review = market_review_module.run_market_review


class MarketReviewRuntimePathsTestCase(unittest.TestCase):
    def _make_notifier(self) -> MagicMock:
        notifier = MagicMock()
        notifier.save_report_to_file.return_value = "/tmp/market_review.md"
        notifier.is_available.return_value = True
        notifier.send.return_value = True
        return notifier

    def test_run_market_review_both_without_override_keeps_configured_full_market_set(self) -> None:
        notifier = self._make_notifier()
        cn_analyzer = MagicMock()
        cn_analyzer.run_daily_review.return_value = "CN body"
        hk_analyzer = MagicMock()
        hk_analyzer.run_daily_review.return_value = "HK body"
        us_analyzer = MagicMock()
        us_analyzer.run_daily_review.return_value = "US body"
        hotspot_service = MagicMock()
        hotspot_service.build_markdown.return_value = ""

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="both"),
        ), patch.object(
            market_review_module,
            "get_open_markets_today",
            return_value={"cn", "hk"},
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            side_effect=[cn_analyzer, hk_analyzer, us_analyzer],
        ), patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ):
            result = run_market_review(notifier, send_notification=False)

        self.assertIn("# A股大盘复盘\n\nCN body", result)
        self.assertIn("# 港股大盘复盘\n\nHK body", result)
        self.assertIn("# 美股大盘复盘\n\nUS body", result)

    def test_run_market_review_without_override_does_not_consult_open_market_filter(self) -> None:
        notifier = self._make_notifier()
        cn_analyzer = MagicMock()
        cn_analyzer.run_daily_review.return_value = "CN body"
        hk_analyzer = MagicMock()
        hk_analyzer.run_daily_review.return_value = "HK body"
        us_analyzer = MagicMock()
        us_analyzer.run_daily_review.return_value = "US body"
        hotspot_service = MagicMock()
        hotspot_service.build_markdown.return_value = ""

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="both"),
        ), patch.object(
            market_review_module,
            "get_open_markets_today",
            side_effect=AssertionError("run_market_review should honor configured region without filtering"),
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            side_effect=[cn_analyzer, hk_analyzer, us_analyzer],
        ), patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ):
            result = run_market_review(notifier, send_notification=False)

        self.assertIn("# A股大盘复盘\n\nCN body", result)
        self.assertIn("# 港股大盘复盘\n\nHK body", result)
        self.assertIn("# 美股大盘复盘\n\nUS body", result)

    def test_run_market_review_invalid_comma_region_falls_back_to_cn(self) -> None:
        notifier = self._make_notifier()
        market_analyzer = MagicMock()
        market_analyzer.run_daily_review.return_value = "CN body"
        hotspot_service = MagicMock()
        hotspot_service.build_markdown.return_value = ""

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="us"),
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            return_value=market_analyzer,
        ) as market_analyzer_cls, patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ), patch.object(
            market_review_module,
            "get_open_markets_today",
            return_value={"cn", "us", "hk"},
        ):
            result = run_market_review(
                notifier,
                send_notification=False,
                override_region="foo,bar",
            )

        self.assertEqual(result, "CN body")
        self.assertEqual(
            market_analyzer_cls.call_args.kwargs["region"],
            "cn",
        )

    def test_run_market_review_appends_hotspot_sections(self) -> None:
        notifier = self._make_notifier()
        market_analyzer = MagicMock()
        market_analyzer.run_daily_review.return_value = "## 2026-04-10 大盘复盘\n\n正文"
        hotspot_service = MagicMock()
        hotspot_service.build_markdown.return_value = (
            "### 热门板块\n- **机器人**: +6.20%\n\n### 热门股票\n- **中际旭创 (300308)**: +9.91%"
        )

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="cn"),
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            return_value=market_analyzer,
        ), patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ):
            result = run_market_review(notifier, send_notification=False)

        self.assertIn("\n\n---\n\n### 热门板块", result)
        self.assertIn("### 热门股票", result)

    def test_run_market_review_inserts_hotspots_before_us_section_when_both(self) -> None:
        notifier = self._make_notifier()
        cn_analyzer = MagicMock()
        cn_analyzer.run_daily_review.return_value = "CN body"
        hk_analyzer = MagicMock()
        hk_analyzer.run_daily_review.return_value = "HK body"
        us_analyzer = MagicMock()
        us_analyzer.run_daily_review.return_value = "US body"
        hotspot_service = MagicMock()
        hotspot_service.build_markdown.return_value = "### 热门板块\n- **机器人**: +6.20%"

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="both"),
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            side_effect=[cn_analyzer, hk_analyzer, us_analyzer],
        ), patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ):
            result = run_market_review(notifier, send_notification=False)

        cn_index = result.index("# A股大盘复盘\n\nCN body")
        hotspot_index = result.index("### 热门板块")
        hk_index = result.index("# 港股大盘复盘\n\nHK body")
        us_index = result.index("# 美股大盘复盘\n\nUS body")
        self.assertLess(cn_index, hotspot_index)
        self.assertLess(hotspot_index, hk_index)
        self.assertLess(hk_index, us_index)
        self.assertLess(hotspot_index, us_index)

    def test_run_market_review_skips_hotspots_when_cn_section_missing_in_both_mode(self) -> None:
        notifier = self._make_notifier()
        cn_analyzer = MagicMock()
        cn_analyzer.run_daily_review.return_value = None
        hk_analyzer = MagicMock()
        hk_analyzer.run_daily_review.return_value = "HK body"
        us_analyzer = MagicMock()
        us_analyzer.run_daily_review.return_value = "US body"
        hotspot_service = MagicMock()

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="both"),
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            side_effect=[cn_analyzer, hk_analyzer, us_analyzer],
        ), patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ):
            result = run_market_review(notifier, send_notification=False)

        self.assertEqual(result, "# 港股大盘复盘\n\nHK body\n\n---\n\n> 以下为下一市场大盘复盘\n\n# 美股大盘复盘\n\nUS body")
        hotspot_service.build_markdown.assert_not_called()

    def test_run_market_review_hotspot_append_fail_open_on_exception(self) -> None:
        notifier = self._make_notifier()
        market_analyzer = MagicMock()
        market_analyzer.run_daily_review.return_value = "## 2026-04-10 大盘复盘\n\n正文"
        hotspot_service = MagicMock()
        hotspot_service.build_markdown.side_effect = RuntimeError("hotspot failed")

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="cn"),
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            return_value=market_analyzer,
        ), patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ):
            result = run_market_review(notifier, send_notification=False)

        self.assertEqual(result, "## 2026-04-10 大盘复盘\n\n正文")

    def test_run_market_review_hk_mode_keeps_single_market_path_without_hotspots(self) -> None:
        notifier = self._make_notifier()
        hk_analyzer = MagicMock()
        hk_analyzer.run_daily_review.return_value = "HK body"
        hotspot_service = MagicMock()

        with patch.object(
            market_review_module,
            "get_config",
            return_value=SimpleNamespace(report_language="zh", market_review_region="hk"),
        ), patch.object(
            market_review_module,
            "get_open_markets_today",
            side_effect=AssertionError("direct hk mode should not be narrowed again"),
        ), patch.object(
            market_review_module,
            "MarketAnalyzer",
            return_value=hk_analyzer,
        ) as market_analyzer_cls, patch.object(
            market_review_module,
            "MarketReviewHotspotService",
            return_value=hotspot_service,
        ):
            result = run_market_review(notifier, send_notification=False)

        self.assertEqual(result, "HK body")
        self.assertEqual(market_analyzer_cls.call_args.kwargs["region"], "hk")
        hotspot_service.build_markdown.assert_not_called()


if __name__ == "__main__":
    unittest.main()
