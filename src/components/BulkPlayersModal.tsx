import React, { useState, useEffect } from 'react';
import { X, Shuffle, Check, Users } from 'lucide-react';

interface BulkPlayersModalProps {
  open: boolean;
  onClose: () => void;
  players: string[];
  onApply: (updated: string[]) => void;
}

const SAMPLE_POOL = [
  'KAZUYA', 'JIN', 'RYU', 'KEN', 'CHUN-LI', 'GUILE', 'LUKE', 'CAMMY',
  'JURI', 'AKUMA', 'TERRY', 'MAI', 'SOL', 'KY', 'BAIKEN', 'CHIPP',
  'DAIGO', 'TOKUDO', 'BONCHAN', 'PUNK', 'MENARD', 'ARSLAN', 'KNEE', 'ULSAN',
  'SONICFOX', 'GO1', 'FENRITTI', 'LEFFEN', 'MANGO', 'MKLEO', 'SPARG0', 'ACOLA',
];

export const BulkPlayersModal: React.FC<BulkPlayersModalProps> = ({
  open,
  onClose,
  players,
  onApply,
}) => {
  const [mode, setMode] = useState<'list' | 'text'>('list');
  const [listDraft, setListDraft] = useState<string[]>(players);
  const [textDraft, setTextDraft] = useState('');

  useEffect(() => {
    if (open) {
      setListDraft(players);
      setTextDraft(players.join('\n'));
    }
  }, [open, players]);

  if (!open) return null;

  const switchMode = (next: 'list' | 'text') => {
    if (next === 'text') {
      setTextDraft(listDraft.join('\n'));
    } else {
      const lines = textDraft.split(/\r?\n/);
      const merged = players.map((_, i) => (lines[i] !== undefined ? lines[i] : listDraft[i] || `Player ${i + 1}`));
      setListDraft(merged);
    }
    setMode(next);
  };

  const handleShuffle = () => {
    const current =
      mode === 'text'
        ? players.map((_, i) => textDraft.split(/\r?\n/)[i]?.trim() || `Player ${i + 1}`)
        : [...listDraft];
    for (let i = current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [current[i], current[j]] = [current[j], current[i]];
    }
    setListDraft(current);
    setTextDraft(current.join('\n'));
  };

  const handleFillSample = () => {
    const next = players.map((_, i) => SAMPLE_POOL[i % SAMPLE_POOL.length]);
    setListDraft(next);
    setTextDraft(next.join('\n'));
  };

  const handleSave = () => {
    const finalList =
      mode === 'text'
        ? players.map((_, i) => {
            const line = textDraft.split(/\r?\n/)[i];
            return (line ?? '').trim() || `Player ${i + 1}`;
          })
        : listDraft.map((n, i) => n.trim() || `Player ${i + 1}`);
    onApply(finalList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-slate-700/80 bg-[#0D111A] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              参加者名の一括編集（{players.length}名）
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-800/80 bg-[#090C12] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-md bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => switchMode('list')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              シード順リスト
            </button>
            <button
              type="button"
              onClick={() => switchMode('text')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'text' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              テキスト一括貼り付け
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillSample}
              className="px-3 py-1.5 rounded border border-slate-700 bg-slate-800/60 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              サンプル選手名
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 bg-slate-800/60 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              シードシャッフル
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {mode === 'list' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {listDraft.map((name, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-md border border-slate-800 bg-[#080A0F] px-2.5 py-1.5 focus-within:border-cyan-400/70"
                >
                  <span className="font-mono-num text-xs text-slate-500 w-7 shrink-0">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const copy = [...listDraft];
                      copy[idx] = e.target.value;
                      setListDraft(copy);
                    }}
                    placeholder={`Player ${idx + 1}`}
                    className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                1行につき1名のプレイヤー名を入力してください（上からシード #01 〜 #{String(players.length).padStart(2, '0')} に対応します）。
              </p>
              <textarea
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                rows={Math.min(16, Math.max(8, players.length))}
                className="w-full rounded-md border border-slate-700 bg-[#080A0F] p-3.5 text-sm font-mono-num text-white leading-relaxed focus:border-cyan-400 focus:outline-none"
                placeholder="Player 1&#10;Player 2&#10;..."
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-cyan-500 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            参加者を更新
          </button>
        </div>
      </div>
    </div>
  );
};
