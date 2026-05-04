import type { PoliticianProfile } from "@/lib/politician/types";

/** In-memory fixtures; `findPoliticianProfile` scores against these rows only. */
export const MOCK_POLITICIANS: PoliticianProfile[] = [
  {
    name: "Alex Harper",
    photoUrl:
      "https://ui-avatars.com/api/?name=Alex+Harper&background=3A5A98&color=F5F7FA",
    party: "Independent",
    role: "U.S. Senator",
    location: "Colorado",
    bio: "Former teacher focused on education investment, wildfire preparedness, and housing affordability.",
    approval: 58,
    yearsInOffice: 9,
    nextElection: "Nov 2028",
    keyPositions: [
      "Expand federal grants for teacher retention in rural districts.",
      "Fund drought and wildfire resilience infrastructure projects.",
      "Support bipartisan zoning incentives for more affordable housing.",
    ],
    recentNews: [
      {
        headline: "Harper unveils bipartisan water security bill",
        source: "National Desk",
        date: "Apr 10, 2026",
      },
      {
        headline: "Town hall highlights student loan repayment proposal",
        source: "State Chronicle",
        date: "Apr 04, 2026",
      },
    ],
  },
  {
    name: "Monica Reyes",
    photoUrl:
      "https://ui-avatars.com/api/?name=Monica+Reyes&background=0B1F3A&color=F5F7FA",
    party: "Democratic",
    role: "Governor",
    location: "New Mexico",
    bio: "Public health attorney emphasizing healthcare access, clean energy jobs, and small business growth.",
    approval: 62,
    yearsInOffice: 5,
    nextElection: "Nov 2026",
    keyPositions: [
      "Increase coverage access through expanded community clinics.",
      "Create workforce pathways tied to clean manufacturing.",
      "Reduce licensing friction for first-time small business owners.",
    ],
    recentNews: [
      {
        headline: "Reyes signs statewide behavioral health package",
        source: "Civic Daily",
        date: "Apr 15, 2026",
      },
      {
        headline: "Administration announces clean-tech apprenticeship grants",
        source: "Public Wire",
        date: "Apr 01, 2026",
      },
    ],
  },
  {
    name: "Daniel Brooks",
    photoUrl:
      "https://ui-avatars.com/api/?name=Daniel+Brooks&background=2A9D8F&color=F5F7FA",
    party: "Republican",
    role: "House Representative",
    location: "Florida 7th District",
    bio: "Former Marine advocating for veterans services, port logistics modernization, and flood mitigation.",
    approval: 49,
    yearsInOffice: 3,
    nextElection: "Nov 2026",
    keyPositions: [
      "Expand local veterans health navigation programs.",
      "Improve supply-chain throughput at regional ports.",
      "Prioritize resilient drainage projects in coastal communities.",
    ],
    recentNews: [
      {
        headline: "Brooks secures committee hearing on veterans claims backlog",
        source: "Capitol Report",
        date: "Apr 11, 2026",
      },
      {
        headline: "District tour focuses on stormwater infrastructure needs",
        source: "Metro Journal",
        date: "Mar 29, 2026",
      },
    ],
  },
];

/**
 * Resolves a query to the best-matching mock profile using exact/prefix/substring/alias checks
 * plus a small Levenshtein distance threshold for typos. Returns null if nothing scores.
 */
export function findPoliticianProfile(query: string): PoliticianProfile | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  const distance = (left: string, right: string) => {
    const rows = left.length + 1;
    const cols = right.length + 1;
    const table = Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: cols }, (_, colIndex) =>
        rowIndex === 0 ? colIndex : colIndex === 0 ? rowIndex : 0,
      ),
    );
    for (let row = 1; row < rows; row += 1) {
      for (let col = 1; col < cols; col += 1) {
        const cost = left[row - 1] === right[col - 1] ? 0 : 1;
        table[row][col] = Math.min(
          table[row - 1][col] + 1,
          table[row][col - 1] + 1,
          table[row - 1][col - 1] + cost,
        );
      }
    }
    return table[rows - 1][cols - 1];
  };

  const ranked = MOCK_POLITICIANS.map((profile) => {
    const name = profile.name.toLowerCase();
    const role = profile.role.toLowerCase();
    const location = profile.location.toLowerCase();
    const alias = `${role} ${location}`;
    let score = -1;

    if (name === normalizedQuery) {
      score = 100;
    } else if (name.startsWith(normalizedQuery)) {
      score = 80;
    } else if (name.includes(normalizedQuery)) {
      score = 60;
    } else if (alias.includes(normalizedQuery)) {
      score = 50;
    } else if (distance(name, normalizedQuery) <= 2) {
      score = 40;
    }

    return { profile, score };
  }).filter((entry) => entry.score >= 0);

  if (ranked.length === 0) {
    return null;
  }

  ranked.sort((left, right) => right.score - left.score);
  return ranked[0].profile;
}
