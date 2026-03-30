'use client';

import { useSettingsStore } from '@/lib/store';

export default function ToggleBar() {
  const {
    showTranslation, setShowTranslation,
    showVocab, setShowVocab,
    showSlang, setShowSlang,
    showIdiom, setShowIdiom,
    autoFollow, setAutoFollow,
    classificationSystem, setClassificationSystem,
    minLevel, setMinLevel,
    nativeLanguage, setNativeLanguage,
  } = useSettingsStore();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 text-xs">
      <label className="flex items-center gap-1 cursor-pointer text-gray-600 dark:text-gray-300 select-none">
        <input type="checkbox" checked={showTranslation} onChange={() => setShowTranslation(!showTranslation)} className="accent-blue-500" />
        翻訳
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-gray-600 dark:text-gray-300 select-none">
        <input type="checkbox" checked={showVocab} onChange={() => setShowVocab(!showVocab)} className="accent-blue-500" />
        語彙レベル
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-gray-600 dark:text-gray-300 select-none">
        <input type="checkbox" checked={showSlang} onChange={() => setShowSlang(!showSlang)} className="accent-blue-500" />
        スラング
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-gray-600 dark:text-gray-300 select-none">
        <input type="checkbox" checked={showIdiom} onChange={() => setShowIdiom(!showIdiom)} className="accent-blue-500" />
        イディオム
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-gray-600 dark:text-gray-300 select-none">
        <input type="checkbox" checked={autoFollow} onChange={() => setAutoFollow(!autoFollow)} className="accent-blue-500" />
        自動追従
      </label>

      <select
        value={classificationSystem}
        onChange={e => setClassificationSystem(e.target.value as '5level' | 'cefr' | 'frequency' | 'tier')}
        className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
      >
        <option value="5level">5段階</option>
        <option value="cefr">CEFR</option>
        <option value="frequency">頻出度</option>
        <option value="tier">3段階</option>
      </select>

      <label className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
        最低Lv:
        <select
          value={minLevel}
          onChange={e => setMinLevel(Number(e.target.value))}
          className="px-1 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 w-12"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </label>

      <select
        value={nativeLanguage}
        onChange={e => setNativeLanguage(e.target.value)}
        className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
      >
        <option value="ja">日本語</option>
        <option value="zh">中文</option>
        <option value="ko">한국어</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
}
