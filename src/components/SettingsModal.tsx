import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { PodiumCount, TournamentFormat } from '../utils/bracketEngine';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  format: TournamentFormat;
  playerCount: number;
  podiumCount: PodiumCount;
  onApply: (next: {
    title: string;
    format: TournamentFormat;
    playerCount: number;
    podiumCount: PodiumCount;
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  title,
  format,
  playerCount,
  podiumCount,
  onApply,
}) => {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftFormat, setDraftFormat] = useState<TournamentFormat>(format);
  const [draftCountInput, setDraftCountInput] = useState(String(playerCount));
  const [draftPodium, setDraftPodium] = useState<PodiumCount>(podiumCount);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftTitle(title);
      setDraftFormat(format);
      setDraftCountInput(String(playerCount));
      setDraftPodium(podiumCount);
      setErrorMsg(null);
    }
  }, [open, title, format, playerCount, podiumCount]);

  if (!open) return null;

  const maxAllowed = draftFormat === 'double' ? 8 : 32;
  const parsedCount = parseInt(draftCountInput, 10);

  const validateCount = (fmt: TournamentFormat, raw: string) => {
    const num = parseInt(raw, 10);
    const limit = fmt === 'double' ? 8 : 32;
    if (Number.isNaN(num) || num < 2) {
      setErrorMsg('参加者数は2名以上で入力してください。');
      return false;
    }
    if (num > limit) {
      setErrorMsg(
        fmt === 'double'
          ? 'ダブルエリミネーションの参加者は最大8名までです。'
          : 'シングルエリミネーションの参加者は最大32名までです。'
      );
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleFormatChange = (nextFmt: TournamentFormat) => {
    setDraftFormat(nextFmt);
    validateCount(nextFmt, draftCountInput);
  };

  const handleCountChange = (val: string) => {
    setDraftCountInput(val);
    validateCount(draftFormat, val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCount(draftFormat, draftCountInput)) return;
    onApply({
      title: draftTitle.trim() || 'TOURNAMENT CHAMPIONSHIP',
      format: draftFormat,
      playerCount: parsedCount,
      podiumCount: draftPodium,
    });
    onClose();
  };

  const presets = draftFormat === 'double' ? [4, 6, 8] : [4, 8, 16, 24, 32];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-slate-700/80 bg-[#0D111A] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white tracking-tight">大会設定</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tournament Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              大会タイトル
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              maxLength={60}
              placeholder="例: APEX FIGHT NIGHT #04"
              className="w-full rounded-md border border-slate-700 bg-[#080A0F] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Tournament Format */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              トーナメント形式
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleFormatChange('single')}
                className={`rounded-md border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                  draftFormat === 'single'
                    ? 'border-cyan-400/70 bg-cyan-500/12 text-white'
                    : 'border-slate-800 bg-[#080A0F] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-bold">シングルエリミネーション</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  最大32名 · 16名以上で左右対称ツリー
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFormatChange('double')}
                className={`rounded-md border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                  draftFormat === 'double'
                    ? 'border-[#FF5A1F]/80 bg-[#FF5A1F]/12 text-white'
                    : 'border-slate-800 bg-[#080A0F] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-bold">ダブルエリミネーション</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  最大8名 · 勝者側/敗者側・リセット対応
                </div>
              </button>
            </div>
          </div>

          {/* Player Count */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                参加者数（2〜{maxAllowed}名）
              </label>
              <span className="text-[11px] text-slate-400 font-mono-num">
                MAX {maxAllowed}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="number"
                min={2}
                max={32}
                value={draftCountInput}
                onChange={(e) => handleCountChange(e.target.value)}
                className={`w-24 rounded-md border bg-[#080A0F] px-3 py-2 text-sm font-mono-num text-white focus:outline-none ${
                  errorMsg
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-700 focus:border-cyan-400'
                }`}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleCountChange(String(p))}
                    className={`px-2.5 py-1.5 rounded text-xs font-mono-num font-semibold border transition-colors cursor-pointer ${
                      parsedCount === p
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-800 bg-[#080A0F] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {p}名
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="mt-2 flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Podium Count */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              入賞者数（最大3名）
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as PodiumCount[]).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setDraftPodium(cnt)}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    draftPodium === cnt
                      ? 'border-amber-400/70 bg-amber-500/12 text-amber-200'
                      : 'border-slate-800 bg-[#080A0F] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cnt === 1 ? '1名（優勝のみ）' : cnt === 2 ? '2名（準優勝まで）' : '3名（3位決定戦あり）'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={Boolean(errorMsg)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-cyan-500 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              設定を反映
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
