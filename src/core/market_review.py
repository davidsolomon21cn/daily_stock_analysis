# -*- coding: utf-8 -*-
"""
===================================
股票智能分析系统 - 大盘复盘模块（支持 A 股 / 港股 / 美股）
===================================

职责：
1. 根据 MARKET_REVIEW_REGION 配置选择市场区域（cn / hk / us / both）
2. 执行大盘复盘分析并生成复盘报告
3. 保存和发送复盘报告
"""

import logging
from datetime import datetime
from typing import Optional

from src.config import get_config
from src.notification import NotificationService
from src.market_analyzer import MarketAnalyzer
from src.report_language import normalize_report_language
from src.search_service import SearchService
from src.analyzer import GeminiAnalyzer
from src.core.trading_calendar import get_open_markets_today
from src.services.market_review_hotspot_service import MarketReviewHotspotService


logger = logging.getLogger(__name__)


def _get_market_review_text(language: str) -> dict[str, str]:
    normalized = normalize_report_language(language)
    if normalized == "en":
        return {
            "root_title": "# 🎯 Market Review",
            "push_title": "🎯 Market Review",
            "cn_title": "# A-share Market Recap",
            "us_title": "# US Market Recap",
            "hk_title": "# HK Market Recap",
            "separator": "> Next market recap follows",
        }
    return {
        "root_title": "# 🎯 大盘复盘",
        "push_title": "🎯 大盘复盘",
        "cn_title": "# A股大盘复盘",
        "us_title": "# 美股大盘复盘",
        "hk_title": "# 港股大盘复盘",
        "separator": "> 以下为下一市场大盘复盘",
    }


def _append_cn_hotspot_sections(
    review_report: Optional[str],
    language: str,
) -> Optional[str]:
    if not review_report:
        return review_report

    try:
        appendix = MarketReviewHotspotService().build_markdown(
            region="cn",
            language=language,
        )
        if not appendix:
            return review_report
        return f"{review_report}\n\n---\n\n{appendix}"
    except Exception as exc:
        logger.warning(
            "Failed to append market review hotspot sections for region=cn language=%s: %s",
            language,
            exc,
        )
        return review_report


def _append_cn_hotspot_part(
    parts: list[str],
    *,
    cn_title: str,
    language: str,
) -> list[str]:
    prefix = f"{cn_title}\n\n"
    updated_parts = list(parts)
    for index, part in enumerate(updated_parts):
        if not part.startswith(prefix):
            continue
        updated_body = _append_cn_hotspot_sections(part[len(prefix):], language)
        if updated_body:
            updated_parts[index] = f"{prefix}{updated_body}"
        return updated_parts
    return updated_parts


def _resolve_run_markets(
    region: str,
    *,
    restrict_to_open_markets: bool = True,
) -> list[str]:
    all_markets = [('cn', 'cn_title', 'A 股'), ('hk', 'hk_title', '港股'), ('us', 'us_title', '美股')]
    valid_singles = {'cn', 'us', 'hk'}

    if ',' in region:
        requested = {m.strip() for m in region.split(',') if m.strip() in valid_singles}
        if not requested:
            return ['cn']
        return [market for market, _, _ in all_markets if market in requested]

    if region == 'both':
        configured_markets = [market for market, _, _ in all_markets]
        if not restrict_to_open_markets:
            return configured_markets
        open_markets = get_open_markets_today()
        requested = [market for market in configured_markets if market in open_markets]
        return requested or ['cn']

    if region in valid_singles:
        return [region]

    return ['cn']


def run_market_review(
    notifier: NotificationService,
    analyzer: Optional[GeminiAnalyzer] = None,
    search_service: Optional[SearchService] = None,
    send_notification: bool = True,
    merge_notification: bool = False,
    override_region: Optional[str] = None,
) -> Optional[str]:
    """
    执行大盘复盘分析

    Args:
        notifier: 通知服务
        analyzer: AI分析器（可选）
        search_service: 搜索服务（可选）
        send_notification: 是否发送通知
        merge_notification: 是否合并推送（跳过本次推送，由 main 层合并个股+大盘后统一发送，Issue #190）
        override_region: 覆盖 config 的 market_review_region（Issue #373 交易日过滤后有效子集）

    Returns:
        复盘报告文本
    """
    logger.info("开始执行大盘复盘分析...")
    config = get_config()
    review_text = _get_market_review_text(getattr(config, "report_language", "zh"))
    review_language = getattr(config, "report_language", "zh")
    configured_region = getattr(config, 'market_review_region', 'cn') or 'cn'
    region = (
        override_region
        if override_region is not None
        else configured_region
    )
    _ALL_MARKETS = [('cn', 'cn_title', 'A 股'), ('hk', 'hk_title', '港股'), ('us', 'us_title', '美股')]
    _VALID_SINGLES = {'cn', 'us', 'hk'}

    # Determine which markets to run.
    # region can be: 'cn', 'hk', 'us', 'both', or a comma-joined subset like 'cn,us'.
    if ',' in region:
        run_markets = [m.strip() for m in region.split(',') if m.strip() in _VALID_SINGLES]
    elif region == 'both':
        run_markets = list(_VALID_SINGLES)
    elif region in _VALID_SINGLES:
        run_markets = [region]
    else:
        run_markets = ['cn']

    try:
        if len(run_markets) > 1:
            # 多市场顺序执行，合并报告
            parts = []
            for mkt, title_key, label in _ALL_MARKETS:
                if mkt not in run_markets:
                    continue
                logger.info("生成 %s 大盘复盘报告...", label)
                mkt_analyzer = MarketAnalyzer(
                    search_service=search_service, analyzer=analyzer, region=mkt
                )
                mkt_report = mkt_analyzer.run_daily_review()
                if mkt_report:
                    parts.append(f"{review_text[title_key]}\n\n{mkt_report}")
            if parts:
                review_report = f"\n\n---\n\n{review_text['separator']}\n\n".join(parts)
            else:
                review_report = None
        else:
            single_region = (run_markets or ['cn'])[0]
            market_analyzer = MarketAnalyzer(
                search_service=search_service,
                analyzer=analyzer,
                region=single_region,
            )
            review_report = market_analyzer.run_daily_review()
            if single_region == 'cn':
                review_report = _append_cn_hotspot_sections(
                    review_report,
                    review_language,
                )

        if review_report and len(run_markets) > 1:
            review_report = f"\n\n---\n\n{review_text['separator']}\n\n".join(
                _append_cn_hotspot_part(
                    review_report.split(f"\n\n---\n\n{review_text['separator']}\n\n"),
                    cn_title=review_text['cn_title'],
                    language=review_language,
                )
            )

        if review_report:
            # 保存报告到文件
            date_str = datetime.now().strftime('%Y%m%d')
            report_filename = f"market_review_{date_str}.md"
            filepath = notifier.save_report_to_file(
                f"{review_text['root_title']}\n\n{review_report}",
                report_filename
            )
            logger.info(f"大盘复盘报告已保存: {filepath}")

            # 推送通知（合并模式下跳过，由 main 层统一发送）
            if merge_notification and send_notification:
                logger.info("合并推送模式：跳过大盘复盘单独推送，将在个股+大盘复盘后统一发送")
            elif send_notification and notifier.is_available():
                # 添加标题
                report_content = f"{review_text['push_title']}\n\n{review_report}"

                success = notifier.send(report_content, email_send_to_all=True)
                if success:
                    logger.info("大盘复盘推送成功")
                else:
                    logger.warning("大盘复盘推送失败")
            elif not send_notification:
                logger.info("已跳过推送通知 (--no-notify)")

            return review_report

    except Exception as e:
        logger.error(f"大盘复盘分析失败: {e}")

    return None
