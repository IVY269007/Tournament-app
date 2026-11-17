import React, { useEffect, useRef, useState } from 'react';
import { Crown, Award } from 'lucide-react';
import {
  BracketMatch,
  BracketState,
  PodiumCount,
  SlotPlayer,
} from '../utils/bracketEngine';

interface PositionedCard {
  match: BracketMatch;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  direction: 'ltr' | 'rtl' | 'center';
}

interface ConnectorLine {
  id: string;
  d: string;
  active: boolean;
  tone: 'cyan' | 'orange' | 'gold';
}

interface BracketStageProps {
  title: string;
  playerCount: number;
  podiumCount: PodiumCount;
  bracketState: BracketState;
  onSelectWinner: (matchId: string, slot: 1 | 2) => void;
  onTitleChange?: (newTitle: string) => void;
  broadcastMode?: boolean;
}

const LOGICAL_W = 1600;
const LOGICAL_H = 900;

export const BracketStage: React.FC<BracketStageProps> = ({
  title,
  playerCount,
  podiumCount,
  bracketState,
  onSelectWinner,
  onTitleChange,
  broadcastMode = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const sx = rect.width / LOGICAL_W;
      const sy = rect.height / LOGICAL_H;
      setScale(Math.min(sx, sy));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const { cards, lines, roundHeaders, zoneLabels } = computeLayout(bracketState);
  const { podium, format } = bracketState;

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
      <div
        style={{
          width: LOGICAL_W,
          height: LOGICAL_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative shrink-0 arena-grid-bg border border-slate-800/80 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden select-none"
      >
        {/* Top Broadcast Header Bar */}
        <header className="absolute top-0 left-0 right-0 h-[104px] px-8 flex items-center justify-between border-b border-slate-800/80 bg-[#0A0D14]/90 backdrop-blur-sm z-10">
          <div className="flex flex-col justify-center min-w-0 max-w-[780px]">
            <div className="flex items-center gap-2.5 text-[13px] font-medium text-slate-400 tracking-wide">
              <span className="text-cyan-400 font-semibold">
                {format === 'single' ? 'SINGLE ELIMINATION' : 'DOUBLE ELIMINATION'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{playerCount} PLAYERS</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">TOP {podiumCount}</span>
              {bracketState.isSymmetric && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">SYMMETRIC BRACKET</span>
                </>
              )}
            </div>

            {editingTitle && onTitleChange ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false);
                }}
                maxLength={60}
                className="mt-0.5 bg-slate-900/90 border border-cyan-500/50 rounded px-2 py-0.5 text-[38px] leading-tight font-display font-extrabold tracking-tight text-white outline-none w-[680px]"
              />
            ) : (
              <h1
                onClick={() => !broadcastMode && onTitleChange && setEditingTitle(true)}
                title={broadcastMode ? undefined : 'クリックしてタイトルを編集'}
                className={`mt-0.5 text-[42px] leading-none font-display font-extrabold tracking-tight text-white truncate ${
                  !broadcastMode && onTitleChange ? 'cursor-pointer hover:text-cyan-100 transition-colors' : ''
                }`}
              >
                {title || 'TOURNAMENT CHAMPIONSHIP'}
              </h1>
            )}
          </div>

          {/* Live Podium Standings */}
          <div className="flex items-stretch gap-3 shrink-0">
            <PodiumSlot
              rank={1}
              label="1ST · CHAMPION"
              player={podium.first}
              accent="gold"
            />
            {podiumCount >= 2 && (
              <PodiumSlot
                rank={2}
                label="2ND · RUNNER-UP"
                player={podium.second}
                accent="silver"
              />
            )}
            {podiumCount >= 3 && (
              <PodiumSlot
                rank={3}
                label="3RD PLACE"
                player={podium.third}
                accent="bronze"
              />
            )}
          </div>
        </header>

        {/* Zone Labels (e.g., WINNERS BRACKET / LOSERS BRACKET) */}
        {zoneLabels.map((zl) => (
          <div
            key={zl.id}
            style={{ left: zl.x, top: zl.y }}
            className={`absolute flex items-center gap-2 text-[13px] font-display font-bold tracking-[0.14em] ${
              zl.tone === 'cyan'
                ? 'text-cyan-400'
                : zl.tone === 'orange'
                ? 'text-[#FF5A1F]'
                : 'text-amber-400'
            }`}
          >
            <span
              className={`inline-block w-2 h-2 rotate-45 ${
                zl.tone === 'cyan'
                  ? 'bg-cyan-400'
                  : zl.tone === 'orange'
                  ? 'bg-[#FF5A1F]'
                  : 'bg-amber-400'
              }`}
            />
            {zl.text}
          </div>
        ))}

        {/* Round Column Headers */}
        {roundHeaders.map((rh) => (
          <div
            key={rh.id}
            style={{ left: rh.x, top: rh.y, width: rh.w }}
            className="absolute text-center text-[12px] font-display font-bold tracking-[0.12em] text-slate-400 uppercase"
          >
            {rh.label}
          </div>
        ))}

        {/* SVG Elbow Connectors */}
        <svg
          width={LOGICAL_W}
          height={LOGICAL_H}
          viewBox={`0 0 ${LOGICAL_W} ${LOGICAL_H}`}
          className="absolute inset-0 pointer-events-none"
        >
          {lines.map((line) => {
            const strokeColor = line.active
              ? line.tone === 'orange'
                ? '#FF5A1F'
                : line.tone === 'gold'
                ? '#F5B82E'
                : '#00E5FF'
              : '#253045';
            return (
              <path
                key={line.id}
                d={line.d}
                fill="none"
                stroke={strokeColor}
                strokeWidth={line.active ? 2.25 : 1.5}
                strokeOpacity={line.active ? 0.9 : 0.75}
              />
            );
          })}
        </svg>

        {/* Match Cards */}
        {cards.map((card) => (
          <MatchCard
            key={card.match.id}
            card={card}
            onSelectWinner={onSelectWinner}
          />
        ))}
      </div>
    </div>
  );
};

const PodiumSlot: React.FC<{
  rank: 1 | 2 | 3;
  label: string;
  player: SlotPlayer | null;
  accent: 'gold' | 'silver' | 'bronze';
}> = ({ rank, label, player, accent }) => {
  const styles =
    accent === 'gold'
      ? {
          border: player ? 'border-amber-400/70 bg-amber-500/10' : 'border-slate-800 bg-[#0F131C]/80',
          label: 'text-amber-400',
          icon: <Crown className="w-3.5 h-3.5 text-amber-400" />,
        }
      : accent === 'silver'
      ? {
          border: player ? 'border-slate-400/60 bg-slate-400/10' : 'border-slate-800 bg-[#0F131C]/80',
          label: 'text-slate-300',
          icon: <Award className="w-3.5 h-3.5 text-slate-300" />,
        }
      : {
          border: player ? 'border-[#FF5A1F]/60 bg-[#FF5A1F]/10' : 'border-slate-800 bg-[#0F131C]/80',
          label: 'text-[#FF8C5A]',
          icon: <Award className="w-3.5 h-3.5 text-[#FF8C5A]" />,
        };

  return (
    <div
      className={`w-[210px] rounded border px-3 py-2 flex flex-col justify-center transition-colors duration-150 ${styles.border}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-display font-bold tracking-[0.1em] ${styles.label}`}>
          {label}
        </span>
        {styles.icon}
      </div>
      <div className="mt-1 flex items-center gap-2 min-w-0">
        {player ? (
          <>
            <span className="font-mono-num text-[11px] text-slate-400 shrink-0">
              #{String(player.seed).padStart(2, '0')}
            </span>
            <span className="text-[15px] font-bold text-white truncate">
              {player.name}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-slate-600 font-medium">
            {rank === 1 ? 'TBD — 優勝待ち' : 'TBD'}
          </span>
        )}
      </div>
    </div>
  );
};

const MatchCard: React.FC<{
  card: PositionedCard;
  onSelectWinner: (matchId: string, slot: 1 | 2) => void;
}> = ({ card, onSelectWinner }) => {
  const { match, x, y, w, h } = card;
  const isFinal =
    match.id === 'GF-1' ||
    match.id === 'GF-2' ||
    (match.bracket === 'single' && !match.nextWinTarget);
  const isLosers = match.bracket === 'losers';
  const isThird = match.bracket === 'third';

  const rowH = Math.floor((h - 2) / 2);
  const isCompact = h <= 62;
  const canInteract = !match.isDisabled && !match.isAutoBye && Boolean(match.p1 && match.p2);

  let frameClass = 'border-slate-800 bg-[#0F141E]/95';
  if (match.isDisabled) {
    frameClass = 'border-slate-800/50 bg-[#0B0E15]/60 opacity-45';
  } else if (isFinal) {
    frameClass = 'border-amber-500/45 bg-[#121622] shadow-[0_0_24px_rgba(245,184,46,0.08)]';
  } else if (isThird) {
    frameClass = 'border-[#FF5A1F]/40 bg-[#12151F]';
  } else if (match.effectiveWinner) {
    frameClass = isLosers
      ? 'border-[#FF5A1F]/45 bg-[#111520]'
      : 'border-cyan-500/40 bg-[#111622]';
  }

  return (
    <div
      style={{ left: x, top: y, width: w, height: h }}
      className={`absolute rounded-[4px] border transition-colors duration-150 flex flex-col justify-between overflow-hidden ${frameClass}`}
    >
      {/* Subtle top-right label for center special matches */}
      {(isFinal || isThird || match.id === 'GF-2') && (
        <div
          className={`absolute -top-0 right-1.5 px-1 text-[9px] font-display font-bold tracking-wider uppercase pointer-events-none ${
            match.id === 'GF-2'
              ? 'text-amber-300'
              : isThird
              ? 'text-[#FF8C5A]'
              : 'text-amber-400'
          }`}
        >
          {match.id === 'GF-2' ? 'RESET' : isThird ? '3RD' : ''}
        </div>
      )}

      <PlayerSlotRow
        player={match.p1}
        isBye={match.p1IsBye}
        isWinner={match.effectiveWinner === 1}
        isLoser={match.effectiveWinner === 2}
        canClick={canInteract}
        accent={isLosers ? 'orange' : isFinal ? 'gold' : 'cyan'}
        compact={isCompact}
        height={rowH}
        onClick={() => canInteract && onSelectWinner(match.id, 1)}
      />

      <div className="h-[1px] bg-slate-800/90 w-full shrink-0" />

      <PlayerSlotRow
        player={match.p2}
        isBye={match.p2IsBye}
        isWinner={match.effectiveWinner === 2}
        isLoser={match.effectiveWinner === 1}
        canClick={canInteract}
        accent={isLosers ? 'orange' : isFinal ? 'gold' : 'cyan'}
        compact={isCompact}
        height={rowH}
        onClick={() => canInteract && onSelectWinner(match.id, 2)}
      />
    </div>
  );
};

const PlayerSlotRow: React.FC<{
  player: SlotPlayer | null;
  isBye: boolean;
  isWinner: boolean;
  isLoser: boolean;
  canClick: boolean;
  accent: 'cyan' | 'orange' | 'gold';
  compact: boolean;
  height: number;
  onClick: () => void;
}> = ({
  player,
  isBye,
  isWinner,
  isLoser,
  canClick,
  accent,
  compact,
  height,
  onClick,
}) => {
  const winBg =
    accent === 'orange'
      ? 'bg-[#FF5A1F]/18 text-white'
      : accent === 'gold'
      ? 'bg-amber-400/18 text-amber-50'
      : 'bg-cyan-400/15 text-white';

  const winMarker =
    accent === 'orange'
      ? 'text-[#FF7A48]'
      : accent === 'gold'
      ? 'text-amber-400'
      : 'text-cyan-400';

  return (
    <button
      type="button"
      disabled={!canClick}
      onClick={onClick}
      style={{ height }}
      className={`w-full px-2 flex items-center justify-between gap-1.5 text-left transition-colors duration-150 ${
        isWinner
          ? winBg
          : isLoser
          ? 'text-slate-500 bg-transparent'
          : 'text-slate-200 bg-transparent'
      } ${
        canClick
          ? 'cursor-pointer hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400'
          : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {player ? (
          <>
            <span
              className={`font-mono-num shrink-0 ${
                compact ? 'text-[10px]' : 'text-[11px]'
              } ${isWinner ? winMarker : 'text-slate-500'}`}
            >
              {String(player.seed).padStart(2, '0')}
            </span>
            <span
              className={`truncate font-medium ${
                compact ? 'text-[12px]' : 'text-[13px]'
              } ${isWinner ? 'font-bold text-white' : isLoser ? 'line-through decoration-slate-600' : ''}`}
            >
              {player.name}
            </span>
          </>
        ) : isBye ? (
          <span className="text-[11px] font-mono-num tracking-wider text-slate-600 italic">
            BYE
          </span>
        ) : (
          <span className="text-[11px] text-slate-600">—</span>
        )}
      </div>

      {isWinner && (
        <span
          className={`shrink-0 font-display font-bold tracking-wider ${
            compact ? 'text-[10px]' : 'text-[11px]'
          } ${winMarker}`}
        >
          WIN
        </span>
      )}
    </button>
  );
};

function computeLayout(state: BracketState): {
  cards: PositionedCard[];
  lines: ConnectorLine[];
  roundHeaders: { id: string; x: number; y: number; w: number; label: string }[];
  zoneLabels: { id: string; x: number; y: number; text: string; tone: 'cyan' | 'orange' | 'gold' }[];
} {
  const cards: PositionedCard[] = [];
  const lines: ConnectorLine[] = [];
  const roundHeaders: { id: string; x: number; y: number; w: number; label: string }[] = [];
  const zoneLabels: { id: string; x: number; y: number; text: string; tone: 'cyan' | 'orange' | 'gold' }[] = [];

  const cardMap: Record<string, PositionedCard> = {};
  const matches = state.matches;

  const addCard = (c: PositionedCard) => {
    cards.push(c);
    cardMap[c.match.id] = c;
  };

  if (state.format === 'single') {
    const totalRounds = Math.log2(state.bracketSize);
    const topY = 148;
    const areaH = 724;

    if (state.isSymmetric) {
      // 16 or 32 slots -> symmetric left + right -> center final
      const sideRounds = totalRounds - 1;
      const cols = sideRounds * 2 + 1;
      const marginX = 28;
      const gapX = totalRounds === 5 ? 20 : 32;
      const cardW = Math.floor((LOGICAL_W - marginX * 2 - (cols - 1) * gapX) / cols);
      const cardH = totalRounds === 5 ? 60 : 72;

      const colX = (colIdx: number) => marginX + colIdx * (cardW + gapX);

      // Left rounds
      for (let r = 0; r < sideRounds; r++) {
        const halfCount = (state.bracketSize / Math.pow(2, r + 1)) / 2;
        const x = colX(r);
        const sampleMatch = matches[`S-R${r}-M0`];
        roundHeaders.push({
          id: `lh-${r}`,
          x,
          y: 118,
          w: cardW,
          label: sampleMatch?.roundLabel || `R${r + 1}`,
        });

        for (let m = 0; m < halfCount; m++) {
          const match = matches[`S-R${r}-M${m}`];
          let cy: number;
          if (r === 0) {
            cy = topY + (m + 0.5) * (areaH / halfCount);
          } else {
            const c1 = cardMap[`S-R${r - 1}-M${m * 2}`];
            const c2 = cardMap[`S-R${r - 1}-M${m * 2 + 1}`];
            cy = (c1.cy + c2.cy) / 2;
          }
          addCard({
            match,
            x,
            y: cy - cardH / 2,
            w: cardW,
            h: cardH,
            cx: x + cardW / 2,
            cy,
            direction: 'ltr',
          });
        }
      }

      // Right rounds (mirrored)
      for (let r = 0; r < sideRounds; r++) {
        const halfCount = (state.bracketSize / Math.pow(2, r + 1)) / 2;
        const x = colX(cols - 1 - r);
        const sampleMatch = matches[`S-R${r}-M${halfCount}`];
        roundHeaders.push({
          id: `rh-${r}`,
          x,
          y: 118,
          w: cardW,
          label: sampleMatch?.roundLabel || `R${r + 1}`,
        });

        for (let m = 0; m < halfCount; m++) {
          const globalIdx = halfCount + m;
          const match = matches[`S-R${r}-M${globalIdx}`];
          let cy: number;
          if (r === 0) {
            cy = topY + (m + 0.5) * (areaH / halfCount);
          } else {
            const c1 = cardMap[`S-R${r - 1}-M${halfCount * 2 + m * 2}`];
            const c2 = cardMap[`S-R${r - 1}-M${halfCount * 2 + m * 2 + 1}`];
            cy = (c1.cy + c2.cy) / 2;
          }
          addCard({
            match,
            x,
            y: cy - cardH / 2,
            w: cardW,
            h: cardH,
            cx: x + cardW / 2,
            cy,
            direction: 'rtl',
          });
        }
      }

      // Center Grand Final + optional 3rd Place Match
      const centerColX = colX(sideRounds);
      const finalW = cardW + 12;
      const finalX = centerColX - 6;
      const finalH = 76;
      const finalMatch = matches[`S-R${totalRounds - 1}-M0`];
      const hasThird = Boolean(matches['S-3RD']);
      const finalCy = hasThird ? topY + areaH * 0.42 : topY + areaH * 0.5;

      roundHeaders.push({
        id: 'ch-final',
        x: finalX,
        y: 118,
        w: finalW,
        label: 'GRAND FINAL',
      });

      addCard({
        match: finalMatch,
        x: finalX,
        y: finalCy - finalH / 2,
        w: finalW,
        h: finalH,
        cx: finalX + finalW / 2,
        cy: finalCy,
        direction: 'center',
      });

      if (hasThird) {
        const thirdCy = topY + areaH * 0.78;
        roundHeaders.push({
          id: 'ch-third',
          x: finalX,
          y: thirdCy - finalH / 2 - 24,
          w: finalW,
          label: '3RD PLACE MATCH',
        });
        addCard({
          match: matches['S-3RD'],
          x: finalX,
          y: thirdCy - finalH / 2,
          w: finalW,
          h: finalH,
          cx: finalX + finalW / 2,
          cy: thirdCy,
          direction: 'center',
        });
      }

      // Connectors
      for (const card of cards) {
        const m = card.match;
        if (!m.nextWinTarget) continue;
        const target = cardMap[m.nextWinTarget.matchId];
        if (!target) continue;
        const active = Boolean(m.winnerPlayer);

        if (card.direction === 'ltr') {
          const x1 = card.x + card.w;
          const y1 = card.cy;
          const x2 = target.x;
          const y2 = target.cy;
          const mx = (x1 + x2) / 2;
          lines.push({
            id: `${m.id}->${target.match.id}`,
            d: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`,
            active,
            tone: target.direction === 'center' ? 'gold' : 'cyan',
          });
        } else if (card.direction === 'rtl') {
          const x1 = card.x;
          const y1 = card.cy;
          const x2 = target.x + target.w;
          const y2 = target.cy;
          const mx = (x1 + x2) / 2;
          lines.push({
            id: `${m.id}->${target.match.id}`,
            d: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`,
            active,
            tone: target.direction === 'center' ? 'gold' : 'cyan',
          });
        }
      }

      return { cards, lines, roundHeaders, zoneLabels };
    }

    // Standard Single Elimination (< 16 players: 1, 2, or 3 rounds)
    const marginX = totalRounds === 1 ? 520 : totalRounds === 2 ? 260 : 100;
    const gapX = totalRounds === 2 ? 180 : 120;
    const cardW = Math.min(
      340,
      Math.floor((LOGICAL_W - marginX * 2 - (totalRounds - 1) * gapX) / totalRounds)
    );
    const cardH = totalRounds === 3 ? 78 : 90;

    for (let r = 0; r < totalRounds; r++) {
      const mCount = state.bracketSize / Math.pow(2, r + 1);
      const x = marginX + r * (cardW + gapX);
      const sample = matches[`S-R${r}-M0`];
      roundHeaders.push({
        id: `sh-${r}`,
        x,
        y: 120,
        w: cardW,
        label: sample?.roundLabel || `ROUND ${r + 1}`,
      });

      for (let m = 0; m < mCount; m++) {
        const match = matches[`S-R${r}-M${m}`];
        let cy: number;
        if (r === 0) {
          cy = topY + (m + 0.5) * (areaH / mCount);
        } else {
          const c1 = cardMap[`S-R${r - 1}-M${m * 2}`];
          const c2 = cardMap[`S-R${r - 1}-M${m * 2 + 1}`];
          cy = (c1.cy + c2.cy) / 2;
        }
        addCard({
          match,
          x,
          y: cy - cardH / 2,
          w: cardW,
          h: cardH,
          cx: x + cardW / 2,
          cy,
          direction: 'ltr',
        });
      }
    }

    if (matches['S-3RD']) {
      const finalCard = cardMap[`S-R${totalRounds - 1}-M0`];
      const thirdCy = Math.min(815, finalCard.cy + 210);
      roundHeaders.push({
        id: 'sh-3rd',
        x: finalCard.x,
        y: thirdCy - cardH / 2 - 24,
        w: cardW,
        label: '3RD PLACE MATCH',
      });
      addCard({
        match: matches['S-3RD'],
        x: finalCard.x,
        y: thirdCy - cardH / 2,
        w: cardW,
        h: cardH,
        cx: finalCard.x + cardW / 2,
        cy: thirdCy,
        direction: 'ltr',
      });
    }

    for (const card of cards) {
      const m = card.match;
      if (!m.nextWinTarget) continue;
      const target = cardMap[m.nextWinTarget.matchId];
      if (!target) continue;
      const x1 = card.x + card.w;
      const y1 = card.cy;
      const x2 = target.x;
      const y2 = target.cy;
      const mx = (x1 + x2) / 2;
      lines.push({
        id: `${m.id}->${target.match.id}`,
        d: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`,
        active: Boolean(m.winnerPlayer),
        tone: !target.match.nextWinTarget ? 'gold' : 'cyan',
      });
    }

    return { cards, lines, roundHeaders, zoneLabels };
  }

  // DOUBLE ELIMINATION LAYOUT (2, 4, or 8 bracketSize)
  if (state.bracketSize === 2) {
    const cardW = 320;
    const cardH = 92;
    zoneLabels.push({ id: 'zl-w', x: 180, y: 180, text: 'WINNERS FINAL', tone: 'cyan' });
    zoneLabels.push({ id: 'zl-gf', x: 640, y: 180, text: 'GRAND FINAL', tone: 'gold' });
    zoneLabels.push({ id: 'zl-gfr', x: 1080, y: 180, text: 'BRACKET RESET', tone: 'orange' });

    addCard({
      match: matches['W-R0-M0'],
      x: 180,
      y: 360,
      w: cardW,
      h: cardH,
      cx: 180 + cardW / 2,
      cy: 360 + cardH / 2,
      direction: 'ltr',
    });
    addCard({
      match: matches['GF-1'],
      x: 640,
      y: 360,
      w: cardW,
      h: cardH,
      cx: 640 + cardW / 2,
      cy: 360 + cardH / 2,
      direction: 'ltr',
    });
    addCard({
      match: matches['GF-2'],
      x: 1080,
      y: 360,
      w: cardW,
      h: cardH,
      cx: 1080 + cardW / 2,
      cy: 360 + cardH / 2,
      direction: 'ltr',
    });

    const w0 = cardMap['W-R0-M0'];
    const gf1 = cardMap['GF-1'];
    const gf2 = cardMap['GF-2'];
    lines.push({
      id: 'w0-gf1',
      d: `M ${w0.x + w0.w} ${w0.cy} H ${gf1.x}`,
      active: Boolean(w0.match.winnerPlayer),
      tone: 'cyan',
    });
    lines.push({
      id: 'gf1-gf2',
      d: `M ${gf1.x + gf1.w} ${gf1.cy} H ${gf2.x}`,
      active: !gf2.match.isDisabled,
      tone: 'gold',
    });

    return { cards, lines, roundHeaders, zoneLabels };
  }

  if (state.bracketSize === 4) {
    const cardW = 300;
    const cardH = 78;
    const col0 = 60;
    const col1 = 480;
    const gfX = 960;
    const resetX = 1280;

    zoneLabels.push({ id: 'zl-w', x: 60, y: 124, text: 'WINNERS BRACKET', tone: 'cyan' });
    zoneLabels.push({ id: 'zl-l', x: 60, y: 516, text: 'LOSERS BRACKET', tone: 'orange' });
    zoneLabels.push({ id: 'zl-gf', x: gfX, y: 124, text: 'GRAND FINALS', tone: 'gold' });

    roundHeaders.push({ id: 'wh0', x: col0, y: 148, w: cardW, label: 'WINNERS SF' });
    roundHeaders.push({ id: 'wh1', x: col1, y: 148, w: cardW, label: 'WINNERS FINAL' });
    roundHeaders.push({ id: 'lh0', x: col0, y: 540, w: cardW, label: 'LOSERS R1' });
    roundHeaders.push({ id: 'lh1', x: col1, y: 540, w: cardW, label: 'LOSERS FINAL' });

    addCard({ match: matches['W-R0-M0'], x: col0, y: 196, w: cardW, h: cardH, cx: col0 + cardW / 2, cy: 196 + cardH / 2, direction: 'ltr' });
    addCard({ match: matches['W-R0-M1'], x: col0, y: 344, w: cardW, h: cardH, cx: col0 + cardW / 2, cy: 344 + cardH / 2, direction: 'ltr' });
    addCard({ match: matches['W-R1-M0'], x: col1, y: 270, w: cardW, h: cardH, cx: col1 + cardW / 2, cy: 270 + cardH / 2, direction: 'ltr' });

    addCard({ match: matches['L-R0-M0'], x: col0, y: 650, w: cardW, h: cardH, cx: col0 + cardW / 2, cy: 650 + cardH / 2, direction: 'ltr' });
    addCard({ match: matches['L-R1-M0'], x: col1, y: 650, w: cardW, h: cardH, cx: col1 + cardW / 2, cy: 650 + cardH / 2, direction: 'ltr' });

    roundHeaders.push({ id: 'gfh1', x: gfX, y: 416, w: cardW, label: 'GRAND FINAL' });
    addCard({ match: matches['GF-1'], x: gfX, y: 444, w: cardW, h: cardH + 6, cx: gfX + cardW / 2, cy: 444 + (cardH + 6) / 2, direction: 'ltr' });

    const resetW = 260;
    roundHeaders.push({ id: 'gfh2', x: resetX, y: 416, w: resetW, label: 'GF RESET (IF NEEDED)' });
    addCard({ match: matches['GF-2'], x: resetX, y: 444, w: resetW, h: cardH + 6, cx: resetX + resetW / 2, cy: 444 + (cardH + 6) / 2, direction: 'ltr' });

    const connect = (fromId: string, toId: string, tone: 'cyan' | 'orange' | 'gold', active: boolean) => {
      const f = cardMap[fromId];
      const t = cardMap[toId];
      if (!f || !t) return;
      const x1 = f.x + f.w;
      const y1 = f.cy;
      const x2 = t.x;
      const y2 = t.cy;
      const mx = (x1 + x2) / 2;
      lines.push({ id: `${fromId}->${toId}`, d: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`, active, tone });
    };

    connect('W-R0-M0', 'W-R1-M0', 'cyan', Boolean(matches['W-R0-M0'].winnerPlayer));
    connect('W-R0-M1', 'W-R1-M0', 'cyan', Boolean(matches['W-R0-M1'].winnerPlayer));
    connect('L-R0-M0', 'L-R1-M0', 'orange', Boolean(matches['L-R0-M0'].winnerPlayer));
    connect('W-R1-M0', 'GF-1', 'gold', Boolean(matches['W-R1-M0'].winnerPlayer));
    connect('L-R1-M0', 'GF-1', 'gold', Boolean(matches['L-R1-M0'].winnerPlayer));
    connect('GF-1', 'GF-2', 'gold', !matches['GF-2'].isDisabled);

    return { cards, lines, roundHeaders, zoneLabels };
  }

  // bracketSize === 8 (5 to 8 players)
  const cardW = 248;
  const gapX = 54;
  const colX = (c: number) => 34 + c * (cardW + gapX); // c in 0..3 -> 34..1188

  zoneLabels.push({ id: 'zl-w', x: 34, y: 120, text: 'WINNERS BRACKET', tone: 'cyan' });
  zoneLabels.push({ id: 'zl-l', x: 34, y: 504, text: 'LOSERS BRACKET', tone: 'orange' });
  zoneLabels.push({ id: 'zl-gf', x: 1268, y: 120, text: 'GRAND FINALS', tone: 'gold' });

  // Winners (cols 0, 1.5, 3)
  const wCols = [colX(0), (colX(1) + colX(2)) / 2, colX(3)];
  const wbCardH = 62;
  const wbTop = 166;
  const wbH = 314;

  roundHeaders.push({ id: 'wh0', x: wCols[0], y: 142, w: cardW, label: 'WINNERS QF' });
  roundHeaders.push({ id: 'wh1', x: wCols[1], y: 142, w: cardW, label: 'WINNERS SF' });
  roundHeaders.push({ id: 'wh2', x: wCols[2], y: 142, w: cardW, label: 'WINNERS FINAL' });

  for (let m = 0; m < 4; m++) {
    const cy = wbTop + (m + 0.5) * (wbH / 4);
    addCard({
      match: matches[`W-R0-M${m}`],
      x: wCols[0],
      y: cy - wbCardH / 2,
      w: cardW,
      h: wbCardH,
      cx: wCols[0] + cardW / 2,
      cy,
      direction: 'ltr',
    });
  }
  for (let m = 0; m < 2; m++) {
    const c1 = cardMap[`W-R0-M${m * 2}`];
    const c2 = cardMap[`W-R0-M${m * 2 + 1}`];
    const cy = (c1.cy + c2.cy) / 2;
    addCard({
      match: matches[`W-R1-M${m}`],
      x: wCols[1],
      y: cy - wbCardH / 2,
      w: cardW,
      h: wbCardH,
      cx: wCols[1] + cardW / 2,
      cy,
      direction: 'ltr',
    });
  }
  {
    const c1 = cardMap['W-R1-M0'];
    const c2 = cardMap['W-R1-M1'];
    const cy = (c1.cy + c2.cy) / 2;
    addCard({
      match: matches['W-R2-M0'],
      x: wCols[2],
      y: cy - wbCardH / 2,
      w: cardW,
      h: wbCardH,
      cx: wCols[2] + cardW / 2,
      cy,
      direction: 'ltr',
    });
  }

  // Losers (cols 0, 1, 2, 3)
  const lbCardH = 68;
  const lbTop = 556;
  const lbH = 310;
  roundHeaders.push({ id: 'lh0', x: colX(0), y: 528, w: cardW, label: 'LOSERS R1' });
  roundHeaders.push({ id: 'lh1', x: colX(1), y: 528, w: cardW, label: 'LOSERS QF' });
  roundHeaders.push({ id: 'lh2', x: colX(2), y: 528, w: cardW, label: 'LOSERS SF' });
  roundHeaders.push({ id: 'lh3', x: colX(3), y: 528, w: cardW, label: 'LOSERS FINAL' });

  for (let m = 0; m < 2; m++) {
    const cy = lbTop + (m + 0.5) * (lbH / 2);
    addCard({
      match: matches[`L-R0-M${m}`],
      x: colX(0),
      y: cy - lbCardH / 2,
      w: cardW,
      h: lbCardH,
      cx: colX(0) + cardW / 2,
      cy,
      direction: 'ltr',
    });
    addCard({
      match: matches[`L-R1-M${m}`],
      x: colX(1),
      y: cy - lbCardH / 2,
      w: cardW,
      h: lbCardH,
      cx: colX(1) + cardW / 2,
      cy,
      direction: 'ltr',
    });
  }
  {
    const c1 = cardMap['L-R1-M0'];
    const c2 = cardMap['L-R1-M1'];
    const cy = (c1.cy + c2.cy) / 2;
    addCard({
      match: matches['L-R2-M0'],
      x: colX(2),
      y: cy - lbCardH / 2,
      w: cardW,
      h: lbCardH,
      cx: colX(2) + cardW / 2,
      cy,
      direction: 'ltr',
    });
    addCard({
      match: matches['L-R3-M0'],
      x: colX(3),
      y: cy - lbCardH / 2,
      w: cardW,
      h: lbCardH,
      cx: colX(3) + cardW / 2,
      cy,
      direction: 'ltr',
    });
  }

  // Grand Final & Reset
  const gfX = 1268;
  const gfW = 294;
  const gfH = 82;
  const gf1Cy = 468;
  roundHeaders.push({ id: 'gfh1', x: gfX, y: gf1Cy - gfH / 2 - 24, w: gfW, label: 'GRAND FINAL' });
  addCard({
    match: matches['GF-1'],
    x: gfX,
    y: gf1Cy - gfH / 2,
    w: gfW,
    h: gfH,
    cx: gfX + gfW / 2,
    cy: gf1Cy,
    direction: 'ltr',
  });

  const gf2Cy = 640;
  roundHeaders.push({ id: 'gfh2', x: gfX, y: gf2Cy - gfH / 2 - 24, w: gfW, label: 'GF RESET (IF LB WINS)' });
  addCard({
    match: matches['GF-2'],
    x: gfX,
    y: gf2Cy - gfH / 2,
    w: gfW,
    h: gfH,
    cx: gfX + gfW / 2,
    cy: gf2Cy,
    direction: 'ltr',
  });

  const connect = (fromId: string, toId: string, tone: 'cyan' | 'orange' | 'gold', active: boolean) => {
    const f = cardMap[fromId];
    const t = cardMap[toId];
    if (!f || !t) return;
    const x1 = f.x + f.w;
    const y1 = f.cy;
    const x2 = t.x;
    const y2 = t.cy;
    const mx = (x1 + x2) / 2;
    lines.push({ id: `${fromId}->${toId}`, d: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`, active, tone });
  };

  connect('W-R0-M0', 'W-R1-M0', 'cyan', Boolean(matches['W-R0-M0'].winnerPlayer));
  connect('W-R0-M1', 'W-R1-M0', 'cyan', Boolean(matches['W-R0-M1'].winnerPlayer));
  connect('W-R0-M2', 'W-R1-M1', 'cyan', Boolean(matches['W-R0-M2'].winnerPlayer));
  connect('W-R0-M3', 'W-R1-M1', 'cyan', Boolean(matches['W-R0-M3'].winnerPlayer));
  connect('W-R1-M0', 'W-R2-M0', 'cyan', Boolean(matches['W-R1-M0'].winnerPlayer));
  connect('W-R1-M1', 'W-R2-M0', 'cyan', Boolean(matches['W-R1-M1'].winnerPlayer));

  connect('L-R0-M0', 'L-R1-M0', 'orange', Boolean(matches['L-R0-M0'].winnerPlayer));
  connect('L-R0-M1', 'L-R1-M1', 'orange', Boolean(matches['L-R0-M1'].winnerPlayer));
  connect('L-R1-M0', 'L-R2-M0', 'orange', Boolean(matches['L-R1-M0'].winnerPlayer));
  connect('L-R1-M1', 'L-R2-M0', 'orange', Boolean(matches['L-R1-M1'].winnerPlayer));
  connect('L-R2-M0', 'L-R3-M0', 'orange', Boolean(matches['L-R2-M0'].winnerPlayer));

  connect('W-R2-M0', 'GF-1', 'gold', Boolean(matches['W-R2-M0'].winnerPlayer));
  connect('L-R3-M0', 'GF-1', 'gold', Boolean(matches['L-R3-M0'].winnerPlayer));

  // Vertical connection from GF-1 down to GF-2 if reset is unlocked
  const gf1 = cardMap['GF-1'];
  const gf2 = cardMap['GF-2'];
  lines.push({
    id: 'GF-1->GF-2',
    d: `M ${gf1.cx} ${gf1.y + gf1.h} V ${gf2.y}`,
    active: !gf2.match.isDisabled,
    tone: 'gold',
  });

  return { cards, lines, roundHeaders, zoneLabels };
}
