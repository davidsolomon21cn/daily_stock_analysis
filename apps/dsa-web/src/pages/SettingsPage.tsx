import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useSystemConfig } from '../hooks';
import { createParsedApiError, getParsedApiError, type ParsedApiError } from '../api/error';
import { systemConfigApi } from '../api/systemConfig';
import { ApiErrorAlert, Button, ConfirmDialog, EmptyState } from '../components/common';
import {
  AuthSettingsCard,
  ChangePasswordCard,
  IntelligentImport,
  LLMChannelEditor,
  SettingsCategoryNav,
  SettingsAlert,
  SettingsField,
  SettingsLoading,
  SettingsSectionCard,
} from '../components/settings';
import { WEB_BUILD_INFO } from '../utils/constants';
import {
  buildSetupLLMPayload,
  looksLikeStockCode,
  MAX_SETUP_STOCKS,
  splitCsv,
} from '../utils/setupWizard';
import { getCategoryDescriptionZh } from '../utils/systemConfigI18n';
import type {
  SetupSmokeRunResponse,
  SetupWizardStatus,
  SystemConfigCategory,
  TestLLMChannelResponse,
} from '../types/systemConfig';

type DesktopWindow = Window & {
  dsaDesktop?: {
    version?: unknown;
    getUpdateState?: () => Promise<RawDesktopUpdateState>;
    checkForUpdates?: () => Promise<RawDesktopUpdateState>;
    openReleasePage?: (releaseUrl?: string) => Promise<boolean>;
    onUpdateStateChange?: (listener: (state: RawDesktopUpdateState) => void) => (() => void) | void;
  };
};

type DesktopUpdateState = {
  status?: string;
  currentVersion?: string;
  latestVersion?: string;
  releaseUrl?: string;
  checkedAt?: string;
  publishedAt?: string;
  message?: string;
  releaseName?: string;
  tagName?: string;
};

type RawDesktopUpdateState = {
  status?: unknown;
  currentVersion?: unknown;
  latestVersion?: unknown;
  releaseUrl?: unknown;
  checkedAt?: unknown;
  publishedAt?: unknown;
  message?: unknown;
  releaseName?: unknown;
  tagName?: unknown;
};

function trimDesktopRuntimeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getDesktopRuntimeApi() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as DesktopWindow).dsaDesktop;
}

function getDesktopAppVersion() {
  return trimDesktopRuntimeString(getDesktopRuntimeApi()?.version);
}

function normalizeDesktopUpdateState(state: RawDesktopUpdateState | null | undefined) {
  if (!state || typeof state !== 'object') {
    return null;
  }

  return {
    status: trimDesktopRuntimeString(state.status) || 'idle',
    currentVersion: trimDesktopRuntimeString(state.currentVersion),
    latestVersion: trimDesktopRuntimeString(state.latestVersion),
    releaseUrl: trimDesktopRuntimeString(state.releaseUrl),
    checkedAt: trimDesktopRuntimeString(state.checkedAt),
    publishedAt: trimDesktopRuntimeString(state.publishedAt),
    message: trimDesktopRuntimeString(state.message),
    releaseName: trimDesktopRuntimeString(state.releaseName),
    tagName: trimDesktopRuntimeString(state.tagName),
  };
}

function getDesktopUpdateNotice(state: DesktopUpdateState | null) {
  if (!state) {
    return null;
  }

  if (state.status === 'update-available') {
    const latestLabel = state.latestVersion || state.tagName || '最新版本';
    const currentLabel = state.currentVersion || getDesktopAppVersion() || '当前版本';
    return {
      title: '发现新版本',
      message: `当前 ${currentLabel}，最新 ${latestLabel}。${state.message || '可前往 GitHub Releases 下载更新。'}`,
      variant: 'warning' as const,
      actionLabel: '前往下载',
    };
  }

  if (state.status === 'up-to-date') {
    return {
      title: '已是最新版本',
      message: state.message || '当前桌面端已是最新版本。',
      variant: 'success' as const,
    };
  }

  if (state.status === 'checking') {
    return {
      title: '正在检查更新',
      message: state.message || '正在检查 GitHub Releases 中是否有可用新版本。',
      variant: 'warning' as const,
    };
  }

  if (state.status === 'error') {
    return {
      title: '检查更新失败',
      message: state.message || '无法完成更新检查，请稍后重试。',
      variant: 'error' as const,
    };
  }

  return null;
}

function formatDesktopEnvFilename() {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `dsa-desktop-env_${date}_${time}.env`;
}

const SettingsPage: React.FC = () => {
  const { passwordChangeable } = useAuth();
  const [desktopActionError, setDesktopActionError] = useState<ParsedApiError | null>(null);
  const [desktopActionSuccess, setDesktopActionSuccess] = useState<string>('');
  const [isExportingEnv, setIsExportingEnv] = useState(false);
  const [isImportingEnv, setIsImportingEnv] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [desktopUpdateState, setDesktopUpdateState] = useState<DesktopUpdateState | null>(null);
  const [isCheckingDesktopUpdate, setIsCheckingDesktopUpdate] = useState(false);
  const desktopImportRef = useRef<HTMLInputElement | null>(null);
  const desktopRuntimeApi = getDesktopRuntimeApi();
  const isDesktopRuntime = Boolean(desktopRuntimeApi);
  const canCheckDesktopUpdate = Boolean(
    desktopRuntimeApi?.getUpdateState && desktopRuntimeApi?.checkForUpdates && desktopRuntimeApi?.openReleasePage
  );
  const desktopAppVersion = getDesktopAppVersion();
  const shouldShowDesktopVersionCard = Boolean(desktopAppVersion);

  // Set page title
  useEffect(() => {
    document.title = '系统设置 - DSA';
  }, []);

  const {
    categories,
    itemsByCategory,
    issueByKey,
    activeCategory,
    setActiveCategory,
    hasDirty,
    dirtyCount,
    toast,
    clearToast,
    isLoading,
    isSaving,
    loadError,
    saveError,
    retryAction,
    load,
    retry,
    save,
    resetDraft,
    setDraftValue,
    refreshAfterExternalSave,
    configVersion,
    maskToken,
    setupStatus,
  } = useSystemConfig();

  const [setupStocks, setSetupStocks] = useState<string[]>([]);
  const [setupStockInput, setSetupStockInput] = useState('');
  const [setupStockError, setSetupStockError] = useState('');
  const [isSavingSetupStocks, setIsSavingSetupStocks] = useState(false);
  const [isTestingSetupLLM, setIsTestingSetupLLM] = useState(false);
  const [setupLLMResult, setSetupLLMResult] = useState<TestLLMChannelResponse | null>(null);
  const [isRunningSetupSmoke, setIsRunningSetupSmoke] = useState(false);
  const [setupSmokeResult, setSetupSmokeResult] = useState<SetupSmokeRunResponse | null>(null);
  const [setupStatusOverride, setSetupStatusOverride] = useState<SetupWizardStatus | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearToast();
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [clearToast, toast]);

  useEffect(() => {
    if (!canCheckDesktopUpdate) {
      setDesktopUpdateState(null);
      setIsCheckingDesktopUpdate(false);
      return;
    }

    let active = true;

    const syncDesktopUpdateState = async () => {
      try {
        const state = await desktopRuntimeApi?.getUpdateState?.();
        if (active) {
          setDesktopUpdateState(normalizeDesktopUpdateState(state));
        }
      } catch (error: unknown) {
        if (!active) {
          return;
        }
        setDesktopUpdateState({
          status: 'error',
          message: error instanceof Error ? error.message : '读取桌面端更新状态失败。',
        });
      }
    };

    void syncDesktopUpdateState();

    const unsubscribe = desktopRuntimeApi?.onUpdateStateChange?.((state) => {
      if (!active) {
        return;
      }
      setDesktopUpdateState(normalizeDesktopUpdateState(state));
      setIsCheckingDesktopUpdate(false);
    });

    return () => {
      active = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [canCheckDesktopUpdate, desktopRuntimeApi]);

  const rawActiveItems = itemsByCategory[activeCategory] || [];
  const allConfigItems = useMemo(() => Object.values(itemsByCategory).flat(), [itemsByCategory]);
  const effectiveSetupStatus = setupStatusOverride ?? setupStatus;
  const shouldShowSetupCard = Boolean(effectiveSetupStatus && !effectiveSetupStatus.isComplete);
  const setupStockListValue = useMemo(
    () => String(allConfigItems.find((item) => item.key === 'STOCK_LIST')?.value || ''),
    [allConfigItems],
  );
  const setupLLMPayload = useMemo(
    () => buildSetupLLMPayload(allConfigItems, maskToken),
    [allConfigItems, maskToken],
  );
  const rawActiveItemMap = new Map(rawActiveItems.map((item) => [item.key, String(item.value ?? '')]));
  const hasConfiguredChannels = Boolean((rawActiveItemMap.get('LLM_CHANNELS') || '').trim());
  const hasLitellmConfig = Boolean((rawActiveItemMap.get('LITELLM_CONFIG') || '').trim());

  // Hide channel-managed and legacy provider-specific LLM keys from the
  // generic form only when channel config is the active runtime source.
  const LLM_CHANNEL_KEY_RE = /^LLM_[A-Z0-9]+_(PROTOCOL|BASE_URL|API_KEY|API_KEYS|MODELS|EXTRA_HEADERS|ENABLED)$/;
  const AI_MODEL_HIDDEN_KEYS = new Set([
    'LLM_CHANNELS',
    'LLM_TEMPERATURE',
    'LITELLM_MODEL',
    'AGENT_LITELLM_MODEL',
    'LITELLM_FALLBACK_MODELS',
    'AIHUBMIX_KEY',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_API_KEYS',
    'GEMINI_API_KEY',
    'GEMINI_API_KEYS',
    'GEMINI_MODEL',
    'GEMINI_MODEL_FALLBACK',
    'GEMINI_TEMPERATURE',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_API_KEYS',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_TEMPERATURE',
    'ANTHROPIC_MAX_TOKENS',
    'OPENAI_API_KEY',
    'OPENAI_API_KEYS',
    'OPENAI_BASE_URL',
    'OPENAI_MODEL',
    'OPENAI_VISION_MODEL',
    'OPENAI_TEMPERATURE',
    'VISION_MODEL',
  ]);
  const SYSTEM_HIDDEN_KEYS = new Set([
    'ADMIN_AUTH_ENABLED',
  ]);
  const AGENT_HIDDEN_KEYS = new Set<string>();
  const activeItems =
    activeCategory === 'ai_model'
      ? rawActiveItems.filter((item) => {
        if (hasConfiguredChannels && LLM_CHANNEL_KEY_RE.test(item.key)) {
          return false;
        }
        if (hasConfiguredChannels && !hasLitellmConfig && AI_MODEL_HIDDEN_KEYS.has(item.key)) {
          return false;
        }
        return true;
      })
      : activeCategory === 'system'
        ? rawActiveItems.filter((item) => !SYSTEM_HIDDEN_KEYS.has(item.key))
      : activeCategory === 'agent'
        ? rawActiveItems.filter((item) => !AGENT_HIDDEN_KEYS.has(item.key))
      : rawActiveItems;
  const desktopActionDisabled = isLoading || isSaving || isExportingEnv || isImportingEnv;

  useEffect(() => {
    setSetupStocks(splitCsv(setupStockListValue));
  }, [setupStockListValue]);

  useEffect(() => {
    setSetupStatusOverride(null);
  }, [setupStatus]);

  const downloadDesktopEnv = async () => {
    setDesktopActionError(null);
    setDesktopActionSuccess('');
    setIsExportingEnv(true);
    try {
      const payload = await systemConfigApi.exportDesktopEnv();
      const blob = new Blob([payload.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = formatDesktopEnvFilename();
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setDesktopActionSuccess('已导出当前已保存的 .env 备份。');
    } catch (error: unknown) {
      setDesktopActionError(getParsedApiError(error));
    } finally {
      setIsExportingEnv(false);
    }
  };

  const beginDesktopImport = () => {
    setDesktopActionError(null);
    setDesktopActionSuccess('');
    if (hasDirty) {
      setShowImportConfirm(true);
      return;
    }
    desktopImportRef.current?.click();
  };

  const handleDesktopImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setShowImportConfirm(false);
    if (!file) {
      return;
    }

    setDesktopActionError(null);
    setDesktopActionSuccess('');
    setIsImportingEnv(true);
    try {
      const content = await file.text();
      await systemConfigApi.importDesktopEnv({
        configVersion,
        content,
        reloadNow: true,
      });
      const reloaded = await load();
      if (!reloaded) {
        setDesktopActionError(createParsedApiError({
          title: '配置已导入但刷新失败',
          message: '备份已导入，但重新加载配置失败，请手动重载页面。',
          rawMessage: 'Desktop env import succeeded but config refresh failed',
          category: 'http_error',
        }));
        return;
      }
      setDesktopActionSuccess('已导入 .env 备份并重新加载配置。');
    } catch (error: unknown) {
      setDesktopActionError(getParsedApiError(error));
    } finally {
      setIsImportingEnv(false);
    }
  };

  const handleDesktopUpdateCheck = async () => {
    if (!desktopRuntimeApi?.checkForUpdates) {
      return;
    }

    setIsCheckingDesktopUpdate(true);
    setDesktopUpdateState((current) => ({
      ...(current || {}),
      status: 'checking',
      message: '正在检查 GitHub Releases 中是否有可用新版本。',
    }));

    try {
      const state = await desktopRuntimeApi.checkForUpdates();
      setDesktopUpdateState(normalizeDesktopUpdateState(state));
    } catch (error: unknown) {
      setDesktopUpdateState({
        status: 'error',
        message: error instanceof Error ? error.message : '检查更新失败，请稍后重试。',
      });
    } finally {
      setIsCheckingDesktopUpdate(false);
    }
  };

  const openDesktopReleasePage = async () => {
    if (!desktopRuntimeApi?.openReleasePage) {
      return;
    }

    await desktopRuntimeApi.openReleasePage(desktopUpdateState?.releaseUrl);
  };

  const desktopUpdateNotice = getDesktopUpdateNotice(desktopUpdateState);

  const addSetupStock = (code: string, _name?: string, source?: 'manual' | 'autocomplete') => {
    const normalized = code.trim();
    if (!normalized) return;
    if (source !== 'autocomplete' && !looksLikeStockCode(normalized)) {
      setSetupStockError('名称输入请先从候选列表确认，避免写入错误股票。');
      return;
    }
    setSetupStocks((current) => {
      if (current.some((item) => item.toLowerCase() === normalized.toLowerCase())) return current;
      if (current.length >= MAX_SETUP_STOCKS) return current;
      return [...current, normalized];
    });
    setSetupStockInput('');
    setSetupStockError('');
    setSetupSmokeResult(null);
  };

  const saveSetupStocks = async () => {
    if (!setupStocks.length) {
      setSetupStockError('请先添加至少 1 只股票。');
      return;
    }

    setIsSavingSetupStocks(true);
    try {
      await systemConfigApi.update({
        configVersion,
        maskToken,
        reloadNow: true,
        items: [{ key: 'STOCK_LIST', value: setupStocks.join(',') }],
      });
      await refreshAfterExternalSave(['STOCK_LIST']);
      setSetupStockError('');
      setSetupSmokeResult(null);
    } catch (error: unknown) {
      setSetupStockError(getParsedApiError(error).message || '保存股票失败');
    } finally {
      setIsSavingSetupStocks(false);
    }
  };

  const testSetupLLM = async () => {
    if (!setupLLMPayload) {
      setSetupLLMResult({
        success: false,
        message: '未检测到可测试的主模型配置',
        error: '请先在当前页面补齐 LLM 配置',
        errorType: 'invalid_config',
        nextStep: '先完成 AI 模型配置，再回到顶部卡片重试',
        stages: [],
      });
      return;
    }

    setIsTestingSetupLLM(true);
    try {
      setSetupLLMResult(await systemConfigApi.testLLMChannel(setupLLMPayload));
    } catch (error: unknown) {
      const parsed = getParsedApiError(error);
      setSetupLLMResult({
        success: false,
        message: 'LLM 测试失败',
        error: parsed.message,
        errorType: 'network_error',
        nextStep: '请检查当前页面中的渠道配置',
        stages: [],
      });
    } finally {
      setIsTestingSetupLLM(false);
    }
  };

  const runSetupSmoke = async () => {
    setIsRunningSetupSmoke(true);
    try {
      const result = await systemConfigApi.runSetupSmoke({
        stockInput: setupStocks[0] || setupStockInput,
      });
      setSetupSmokeResult(result);
      setSetupStatusOverride(result.setupStatus);
    } catch (error: unknown) {
      const parsed = getParsedApiError(error);
      const fallbackStatus = effectiveSetupStatus || {
        isComplete: false,
        readyForSmoke: false,
        requiredMissingKeys: [],
        nextStepKey: null,
        checks: [],
      };
      setSetupSmokeResult({
        success: false,
        message: '首次试跑失败',
        errorCode: 'network_error',
        nextStep: '请稍后重试',
        summary: parsed.message,
        setupStatus: fallbackStatus,
      });
      setSetupStatusOverride(fallbackStatus);
    } finally {
      setIsRunningSetupSmoke(false);
    }
  };

  return (
    <div className="settings-page min-h-full px-4 pb-6 pt-4 md:px-6">
      <div className="mb-5 rounded-[1.5rem] border settings-border bg-card/94 px-5 py-5 shadow-soft-card-strong backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">系统设置</h1>
            <p className="text-xs leading-6 text-muted-text">
              统一管理模型、数据源、通知、安全认证与导入能力。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="settings-secondary"
              onClick={resetDraft}
              disabled={isLoading || isSaving}
            >
              重置
            </Button>
            <Button
              type="button"
              variant="settings-primary"
              onClick={() => void save()}
              disabled={!hasDirty || isSaving || isLoading}
              isLoading={isSaving}
              loadingText="保存中..."
            >
              {isSaving ? '保存中...' : `保存配置${dirtyCount ? ` (${dirtyCount})` : ''}`}
            </Button>
          </div>
        </div>

        {saveError ? (
          <ApiErrorAlert
            className="mt-3"
            error={saveError}
            actionLabel={retryAction === 'save' ? '重试保存' : undefined}
            onAction={retryAction === 'save' ? () => void retry() : undefined}
          />
        ) : null}
      </div>

      {loadError ? (
        <ApiErrorAlert
          error={loadError}
          actionLabel={retryAction === 'load' ? '重试加载' : '重新加载'}
          onAction={() => void retry()}
          className="mb-4"
        />
      ) : null}

      {isLoading ? (
        <SettingsLoading />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <SettingsCategoryNav
              categories={categories}
              itemsByCategory={itemsByCategory}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </aside>

          <section className="space-y-4">
            {shouldShowSetupCard && effectiveSetupStatus ? (
              <SettingsSectionCard
                title="首次启动最小配置"
                description="即使首页入口已被关闭，这里仍可继续测试当前 LLM、保存试跑股票并执行 dry-run。"
              >
                <div className="space-y-3 rounded-2xl border border-amber-400/25 bg-amber-50/70 px-4 py-4 dark:bg-amber-500/10">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">基础配置尚未完成</p>
                      <p className="mt-1 text-xs leading-6 text-muted-text">
                        还缺 {effectiveSetupStatus.requiredMissingKeys.length} 项关键配置：
                        {effectiveSetupStatus.checks
                          .filter((check) => effectiveSetupStatus.requiredMissingKeys.includes(check.key))
                          .map((check) => check.title)
                          .join('、') || '请先补齐配置'}
                        。
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border settings-border bg-background/60 px-3 py-3 text-xs leading-6 text-secondary-text">
                    {effectiveSetupStatus.checks.map((check) => `${check.title}：${check.message}`).join(' / ')}
                  </div>
                  <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-xl border settings-border bg-background/60 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-secondary-text">
                          <p className="font-medium text-foreground">LLM 一键测试</p>
                          <p>{setupLLMPayload ? `${setupLLMPayload.name} · ${setupLLMPayload.models[0] || '未指定模型'}` : '请先在当前页补齐 AI 配置'}</p>
                        </div>
                        <Button
                          type="button"
                          variant="settings-secondary"
                          disabled={isTestingSetupLLM}
                          isLoading={isTestingSetupLLM}
                          loadingText="测试中..."
                          onClick={() => void testSetupLLM()}
                        >
                          测试 LLM
                        </Button>
                      </div>
                      {setupLLMResult ? (
                        <div className="mt-2 text-xs leading-5">
                          <p className={setupLLMResult.success ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>
                            {setupLLMResult.success
                              ? 'LLM 可用'
                              : `${setupLLMResult.errorType || 'unknown'}：${setupLLMResult.error || setupLLMResult.message}`}
                          </p>
                          {setupLLMResult.stages[0] ? (
                            <p className="text-secondary-text">
                              {setupLLMResult.stages.map((stage) => `${stage.title}：${stage.detail}`).join(' / ')}
                            </p>
                          ) : null}
                          {setupLLMResult.nextStep ? <p className="text-muted-text">下一步：{setupLLMResult.nextStep}</p> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-xl border settings-border bg-background/60 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">保存 1-3 只试跑股票并执行 dry-run</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="settings-secondary"
                            disabled={isSavingSetupStocks}
                            isLoading={isSavingSetupStocks}
                            loadingText="保存中..."
                            onClick={() => void saveSetupStocks()}
                          >
                            保存股票
                          </Button>
                          <Button
                            type="button"
                            variant="settings-secondary"
                            disabled={isRunningSetupSmoke}
                            isLoading={isRunningSetupSmoke}
                            loadingText="试跑中..."
                            onClick={() => void runSetupSmoke()}
                          >
                            首次试跑
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <input
                          value={setupStockInput}
                          onChange={(event) => setSetupStockInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addSetupStock(setupStockInput);
                            }
                          }}
                          placeholder="输入 600519、腾讯、AAPL"
                          className="block w-full rounded-xl border border-subtle bg-background px-3 py-2 text-sm text-foreground"
                          disabled={setupStocks.length >= MAX_SETUP_STOCKS}
                        />
                      </div>
                      {!!setupStocks.length && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {setupStocks.map((stock) => (
                            <button
                              key={stock}
                              type="button"
                              className="rounded-full border border-subtle bg-background/70 px-3 py-1 text-secondary-text"
                              onClick={() => setSetupStocks((current) => current.filter((item) => item !== stock))}
                            >
                              {stock} ×
                            </button>
                          ))}
                        </div>
                      )}
                      {setupStockError ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{setupStockError}</p> : null}
                      {setupSmokeResult ? (
                        <div className="mt-2 text-xs leading-5">
                          <p className={setupSmokeResult.success ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>
                            {setupSmokeResult.message}
                          </p>
                          {setupSmokeResult.summary ? <p className="text-secondary-text">{setupSmokeResult.summary}</p> : null}
                          {setupSmokeResult.nextStep ? <p className="text-muted-text">下一步：{setupSmokeResult.nextStep}</p> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SettingsSectionCard>
            ) : null}
            {activeCategory === 'system' ? <AuthSettingsCard /> : null}
            {activeCategory === 'system' ? (
              <SettingsSectionCard
                title="版本信息"
                description="用于确认当前 WebUI 静态资源是否已经切换到最新构建。"
              >
                <div
                  className={`grid grid-cols-1 gap-3 ${shouldShowDesktopVersionCard ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
                >
                  <div className="rounded-2xl border settings-border bg-background/40 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                      WebUI 版本
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-foreground">
                      {WEB_BUILD_INFO.version}
                    </p>
                  </div>
                  <div className="rounded-2xl border settings-border bg-background/40 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                      构建标识
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-foreground">
                      {WEB_BUILD_INFO.buildId}
                    </p>
                  </div>
                  <div className="rounded-2xl border settings-border bg-background/40 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                      构建时间
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-foreground">
                      {WEB_BUILD_INFO.buildTime}
                    </p>
                  </div>
                  {shouldShowDesktopVersionCard ? (
                    <div className="rounded-2xl border settings-border bg-background/40 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
                        桌面端版本
                      </p>
                      <p className="mt-2 break-all font-mono text-sm text-foreground">
                        {desktopAppVersion}
                      </p>
                    </div>
                  ) : null}
                </div>
                <p className="text-xs leading-6 text-muted-text">
                  重新执行前端构建或 Docker 镜像构建后，此处的构建标识和构建时间会更新，可用来确认当前页面资源是否已切换。
                </p>
                {canCheckDesktopUpdate ? (
                  <div className="mt-4 space-y-3 rounded-2xl border settings-border bg-background/30 px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">桌面端更新</p>
                        <p className="text-xs leading-6 text-muted-text">
                          启动后会自动检查 GitHub Releases 最新正式版；发现更新时仅提醒并跳转下载页，不会静默下载或自动安装。
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="settings-secondary"
                        onClick={() => void handleDesktopUpdateCheck()}
                        disabled={isCheckingDesktopUpdate}
                        isLoading={isCheckingDesktopUpdate}
                        loadingText="检查中..."
                      >
                        检查更新
                      </Button>
                    </div>
                    {desktopUpdateNotice ? (
                      <SettingsAlert
                        title={desktopUpdateNotice.title}
                        message={desktopUpdateNotice.message}
                        variant={desktopUpdateNotice.variant}
                        actionLabel={desktopUpdateNotice.actionLabel}
                        onAction={desktopUpdateNotice.actionLabel ? () => {
                          void openDesktopReleasePage();
                        } : undefined}
                      />
                    ) : (
                      <p className="text-xs leading-6 text-muted-text">
                        当前尚无更新状态，应用启动后会在后台自动检查。
                      </p>
                    )}
                  </div>
                ) : null}
                {WEB_BUILD_INFO.isFallbackVersion ? (
                  <p className="text-xs leading-6 text-amber-700 dark:text-amber-300">
                    当前 package.json 仍为占位版本 0.0.0，页面已自动回退展示构建标识，避免误判旧资源仍在生效。
                  </p>
                ) : null}
              </SettingsSectionCard>
            ) : null}
            {activeCategory === 'system' && isDesktopRuntime ? (
              <SettingsSectionCard
                title="配置备份"
                description="导出当前已保存的 .env 备份，或从备份文件恢复桌面端配置。导入会覆盖备份中出现的键并立即重载。"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="settings-secondary"
                      onClick={() => void downloadDesktopEnv()}
                      disabled={desktopActionDisabled}
                      isLoading={isExportingEnv}
                      loadingText="导出中..."
                    >
                      导出 .env
                    </Button>
                    <Button
                      type="button"
                      variant="settings-primary"
                      onClick={beginDesktopImport}
                      disabled={desktopActionDisabled}
                      isLoading={isImportingEnv}
                      loadingText="导入中..."
                    >
                      导入 .env
                    </Button>
                    <input
                      ref={desktopImportRef}
                      type="file"
                      accept=".env,.txt"
                      className="hidden"
                      onChange={(event) => {
                        void handleDesktopImportFile(event);
                      }}
                    />
                  </div>
                  <p className="text-xs leading-6 text-muted-text">
                    导出内容仅包含当前已保存配置，不包含页面上尚未保存的本地草稿。
                  </p>
                  {desktopActionError ? (
                    <ApiErrorAlert
                      error={desktopActionError}
                      actionLabel={desktopActionError.status === 409 ? '重新加载' : undefined}
                      onAction={desktopActionError.status === 409 ? () => void load() : undefined}
                    />
                  ) : null}
                  {!desktopActionError && desktopActionSuccess ? (
                    <SettingsAlert title="操作成功" message={desktopActionSuccess} variant="success" />
                  ) : null}
                </div>
              </SettingsSectionCard>
            ) : null}
            {activeCategory === 'base' ? (
              <SettingsSectionCard
                title="智能导入"
                description="从图片、文件或剪贴板中提取股票代码，并合并到自选股列表。"
              >
                <IntelligentImport
                  stockListValue={
                    (activeItems.find((i) => i.key === 'STOCK_LIST')?.value as string) ?? ''
                  }
                  configVersion={configVersion}
                  maskToken={maskToken}
                  onMerged={async () => {
                    await refreshAfterExternalSave(['STOCK_LIST']);
                  }}
                  disabled={isSaving || isLoading}
                />
              </SettingsSectionCard>
            ) : null}
            {activeCategory === 'ai_model' ? (
              <SettingsSectionCard
                title="AI 模型接入"
                description="统一管理模型渠道、基础地址、API Key、主模型与备选模型。"
              >
                <LLMChannelEditor
                  items={rawActiveItems}
                  configVersion={configVersion}
                  maskToken={maskToken}
                  onSaved={async (updatedItems) => {
                    await refreshAfterExternalSave(updatedItems.map((item) => item.key));
                  }}
                  disabled={isSaving || isLoading}
                />
              </SettingsSectionCard>
            ) : null}
            {activeCategory === 'system' && passwordChangeable ? (
              <ChangePasswordCard />
            ) : null}
            {activeItems.length ? (
              <SettingsSectionCard
                title="当前分类配置项"
                description={getCategoryDescriptionZh(activeCategory as SystemConfigCategory, '') || '使用统一字段卡片维护当前分类的系统配置。'}
              >
                {activeItems.map((item) => (
                  <SettingsField
                    key={item.key}
                    item={item}
                    value={item.value}
                    disabled={isSaving}
                    onChange={setDraftValue}
                    issues={issueByKey[item.key] || []}
                  />
                ))}
              </SettingsSectionCard>
            ) : (
              <EmptyState
                title="当前分类下暂无配置项"
                description="当前分类没有可编辑字段；可切换左侧分类继续查看其它系统配置。"
                className="settings-surface-panel settings-border-strong border-none bg-transparent shadow-none"
              />
            )}
          </section>
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 w-[320px] max-w-[calc(100vw-24px)]">
          {toast.type === 'success'
            ? <SettingsAlert title="操作成功" message={toast.message} variant="success" />
            : <ApiErrorAlert error={toast.error} />}
        </div>
      ) : null}
      <ConfirmDialog
        isOpen={showImportConfirm}
        title="导入会覆盖当前草稿"
        message="当前页面还有未保存修改。继续导入会丢弃这些本地草稿，并立即用备份文件中的键值更新已保存配置。"
        confirmText="继续导入"
        cancelText="取消"
        onConfirm={() => {
          setShowImportConfirm(false);
          desktopImportRef.current?.click();
        }}
        onCancel={() => {
          setShowImportConfirm(false);
        }}
      />
    </div>
  );
};

export default SettingsPage;
