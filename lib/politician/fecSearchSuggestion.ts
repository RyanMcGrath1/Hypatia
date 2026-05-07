import type { FecCandidateResult } from '@/hooks/api/fecCandidatesApi';

/** One row in the politician search dropdown (FEC-backed). */
export type PoliticianSearchSuggestion = {
  id: string;
  name: string;
  subtitle: string;
};

export function mapFecCandidateToSuggestion(
  row: FecCandidateResult,
  index: number,
): PoliticianSearchSuggestion | null {
  const name = (row.name ?? '').trim();
  if (!name) {
    return null;
  }
  const id =
    row.candidate_id && row.candidate_id.trim() !== ''
      ? row.candidate_id
      : `fec-${index}-${name}`;
  const office = row.office_full ?? row.office ?? '';
  const district = row.district ? ` ${row.district}` : '';
  const subtitleParts = [
    row.party?.trim() || null,
    office ? `${office}${district}`.trim() : null,
    row.state?.trim() || null,
  ].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'FEC candidate';
  return { id, name, subtitle };
}

export function mapFecCandidatesToSuggestions(
  results: FecCandidateResult[] | undefined,
): PoliticianSearchSuggestion[] {
  if (!Array.isArray(results)) {
    return [];
  }
  const out: PoliticianSearchSuggestion[] = [];
  results.forEach((row, i) => {
    const s = mapFecCandidateToSuggestion(row, i);
    if (s) {
      out.push(s);
    }
  });
  return out.slice(0, 20);
}
