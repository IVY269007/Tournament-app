export type TournamentFormat = 'single' | 'double';
export type PodiumCount = 1 | 2 | 3;

export interface SlotPlayer {
  seed: number;
  name: string;
}

export interface BracketMatch {
  id: string;
  bracket: 'single' | 'third' | 'winners' | 'losers' | 'grand_final';
  roundIndex: number;
  matchIndex: number;
  roundLabel: string;
  side?: 'left' | 'right' | 'center';
  p1: SlotPlayer | null;
  p2: SlotPlayer | null;
  p1IsBye: boolean;
  p2IsBye: boolean;
  selectedWinner: 1 | 2 | null;
  effectiveWinner: 1 | 2 | null;
  isAutoBye: boolean;
  isDisabled?: boolean;
  winnerPlayer: SlotPlayer | null;
  loserPlayer: SlotPlayer | null;
  nextWinTarget: { matchId: string; slot: 1 | 2 } | null;
  nextLoseTarget: { matchId: string; slot: 1 | 2 } | null;
}

export interface PodiumResult {
  first: SlotPlayer | null;
  second: SlotPlayer | null;
  third: SlotPlayer | null;
}

export interface BracketState {
  format: TournamentFormat;
  bracketSize: number;
  isSymmetric: boolean;
  matches: Record<string, BracketMatch>;
  orderedIds: string[];
  podium: PodiumResult;
}

export function nextPowerOfTwo(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

export function generateSeedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const nextSize = seeds.length * 2;
    const expanded: number[] = [];
    for (const s of seeds) {
      expanded.push(s, nextSize + 1 - s);
    }
    seeds = expanded;
  }
  return seeds;
}

function getSingleRoundLabel(roundIdx: number, totalRounds: number): string {
  const remaining = totalRounds - roundIdx;
  if (remaining === 1) return 'FINAL';
  if (remaining === 2) return 'SEMIFINALS';
  if (remaining === 3) return 'QUARTERFINALS';
  return `ROUND ${roundIdx + 1}`;
}

export function buildAndEvaluateBracket(
  format: TournamentFormat,
  participants: string[],
  podiumCount: PodiumCount,
  results: Record<string, 1 | 2>
): BracketState {
  const maxAllowed = format === 'double' ? 8 : 32;
  const count = Math.max(2, Math.min(maxAllowed, participants.length));
  const cleanPlayers = participants.slice(0, count).map((n, idx) => ({
    seed: idx + 1,
    name: n.trim() || `Player ${idx + 1}`,
  }));

  const bracketSize = nextPowerOfTwo(count);
  const seedOrder = generateSeedOrder(bracketSize);

  const matches: Record<string, BracketMatch> = {};
  const orderedIds: string[] = [];

  const register = (m: BracketMatch) => {
    matches[m.id] = m;
    orderedIds.push(m.id);
  };

  if (format === 'single') {
    const totalRounds = Math.log2(bracketSize);
    const isSymmetric = count >= 16;

    for (let r = 0; r < totalRounds; r++) {
      const matchCount = bracketSize / Math.pow(2, r + 1);
      const label = getSingleRoundLabel(r, totalRounds);
      for (let m = 0; m < matchCount; m++) {
        const id = `S-R${r}-M${m}`;
        let side: 'left' | 'right' | 'center' = 'left';
        if (isSymmetric) {
          if (r === totalRounds - 1) side = 'center';
          else side = m < matchCount / 2 ? 'left' : 'right';
        }

        const nextWinTarget =
          r < totalRounds - 1
            ? { matchId: `S-R${r + 1}-M${Math.floor(m / 2)}`, slot: (m % 2 === 0 ? 1 : 2) as 1 | 2 }
            : null;

        const nextLoseTarget =
          podiumCount === 3 && totalRounds >= 2 && r === totalRounds - 2
            ? { matchId: 'S-3RD', slot: (m === 0 ? 1 : 2) as 1 | 2 }
            : null;

        let p1: SlotPlayer | null = null;
        let p2: SlotPlayer | null = null;
        let p1IsBye = false;
        let p2IsBye = false;

        if (r === 0) {
          const s1 = seedOrder[m * 2];
          const s2 = seedOrder[m * 2 + 1];
          if (s1 <= count) p1 = cleanPlayers[s1 - 1];
          else p1IsBye = true;

          if (s2 <= count) p2 = cleanPlayers[s2 - 1];
          else p2IsBye = true;
        }

        register({
          id,
          bracket: 'single',
          roundIndex: r,
          matchIndex: m,
          roundLabel: label,
          side,
          p1,
          p2,
          p1IsBye,
          p2IsBye,
          selectedWinner: results[id] || null,
          effectiveWinner: null,
          isAutoBye: false,
          winnerPlayer: null,
          loserPlayer: null,
          nextWinTarget,
          nextLoseTarget,
        });
      }
    }

    if (podiumCount === 3 && totalRounds >= 2) {
      register({
        id: 'S-3RD',
        bracket: 'third',
        roundIndex: totalRounds - 1,
        matchIndex: 1,
        roundLabel: '3RD PLACE',
        side: isSymmetric ? 'center' : 'left',
        p1: null,
        p2: null,
        p1IsBye: false,
        p2IsBye: false,
        selectedWinner: results['S-3RD'] || null,
        effectiveWinner: null,
        isAutoBye: false,
        winnerPlayer: null,
        loserPlayer: null,
        nextWinTarget: null,
        nextLoseTarget: null,
      });
    }

    // Topological propagation
    for (const id of orderedIds) {
      resolveMatch(matches[id], matches);
    }

    const finalMatch = matches[`S-R${totalRounds - 1}-M0`];
    const thirdMatch = matches['S-3RD'];

    return {
      format,
      bracketSize,
      isSymmetric,
      matches,
      orderedIds,
      podium: {
        first: finalMatch?.winnerPlayer || null,
        second: finalMatch?.loserPlayer || null,
        third: podiumCount === 3 ? thirdMatch?.winnerPlayer || null : null,
      },
    };
  }

  // DOUBLE ELIMINATION (bracketSize: 2, 4, or 8)
  if (bracketSize === 2) {
    register({
      id: 'W-R0-M0',
      bracket: 'winners',
      roundIndex: 0,
      matchIndex: 0,
      roundLabel: 'WINNERS FINAL',
      p1: cleanPlayers[0],
      p2: cleanPlayers[1],
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['W-R0-M0'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: { matchId: 'GF-1', slot: 1 },
      nextLoseTarget: { matchId: 'GF-1', slot: 2 },
    });

    register({
      id: 'GF-1',
      bracket: 'grand_final',
      roundIndex: 0,
      matchIndex: 0,
      roundLabel: 'GRAND FINAL',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['GF-1'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: null,
      nextLoseTarget: null,
    });

    register({
      id: 'GF-2',
      bracket: 'grand_final',
      roundIndex: 1,
      matchIndex: 0,
      roundLabel: 'BRACKET RESET',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['GF-2'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      isDisabled: true,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: null,
      nextLoseTarget: null,
    });

    resolveMatch(matches['W-R0-M0'], matches);
    resolveMatch(matches['GF-1'], matches);

    const gf1 = matches['GF-1'];
    const gf2 = matches['GF-2'];
    if (gf1.effectiveWinner === 2 && gf1.p1 && gf1.p2) {
      gf2.isDisabled = false;
      gf2.p1 = gf1.p2; // Reset challenger
      gf2.p2 = gf1.p1; // Former WB Champ
      resolveMatch(gf2, matches);
    }

    let first: SlotPlayer | null = null;
    let second: SlotPlayer | null = null;
    if (gf1.effectiveWinner === 1) {
      first = gf1.winnerPlayer;
      second = gf1.loserPlayer;
    } else if (gf1.effectiveWinner === 2 && gf2.effectiveWinner) {
      first = gf2.winnerPlayer;
      second = gf2.loserPlayer;
    }

    return {
      format,
      bracketSize,
      isSymmetric: false,
      matches,
      orderedIds,
      podium: { first, second, third: null },
    };
  }

  if (bracketSize === 4) {
    // WB R0 (SF): 2 matches
    for (let m = 0; m < 2; m++) {
      const s1 = seedOrder[m * 2];
      const s2 = seedOrder[m * 2 + 1];
      register({
        id: `W-R0-M${m}`,
        bracket: 'winners',
        roundIndex: 0,
        matchIndex: m,
        roundLabel: 'WINNERS SF',
        p1: s1 <= count ? cleanPlayers[s1 - 1] : null,
        p2: s2 <= count ? cleanPlayers[s2 - 1] : null,
        p1IsBye: s1 > count,
        p2IsBye: s2 > count,
        selectedWinner: results[`W-R0-M${m}`] || null,
        effectiveWinner: null,
        isAutoBye: false,
        winnerPlayer: null,
        loserPlayer: null,
        nextWinTarget: { matchId: 'W-R1-M0', slot: (m + 1) as 1 | 2 },
        nextLoseTarget: { matchId: 'L-R0-M0', slot: (m + 1) as 1 | 2 },
      });
    }

    // WB R1 (Final)
    register({
      id: 'W-R1-M0',
      bracket: 'winners',
      roundIndex: 1,
      matchIndex: 0,
      roundLabel: 'WINNERS FINAL',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['W-R1-M0'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: { matchId: 'GF-1', slot: 1 },
      nextLoseTarget: { matchId: 'L-R1-M0', slot: 1 },
    });

    // LB R0
    register({
      id: 'L-R0-M0',
      bracket: 'losers',
      roundIndex: 0,
      matchIndex: 0,
      roundLabel: 'LOSERS R1',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['L-R0-M0'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: { matchId: 'L-R1-M0', slot: 2 },
      nextLoseTarget: null,
    });

    // LB R1 (Final)
    register({
      id: 'L-R1-M0',
      bracket: 'losers',
      roundIndex: 1,
      matchIndex: 0,
      roundLabel: 'LOSERS FINAL',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['L-R1-M0'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: { matchId: 'GF-1', slot: 2 },
      nextLoseTarget: null,
    });
  } else {
    // bracketSize === 8 (5 to 8 players)
    // WB R0 (QF): 4 matches
    for (let m = 0; m < 4; m++) {
      const s1 = seedOrder[m * 2];
      const s2 = seedOrder[m * 2 + 1];
      register({
        id: `W-R0-M${m}`,
        bracket: 'winners',
        roundIndex: 0,
        matchIndex: m,
        roundLabel: 'WINNERS QF',
        p1: s1 <= count ? cleanPlayers[s1 - 1] : null,
        p2: s2 <= count ? cleanPlayers[s2 - 1] : null,
        p1IsBye: s1 > count,
        p2IsBye: s2 > count,
        selectedWinner: results[`W-R0-M${m}`] || null,
        effectiveWinner: null,
        isAutoBye: false,
        winnerPlayer: null,
        loserPlayer: null,
        nextWinTarget: { matchId: `W-R1-M${Math.floor(m / 2)}`, slot: (m % 2 === 0 ? 1 : 2) as 1 | 2 },
        nextLoseTarget: { matchId: `L-R0-M${Math.floor(m / 2)}`, slot: (m % 2 === 0 ? 1 : 2) as 1 | 2 },
      });
    }

    // WB R1 (SF): 2 matches (cross drop to L-R1)
    for (let m = 0; m < 2; m++) {
      register({
        id: `W-R1-M${m}`,
        bracket: 'winners',
        roundIndex: 1,
        matchIndex: m,
        roundLabel: 'WINNERS SF',
        p1: null,
        p2: null,
        p1IsBye: false,
        p2IsBye: false,
        selectedWinner: results[`W-R1-M${m}`] || null,
        effectiveWinner: null,
        isAutoBye: false,
        winnerPlayer: null,
        loserPlayer: null,
        nextWinTarget: { matchId: 'W-R2-M0', slot: (m + 1) as 1 | 2 },
        nextLoseTarget: { matchId: `L-R1-M${m === 0 ? 1 : 0}`, slot: 1 },
      });
    }

    // WB R2 (Final)
    register({
      id: 'W-R2-M0',
      bracket: 'winners',
      roundIndex: 2,
      matchIndex: 0,
      roundLabel: 'WINNERS FINAL',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['W-R2-M0'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: { matchId: 'GF-1', slot: 1 },
      nextLoseTarget: { matchId: 'L-R3-M0', slot: 1 },
    });

    // LB R0: 2 matches
    for (let m = 0; m < 2; m++) {
      register({
        id: `L-R0-M${m}`,
        bracket: 'losers',
        roundIndex: 0,
        matchIndex: m,
        roundLabel: 'LOSERS R1',
        p1: null,
        p2: null,
        p1IsBye: false,
        p2IsBye: false,
        selectedWinner: results[`L-R0-M${m}`] || null,
        effectiveWinner: null,
        isAutoBye: false,
        winnerPlayer: null,
        loserPlayer: null,
        nextWinTarget: { matchId: `L-R1-M${m}`, slot: 2 },
        nextLoseTarget: null,
      });
    }

    // LB R1: 2 matches (WB SF losers vs LB R0 winners)
    for (let m = 0; m < 2; m++) {
      register({
        id: `L-R1-M${m}`,
        bracket: 'losers',
        roundIndex: 1,
        matchIndex: m,
        roundLabel: 'LOSERS QF',
        p1: null,
        p2: null,
        p1IsBye: false,
        p2IsBye: false,
        selectedWinner: results[`L-R1-M${m}`] || null,
        effectiveWinner: null,
        isAutoBye: false,
        winnerPlayer: null,
        loserPlayer: null,
        nextWinTarget: { matchId: 'L-R2-M0', slot: (m + 1) as 1 | 2 },
        nextLoseTarget: null,
      });
    }

    // LB R2 (SF): 1 match
    register({
      id: 'L-R2-M0',
      bracket: 'losers',
      roundIndex: 2,
      matchIndex: 0,
      roundLabel: 'LOSERS SF',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['L-R2-M0'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: { matchId: 'L-R3-M0', slot: 2 },
      nextLoseTarget: null,
    });

    // LB R3 (Final): 1 match
    register({
      id: 'L-R3-M0',
      bracket: 'losers',
      roundIndex: 3,
      matchIndex: 0,
      roundLabel: 'LOSERS FINAL',
      p1: null,
      p2: null,
      p1IsBye: false,
      p2IsBye: false,
      selectedWinner: results['L-R3-M0'] || null,
      effectiveWinner: null,
      isAutoBye: false,
      winnerPlayer: null,
      loserPlayer: null,
      nextWinTarget: { matchId: 'GF-1', slot: 2 },
      nextLoseTarget: null,
    });
  }

  // Grand Finals for bracketSize 4 or 8
  register({
    id: 'GF-1',
    bracket: 'grand_final',
    roundIndex: 0,
    matchIndex: 0,
    roundLabel: 'GRAND FINAL',
    p1: null,
    p2: null,
    p1IsBye: false,
    p2IsBye: false,
    selectedWinner: results['GF-1'] || null,
    effectiveWinner: null,
    isAutoBye: false,
    winnerPlayer: null,
    loserPlayer: null,
    nextWinTarget: null,
    nextLoseTarget: null,
  });

  register({
    id: 'GF-2',
    bracket: 'grand_final',
    roundIndex: 1,
    matchIndex: 0,
    roundLabel: 'GF RESET',
    p1: null,
    p2: null,
    p1IsBye: false,
    p2IsBye: false,
    selectedWinner: results['GF-2'] || null,
    effectiveWinner: null,
    isAutoBye: false,
    isDisabled: true,
    winnerPlayer: null,
    loserPlayer: null,
    nextWinTarget: null,
    nextLoseTarget: null,
  });

  // Topological order for DE evaluation:
  // WB rounds in order, then LB rounds in order, then GF-1, GF-2
  const wbOrder = orderedIds.filter((id) => id.startsWith('W-'));
  const lbOrder = orderedIds.filter((id) => id.startsWith('L-'));
  for (const id of [...wbOrder, ...lbOrder]) {
    resolveMatch(matches[id], matches);
  }

  const gf1 = matches['GF-1'];
  const gf2 = matches['GF-2'];
  resolveMatch(gf1, matches);

  if (gf1.effectiveWinner === 2 && gf1.p1 && gf1.p2) {
    gf2.isDisabled = false;
    gf2.p1 = gf1.p1;
    gf2.p2 = gf1.p2;
    resolveMatch(gf2, matches);
  }

  const losersFinalId = bracketSize === 4 ? 'L-R1-M0' : 'L-R3-M0';
  const lf = matches[losersFinalId];

  let first: SlotPlayer | null = null;
  let second: SlotPlayer | null = null;
  if (gf1.effectiveWinner === 1) {
    first = gf1.winnerPlayer;
    second = gf1.loserPlayer;
  } else if (gf1.effectiveWinner === 2 && gf2.effectiveWinner) {
    first = gf2.winnerPlayer;
    second = gf2.loserPlayer;
  }

  return {
    format,
    bracketSize,
    isSymmetric: false,
    matches,
    orderedIds,
    podium: {
      first,
      second,
      third: podiumCount === 3 ? lf?.loserPlayer || null : null,
    },
  };
}

function resolveMatch(m: BracketMatch, all: Record<string, BracketMatch>) {
  // Handle double-BYE
  if (m.p1IsBye && m.p2IsBye) {
    m.isAutoBye = true;
    m.effectiveWinner = null;
    m.winnerPlayer = null;
    m.loserPlayer = null;
    if (m.nextWinTarget) {
      const target = all[m.nextWinTarget.matchId];
      if (target) {
        if (m.nextWinTarget.slot === 1) target.p1IsBye = true;
        else target.p2IsBye = true;
      }
    }
    if (m.nextLoseTarget) {
      const target = all[m.nextLoseTarget.matchId];
      if (target) {
        if (m.nextLoseTarget.slot === 1) target.p1IsBye = true;
        else target.p2IsBye = true;
      }
    }
    return;
  }

  // Handle single-side BYE
  if (m.p1IsBye && !m.p2IsBye) {
    m.isAutoBye = true;
    if (m.p2) {
      m.effectiveWinner = 2;
      m.winnerPlayer = m.p2;
      m.loserPlayer = null;
      if (m.nextWinTarget) {
        const target = all[m.nextWinTarget.matchId];
        if (target) {
          if (m.nextWinTarget.slot === 1) target.p1 = m.p2;
          else target.p2 = m.p2;
        }
      }
    }
    if (m.nextLoseTarget) {
      const target = all[m.nextLoseTarget.matchId];
      if (target) {
        if (m.nextLoseTarget.slot === 1) target.p1IsBye = true;
        else target.p2IsBye = true;
      }
    }
    return;
  }

  if (m.p2IsBye && !m.p1IsBye) {
    m.isAutoBye = true;
    if (m.p1) {
      m.effectiveWinner = 1;
      m.winnerPlayer = m.p1;
      m.loserPlayer = null;
      if (m.nextWinTarget) {
        const target = all[m.nextWinTarget.matchId];
        if (target) {
          if (m.nextWinTarget.slot === 1) target.p1 = m.p1;
          else target.p2 = m.p1;
        }
      }
    }
    if (m.nextLoseTarget) {
      const target = all[m.nextLoseTarget.matchId];
      if (target) {
        if (m.nextLoseTarget.slot === 1) target.p1IsBye = true;
        else target.p2IsBye = true;
      }
    }
    return;
  }

  // Normal match: require both p1 and p2 to declare a valid winner
  if (m.p1 && m.p2 && (m.selectedWinner === 1 || m.selectedWinner === 2)) {
    m.effectiveWinner = m.selectedWinner;
    m.winnerPlayer = m.selectedWinner === 1 ? m.p1 : m.p2;
    m.loserPlayer = m.selectedWinner === 1 ? m.p2 : m.p1;

    if (m.nextWinTarget) {
      const target = all[m.nextWinTarget.matchId];
      if (target) {
        if (m.nextWinTarget.slot === 1) target.p1 = m.winnerPlayer;
        else target.p2 = m.winnerPlayer;
      }
    }
    if (m.nextLoseTarget) {
      const target = all[m.nextLoseTarget.matchId];
      if (target) {
        if (m.nextLoseTarget.slot === 1) target.p1 = m.loserPlayer;
        else target.p2 = m.loserPlayer;
      }
    }
  }
}
