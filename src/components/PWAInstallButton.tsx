import React, { useEffect, useState } from 'react';
import { Download, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showFallback, setShowFallback] = useState(false);
  const [autoInstallPrompt, setAutoInstallPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('install') === '1' && !isInIframe && !isInstalled) {
      setAutoInstallPrompt(true);
    }
  }, [isInIframe, isInstalled]);

  if (isInstalled) return null;

  const topLevelInstallUrl = (() => {
    if (typeof window === 'undefined') return '?install=1';
    const url = new URL(window.location.href);
    url.searchParams.set('install', '1');
    return url.toString();
  })();

  const handleOneTouchInstall = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setAutoInstallPrompt(false);
        return;
      }
    }
    setShowFallback(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOneTouchInstall}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          isInstallable
            ? 'border-amber-400 bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-[0_0_16px_rgba(245,184,46,0.3)]'
            : 'border-amber-400/60 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25'
        }`}
        title={isInstallable ? 'ワンタッチでアプリをインストール' : 'アプリとしてインストール'}
      >
        <Download className="w-3.5 h-3.5" />
        {isInstallable ? 'ワンタッチでアプリ化' : 'アプリ化 (PWA)'}
      </button>

      {/* Top-level ?install=1 banner when opened directly for 1-click install */}
      {autoInstallPrompt && isInstallable && (
        <div className="fixed top-16 right-4 z-50 w-80 rounded-lg border border-amber-400/60 bg-[#0D111A] p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>インストールの準備が完了しました</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoInstallPrompt(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
            下のボタンを押すと、即座にデスクトップ／ホーム画面へアプリ化できます。
          </p>
          <button
            type="button"
            onClick={handleOneTouchInstall}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-md bg-amber-400 hover:bg-amber-300 py-2 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            今すぐインストールする
          </button>
        </div>
      )}

      {/* Fallback Modal only when native prompt is blocked by iframe or iOS Safari */}
      {showFallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-[#0D111A] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">アプリとしてインストール (PWA)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFallback(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
              {isInIframe ? (
                <>
                  <p>
                    ブラウザのセキュリティ仕様により、プレビュー枠（iframe）内では自動インストールダイアログがブロックされます。下のボタンで専用タブを開くと、<strong>ワンタッチでインストール</strong>できます。
                  </p>
                  <a
                    href={topLevelInstallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowFallback(false)}
                    className="w-full flex items-center justify-center gap-2 rounded-md bg-amber-400 hover:bg-amber-300 py-2.5 px-4 text-xs font-bold text-slate-950 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    専用タブで開いてワンタッチインストール
                  </a>
                </>
              ) : isIOS ? (
                <div className="space-y-2">
                  <p className="font-bold text-white">iOS Safari のインストール手順</p>
                  <p>1. 画面下部の <strong>共有アイコン</strong> をタップします。</p>
                  <p>2. <strong>「ホーム画面に追加」</strong> をタップしてください。</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    ブラウザ側で現在インストールダイアログが保留・または既にインストール済みと判定されています。
                  </p>
                  <p>
                    アドレスバー右端の <strong>インストールアイコン</strong>、またはブラウザメニューの <strong>「APEX BRACKET をインストール」</strong> から直接アプリ化できます。
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFallback(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
