export type VotingType = 'majority' | 'unanimous' | 'custom';
export type VotingStatus = 'draft' | 'open' | 'closed';
export type VotingResult = 'approved' | 'rejected';
export type VoteValue = 'for' | 'against' | 'abstain';

export interface DecisionVotingConfig {
  enabled: boolean;
  type: VotingType;
  customThreshold?: number;
  quorumRequired?: number | string;
  status: VotingStatus;
  openedAt?: unknown;
  closedAt?: unknown;
  result?: VotingResult;
}

export interface VoteTally {
  totalVotes: number;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
}

export interface QuorumResult {
  requiredCount: number;
  achieved: boolean;
}

export function tallyVotes(votes: Array<{ vote: VoteValue }>): VoteTally {
  return votes.reduce(
    (acc, current) => {
      acc.totalVotes += 1;
      if (current.vote === 'for') acc.votesFor += 1;
      if (current.vote === 'against') acc.votesAgainst += 1;
      if (current.vote === 'abstain') acc.abstentions += 1;
      return acc;
    },
    { totalVotes: 0, votesFor: 0, votesAgainst: 0, abstentions: 0 }
  );
}

export function resolveQuorum(
  quorumRequired: number | string | undefined,
  eligibleVoterCount: number,
  totalVotes: number
): QuorumResult {
  if (!quorumRequired || eligibleVoterCount <= 0) {
    return { requiredCount: 0, achieved: true };
  }

  let requiredCount = 0;
  if (typeof quorumRequired === 'string' && quorumRequired.trim().endsWith('%')) {
    const percentage = Number.parseFloat(quorumRequired.replace('%', ''));
    requiredCount = Math.ceil((eligibleVoterCount * percentage) / 100);
  } else if (typeof quorumRequired === 'number' && quorumRequired > 0 && quorumRequired <= 1) {
    requiredCount = Math.ceil(eligibleVoterCount * quorumRequired);
  } else {
    requiredCount = Math.ceil(Number(quorumRequired));
  }

  return {
    requiredCount,
    achieved: totalVotes >= requiredCount,
  };
}

export function computeVotingResult(
  type: VotingType,
  tally: VoteTally,
  customThreshold?: number
): VotingResult {
  const effectiveVotes = tally.votesFor + tally.votesAgainst;

  if (effectiveVotes === 0) {
    return 'rejected';
  }

  if (type === 'unanimous') {
    return tally.votesAgainst === 0 && tally.votesFor > 0 ? 'approved' : 'rejected';
  }

  if (type === 'custom') {
    const threshold = customThreshold ?? 50;
    const percentageFor = (tally.votesFor / effectiveVotes) * 100;
    return percentageFor >= threshold ? 'approved' : 'rejected';
  }

  return tally.votesFor > tally.votesAgainst ? 'approved' : 'rejected';
}
