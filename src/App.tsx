import { useEffect, useMemo, useState } from 'react';
import {
  SlidersHorizontal,
  Users,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  FileCode2,
} from 'lucide-react';
import {
  buildAndEvaluateBracket,
  PodiumCount,
  TournamentFormat,
} from './utils/bracketEngine';
import { BracketStage } from './components/BracketStage';
import { SettingsModal } from './components/SettingsModal';
import { BulkPlayersModal } from './components/BulkPlayersModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { soundFx } from './utils/soundFx';
import { buildStandaloneHtml } from './utils/standaloneHtml';

const STORAGE_KEY = 'apex_bracket_studio_v1';

const DEFAULT_PLAYERS = [
  'KAZUYA', 'JIN', 'RYU', 'KEN',
  'CHUN-LI', 'GUILE', 'LUKE', 'CAMMY',
  'JURI', 'AKUMA', 'TERRY', 'MAI',
  'SOL', 'KY', 'BAIKEN', 'CHIPP',
];

interface PersistedState {
  title: string;
  format: TournamentFormat;
  playerCount: number;
  podiumCount: PodiumCount;
  players: string[];
  results: Record<string, 1 | 2>;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const fmt: TournamentFormat = parsed.format === 'double' ? 'double' : 'single';
      const maxP = fmt === 'double' ? 8 : 32;
      const cnt = Math.max(2, Math.min(maxP, parsed.playerCount || 16));
      const pod: PodiumCount = parsed.podiumCount === 1 || parsed.podiumCount === 2 ? parsed.podiumCount : 3;
      const players = Array.isArray(parsed.players) && parsed.players.length >= cnt
        ? parsed.players
        : Array.from({ length: cnt }, (_, i) => DEFAULT_PLAYERS[i] || `Player ${i + 1}`);
      return {
        title: parsed.title || 'APEX FIGHT NIGHT #01',
        format: fmt,
        playerCount: cnt,
        podiumCount: pod,
        players,
        results: parsed.results && typeof parsed.results === 'object' ? parsed.results : {},
      };
    }
  } catch {
    // ignore storage read errors
  }

  return {
    title: 'APEX FIGHT NIGHT #01',
    format: 'single',
    playerCount: 16,
    podiumCount: 3,
    players: [...DEFAULT_PLAYERS],
    results: {},
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);
  const [title, setTitle] = useState(initial.title);
  const [format, setFormat] = useState<TournamentFormat>(initial.format);
  const [playerCount, setPlayerCount] = useState(initial.playerCount);
  const [podiumCount, setPodiumCount] = useState<PodiumCount>(initial.podiumCount);
  const [players, setPlayers] = useState<string[]>(initial.players);
  const [results, setResults] = useState<Record<string, 1 | 2>>(initial.results);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        title,
        format,
        playerCount,
        podiumCount,
        players,
        results,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage write errors
    }
  }, [title, format, playerCount, podiumCount, players, results]);

  useEffect(() => {
    soundFx.muted = muted;
  }, [muted]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && broadcastMode) {
        setBroadcastMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [broadcastMode]);

  const activePlayers = useMemo(
    () => Array.from({ length: playerCount }, (_, i) => players[i] || `Player ${i + 1}`),
    [players, playerCount]
  );

  const bracketState = useMemo(
    () => buildAndEvaluateBracket(format, activePlayers, podiumCount, results),
    [format, activePlayers, podiumCount, results]
  );

  const handleSelectWinner = (matchId: string, slot: 1 | 2) => {
    setResults((prev) => {
      const next = { ...prev };
      if (next[matchId] === slot) {
        delete next[matchId];
        soundFx.playUndo();
      } else {
        next[matchId] = slot;
        const m = bracketState.matches[matchId];
        const isGrandFinal =
          matchId === 'GF-1' ||
          matchId === 'GF-2' ||
          (m?.bracket === 'single' && !m.nextWinTarget);
        if (isGrandFinal && !(matchId === 'GF-1' && slot === 2)) {
          soundFx.playChampion();
        } else {
          soundFx.playAdvance();
        }
      }
      return next;
    });
  };

  const handleApplySettings = (next: {
    title: string;
    format: TournamentFormat;
    playerCount: number;
    podiumCount: PodiumCount;
  }) => {
    const structureChanged =
      next.format !== format || next.playerCount !== playerCount;

    setTitle(next.title);
    setFormat(next.format);
    setPlayerCount(next.playerCount);
    setPodiumCount(next.podiumCount);

    setPlayers((prev) => {
      const copy = [...prev];
      while (copy.length < next.playerCount) {
        copy.push(DEFAULT_PLAYERS[copy.length] || `Player ${copy.length + 1}`);
      }
      return copy;
    });

    if (structureChanged) {
      setResults({});
    }
  };

  const handleApplyPlayers = (updated: string[]) => {
    setPlayers((prev) => {
      const copy = [...prev];
      updated.forEach((name, idx) => {
        copy[idx] = name;
      });
      return copy;
    });
  };

  const handleResetProgress = () => {
    setResults({});
    soundFx.playUndo();
  };

  const handleDownloadStandaloneHtml = () => {
    const html = buildStandaloneHtml({
      title,
      format,
      playerCount,
      podiumCount,
      players: activePlayers,
      results,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tournament-bracket.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#06080D] text-slate-100 overflow-hidden">
      {/* Control Header */}
      {!broadcastMode && (
        <header className="h-14 px-5 border-b border-slate-800/80 bg-[#0B0E16] flex items-center justify-between gap-6 shrink-0 z-30">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 rounded bg-[#080A0F] border border-slate-700 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none" aria-hidden="true">
                <path d="M4 8h7v5H4M4 19h7v5H4M11 10.5h5v11h-5" stroke="#00E5FF" strokeWidth="2.2" />
                <path d="M16 16h5" stroke="#FF5A1F" strokeWidth="2.5" />
                <polygon points="22,12 28,16 22,20" fill="#F5B82E" />
              </svg>
            </div>
            <span className="font-display text-xl font-extrabold tracking-wide text-white whitespace-nowrap">
              Tournament Studio
            </span>
          </div>

          {/* Primary Operations */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              大会設定
            </button>

            <button
              type="button"
              onClick={() => setPlayersOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-xs font-semibold text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              参加者一括編集
            </button>

            <button
              type="button"
              onClick={handleResetProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              進行リセット
            </button>

            <button
              type="button"
              onClick={handleDownloadStandaloneHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="HTML/CSS/JSを1ファイルに統合したHTMLをダウンロード"
            >
              <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
              単一HTML出力
            </button>

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="p-1.5 rounded-md border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
              aria-label={muted ? '効果音をオン' : '効果音をミュート'}
              title={muted ? '効果音ミュート中' : '効果音オン'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setBroadcastMode(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              配信モード (16:9)
            </button>
          </div>
        </header>
      )}

      {/* Main 16:9 Broadcast Stage */}
      <main className="flex-1 w-full h-full p-2 sm:p-3 overflow-hidden flex items-center justify-center">
        <BracketStage
          title={title}
          playerCount={playerCount}
          podiumCount={podiumCount}
          bracketState={bracketState}
          onSelectWinner={handleSelectWinner}
          onTitleChange={setTitle}
          broadcastMode={broadcastMode}
        />
      </main>

      {/* Exit Broadcast Floating Button */}
      {broadcastMode && (
        <button
          type="button"
          onClick={() => setBroadcastMode(false)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700/80 bg-[#0B0E16]/85 hover:bg-slate-800 text-xs font-semibold text-slate-300 backdrop-blur-sm transition-colors cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          操作パネルを表示 (ESC)
        </button>
      )}

      {/* Modals */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={title}
        format={format}
        playerCount={playerCount}
        podiumCount={podiumCount}
        onApply={handleApplySettings}
      />

      <BulkPlayersModal
        open={playersOpen}
        onClose={() => setPlayersOpen(false)}
        players={activePlayers}
        onApply={handleApplyPlayers}
      />

      <OfflineIndicator />
    </div>
  );
}
