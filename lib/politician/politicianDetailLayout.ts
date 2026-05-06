import type { PoliticianProfile } from "@/lib/politician/types";

export type IndustryContributor = {
  label: string;
  amountLabel: string;
};

export type VotingRecordItem = {
  vote: "yea" | "nay";
  timeAgo: string;
  billTitle: string;
  aiSummary: string;
};

/** Extended fields for the politician detail screen (PolitiTrack-style layout). */
export type PoliticianDetailLayout = {
  districtSubtitle: string;
  committees: string[];
  publicSentiment: {
    value: string;
    deltaLabel: string;
  };
  votingAttendance: {
    value: string;
    progress: number;
    subtext: string;
  };
  impactScore: {
    value: string;
    segmentsFilled: number;
    segmentsTotal: number;
    subtext: string;
  };
  financial: {
    cycleLabel: string;
    totalRaisedLabel: string;
    contributors: IndustryContributor[];
  };
  stockAlert: {
    title: string;
    body: string;
  };
  aiInsights: {
    body: string;
  };
  votingRecord: VotingRecordItem[];
};

function defaultLayout(profile: PoliticianProfile): PoliticianDetailLayout {
  const partyLetter = profile.party === "Republican" ? "R" : profile.party === "Democratic" ? "D" : "I";
  return {
    districtSubtitle: `${profile.location} • ${partyLetter}`,
    committees: profile.keyPositions.slice(0, 3).map((p) =>
      p.length > 42 ? `${p.slice(0, 40)}…` : p,
    ),
    publicSentiment: {
      value: `${profile.approval.toFixed(1)}%`,
      deltaLabel: "+2.1% from last month",
    },
    votingAttendance: {
      value: "94.0%",
      progress: 0.94,
      subtext: "Above chamber average",
    },
    impactScore: {
      value: "72",
      segmentsFilled: 3,
      segmentsTotal: 4,
      subtext: "Legislative Efficiency: Moderate",
    },
    financial: {
      cycleLabel: "2023–2024",
      totalRaisedLabel: "$2,180,400",
      contributors: [
        { label: "Individual donors", amountLabel: "$980K" },
        { label: "PACs", amountLabel: "$620K" },
        { label: "Other", amountLabel: "$580K" },
      ],
    },
    stockAlert: {
      title: "STOCK ACTIVITY ALERT",
      body: `Recent disclosures show trades in sectors tied to ${profile.location} infrastructure priorities. Review timing vs. committee hearings.`,
    },
    aiInsights: {
      body: `${profile.name.split(" ")[0]}’s public remarks emphasize ${profile.keyPositions[0]?.slice(0, 80) ?? "core policy themes"}… with steady engagement on constituent services.`,
    },
    votingRecord: [
      {
        vote: "yea",
        timeAgo: "3 days ago",
        billTitle: "H.R. 2100: Rural Broadband Deployment Act",
        aiSummary:
          "Vote aligns with stated priorities on connectivity and economic development in rural districts.",
      },
      {
        vote: "nay",
        timeAgo: "1 week ago",
        billTitle: "S. 1188: Tariff Adjustment Package",
        aiSummary:
          "Opposition framed around cost impacts on local industries emphasized in recent town halls.",
      },
      {
        vote: "yea",
        timeAgo: "2 weeks ago",
        billTitle: "H.R. 3412: Digital Privacy Act",
        aiSummary:
          "Supports baseline federal standards while urging stronger state-federal coordination.",
      },
    ],
  };
}

const LAYOUT_BY_NAME: Record<string, Partial<PoliticianDetailLayout>> = {
  "Alex Harper": {
    districtSubtitle: "CO • I",
    committees: [
      "Committee on Agriculture",
      "Energy & Natural Resources",
      "Veterans' Affairs",
    ],
    publicSentiment: {
      value: "78.2%",
      deltaLabel: "+4.5% from last month",
    },
    votingAttendance: {
      value: "96.4%",
      progress: 0.964,
      subtext: "Top 10% of Congress",
    },
    impactScore: {
      value: "84",
      segmentsFilled: 3,
      segmentsTotal: 4,
      subtext: "Legislative Efficiency: High",
    },
    financial: {
      cycleLabel: "2023–2024",
      totalRaisedLabel: "$4,285,100",
      contributors: [
        { label: "Technology & Computing", amountLabel: "$1.2M" },
        { label: "Renewable Energy", amountLabel: "$850K" },
        { label: "Education Services", amountLabel: "$420K" },
      ],
    },
    stockAlert: {
      title: "STOCK ACTIVITY ALERT",
      body: "Recent purchases of $NVDA and $AMD disclosed 48 hours before the House Technology hearing. Correlation flagged by ethics watchdogs.",
    },
    aiInsights: {
      body: "Alex Harper is currently trending positively in Colorado districts regarding Climate Tech investments. Recent speeches emphasize transparency in AI procurement and bipartisan cybersecurity funding.",
    },
    votingRecord: [
      {
        vote: "yea",
        timeAgo: "2 days ago",
        billTitle: "H.R. 3412: Digital Privacy Act",
        aiSummary:
          "Voted Yea primarily due to constituent pressure regarding data broker regulations.",
      },
      {
        vote: "nay",
        timeAgo: "5 days ago",
        billTitle: "S. 882: Offshore Drilling Expansion",
        aiSummary:
          "Voted Nay aligning with Colorado wildfire and water conservation platform.",
      },
      {
        vote: "yea",
        timeAgo: "1 week ago",
        billTitle: "H.R. 4500: Veterans Mental Health Funding",
        aiSummary:
          "Strong alignment with veterans’ services priorities and rural clinic access.",
      },
    ],
  },
  "Monica Reyes": {
    districtSubtitle: "NM • D",
    committees: ["Health & Human Services", "Economic Development", "Energy Transition"],
    publicSentiment: {
      value: "81.4%",
      deltaLabel: "+3.2% from last month",
    },
    votingAttendance: {
      value: "98.1%",
      progress: 0.981,
      subtext: "Top 5% among governors (public schedule)",
    },
    impactScore: {
      value: "88",
      segmentsFilled: 4,
      segmentsTotal: 4,
      subtext: "Legislative Efficiency: High",
    },
    financial: {
      cycleLabel: "2023–2024",
      totalRaisedLabel: "$3,920,000",
      contributors: [
        { label: "Healthcare & Hospitals", amountLabel: "$1.1M" },
        { label: "Clean Energy", amountLabel: "$740K" },
        { label: "Education", amountLabel: "$510K" },
      ],
    },
    stockAlert: {
      title: "STOCK ACTIVITY ALERT",
      body: "No federal STOCK Act filings apply at state level; analogous disclosure shows routine index-fund activity only for household accounts.",
    },
    aiInsights: {
      body: "Monica Reyes is emphasizing Medicaid expansion stability and rural clinic grants. Sentiment is strongest in southern counties on behavioral health funding.",
    },
    votingRecord: [
      {
        vote: "yea",
        timeAgo: "4 days ago",
        billTitle: "SB 144: Rural Clinic Infrastructure Grants",
        aiSummary: "Signed to match campaign commitments on primary care access.",
      },
      {
        vote: "yea",
        timeAgo: "1 week ago",
        billTitle: "HB 902: Clean Manufacturing Tax Credit",
        aiSummary: "Supports workforce training clauses added in conference committee.",
      },
      {
        vote: "nay",
        timeAgo: "2 weeks ago",
        billTitle: "SB 210: Liquor License Deregulation",
        aiSummary: "Veto framed around local control and public health oversight.",
      },
    ],
  },
  "Daniel Brooks": {
    districtSubtitle: "FL-07 • R",
    committees: ["Armed Services", "Transportation & Infrastructure", "Veterans' Affairs"],
    publicSentiment: {
      value: "52.8%",
      deltaLabel: "−1.2% from last month",
    },
    votingAttendance: {
      value: "93.2%",
      progress: 0.932,
      subtext: "Near median for freshman House members",
    },
    impactScore: {
      value: "69",
      segmentsFilled: 2,
      segmentsTotal: 4,
      subtext: "Legislative Efficiency: Moderate",
    },
    financial: {
      cycleLabel: "2023–2024",
      totalRaisedLabel: "$1,890,500",
      contributors: [
        { label: "Defense & Aerospace", amountLabel: "$620K" },
        { label: "Maritime & Logistics", amountLabel: "$410K" },
        { label: "Small Business PACs", amountLabel: "$290K" },
      ],
    },
    stockAlert: {
      title: "STOCK ACTIVITY ALERT",
      body: "Disclosure shows sale of port-logistics holdings ahead of committee markup on shipping subsidies.",
    },
    aiInsights: {
      body: "Daniel Brooks is focused on veterans’ claims backlog and coastal flood resilience. Messaging centers on bipartisan port modernization where district jobs are at stake.",
    },
    votingRecord: [
      {
        vote: "yea",
        timeAgo: "1 day ago",
        billTitle: "H.R. 512: Military Housing Repair Fund",
        aiSummary: "Vote consistent with Marine Corps base constituencies in district.",
      },
      {
        vote: "nay",
        timeAgo: "6 days ago",
        billTitle: "H.R. 900: Wetlands Permitting Fast-Track",
        aiSummary: "Opposition cites stormwater and insurance costs for coastal municipalities.",
      },
      {
        vote: "yea",
        timeAgo: "10 days ago",
        billTitle: "H.R. 1201: Harbor Maintenance Trust Fix",
        aiSummary: "Aligns with district port throughput and dredging priorities.",
      },
    ],
  },
};

export function getPoliticianDetailLayout(profile: PoliticianProfile): PoliticianDetailLayout {
  const base = defaultLayout(profile);
  const patch = LAYOUT_BY_NAME[profile.name];
  if (!patch) {
    return base;
  }
  return {
    ...base,
    ...patch,
    publicSentiment: { ...base.publicSentiment, ...patch.publicSentiment },
    votingAttendance: { ...base.votingAttendance, ...patch.votingAttendance },
    impactScore: { ...base.impactScore, ...patch.impactScore },
    financial: {
      ...base.financial,
      ...patch.financial,
      contributors: patch.financial?.contributors ?? base.financial.contributors,
    },
    stockAlert: { ...base.stockAlert, ...patch.stockAlert },
    aiInsights: { ...base.aiInsights, ...patch.aiInsights },
    votingRecord: patch.votingRecord ?? base.votingRecord,
    committees: patch.committees ?? base.committees,
  };
}
