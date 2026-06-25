type Score = {
  home: number;
  away: number;
};

type MatchResult = 'home' | 'draw' | 'away';

function getResult(score: Score): MatchResult {
  if (score.home > score.away) return 'home';
  if (score.home < score.away) return 'away';
  return 'draw';
}

/** Hitung poin sesuai SPEC.md bagian 4 (+3 / +1 / 0). */
export function calculatePoints(predicted: Score, actual: Score): number {
  if (predicted.home === actual.home && predicted.away === actual.away) {
    return 3;
  }

  if (getResult(predicted) === getResult(actual)) {
    return 1;
  }

  return 0;
}
