export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchWithCompetition = {
  id: string;
  providerMatchId: string;
  competitionId: string;
  roundName: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogoUrl: string | null;
  awayTeamLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute: number | null;
  kickoffTime: Date;
  lastSyncedAt: Date;
  createdAt: Date;
  competitionName: string;
  competitionShortName: string | null;
  competitionLogoUrl: string | null;
  competitionPriorityOrder: number;
};

export type CompetitionMatchGroup = {
  competitionId: string;
  competitionName: string;
  competitionShortName: string | null;
  competitionLogoUrl: string | null;
  priorityOrder: number;
  roundName: string | null;
  hasLiveMatch: boolean;
  matches: MatchWithCompetition[];
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  nickname: string;
  totalPoints: number;
};
