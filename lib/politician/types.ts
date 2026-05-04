/** Single headline row under “Recent Headlines”. */
export type NewsItem = {
  headline: string;
  source: string;
  date: string;
};

/** One searchable politician record returned by `findPoliticianProfile`. */
export type PoliticianProfile = {
  name: string;
  photoUrl: string;
  party: string;
  role: string;
  location: string;
  bio: string;
  approval: number;
  yearsInOffice: number;
  nextElection: string;
  keyPositions: string[];
  recentNews: NewsItem[];
};
