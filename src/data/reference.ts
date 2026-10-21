// Static reference data used by the mock data generator. Suburbs and postcodes are real
// places; every organiser, phone number, website and email built from them is fake.

import type { AustralianState, Campaign, OrganiserType, Product, Source, SourceId } from "@/lib/types";

export const STATES: AustralianState[] = ["NSW", "VIC", "QLD", "WA", "SA"];

export const ORGANISER_TYPES: OrganiserType[] = [
  "venue",
  "event_business",
  "school",
  "sports_club",
  "community_group",
];

export const SUBURBS: Record<AustralianState, { suburb: string; postcode: string }[]> = {
  NSW: [
    { suburb: "Parramatta", postcode: "2150" },
    { suburb: "Newtown", postcode: "2042" },
    { suburb: "Manly", postcode: "2095" },
    { suburb: "Penrith", postcode: "2750" },
    { suburb: "Bondi", postcode: "2026" },
    { suburb: "Chatswood", postcode: "2067" },
    { suburb: "Wollongong", postcode: "2500" },
    { suburb: "Newcastle", postcode: "2300" },
    { suburb: "Liverpool", postcode: "2170" },
    { suburb: "Hornsby", postcode: "2077" },
  ],
  VIC: [
    { suburb: "Richmond", postcode: "3121" },
    { suburb: "Fitzroy", postcode: "3065" },
    { suburb: "Geelong", postcode: "3220" },
    { suburb: "Ballarat", postcode: "3350" },
    { suburb: "St Kilda", postcode: "3182" },
    { suburb: "Footscray", postcode: "3011" },
    { suburb: "Box Hill", postcode: "3128" },
    { suburb: "Frankston", postcode: "3199" },
    { suburb: "Bendigo", postcode: "3550" },
    { suburb: "Brunswick", postcode: "3056" },
  ],
  QLD: [
    { suburb: "Fortitude Valley", postcode: "4006" },
    { suburb: "Southport", postcode: "4215" },
    { suburb: "Toowoomba", postcode: "4350" },
    { suburb: "Cairns", postcode: "4870" },
    { suburb: "Townsville", postcode: "4810" },
    { suburb: "Paddington", postcode: "4064" },
    { suburb: "Ipswich", postcode: "4305" },
    { suburb: "Maroochydore", postcode: "4558" },
  ],
  WA: [
    { suburb: "Fremantle", postcode: "6160" },
    { suburb: "Subiaco", postcode: "6008" },
    { suburb: "Joondalup", postcode: "6027" },
    { suburb: "Bunbury", postcode: "6230" },
    { suburb: "Midland", postcode: "6056" },
    { suburb: "Scarborough", postcode: "6019" },
  ],
  SA: [
    { suburb: "Glenelg", postcode: "5045" },
    { suburb: "Norwood", postcode: "5067" },
    { suburb: "Prospect", postcode: "5082" },
    { suburb: "Mount Barker", postcode: "5251" },
    { suburb: "Port Adelaide", postcode: "5015" },
    { suburb: "Unley", postcode: "5061" },
  ],
};

export const AREA_CODE: Record<AustralianState, string> = {
  NSW: "02",
  VIC: "03",
  QLD: "07",
  WA: "08",
  SA: "08",
};

export const STREETS = [
  "Smith",
  "Church",
  "High",
  "Station",
  "King",
  "Queen",
  "Victoria",
  "Albert",
  "George",
  "Railway",
  "Park",
  "Main",
  "Bridge",
  "Hope",
];

export const STREET_TYPES: [string, string][] = [
  ["St", "Street"],
  ["Rd", "Road"],
  ["Ave", "Avenue"],
  ["Pde", "Parade"],
];

export const FIRST_NAMES = [
  "Olivia", "Jack", "Charlotte", "Liam", "Mia", "Noah", "Amelia", "Lucas", "Isla", "Henry",
  "Grace", "Oscar", "Zoe", "Leo", "Ruby", "Hamish", "Priya", "Tom", "Mei", "Sam",
  "Aisha", "Ben", "Chloe", "Dylan", "Ella", "Finn", "Hannah", "Kai", "Lily", "Nathan",
];

export const LAST_NAMES = [
  "Nguyen", "Smith", "Williams", "Brown", "Wilson", "Taylor", "Patel", "Anderson", "Thompson", "Walker",
  "White", "Martin", "Kelly", "Ryan", "Chen", "Murphy", "Campbell", "Singh", "Mitchell", "Harris",
];

export const SOURCES: Source[] = [
  {
    id: "venue-directory",
    name: "Venue Directory (mock)",
    description: "Public directory of function venues, halls and event spaces.",
    enabled: true,
    consentBasis: "Conspicuously published business address",
    expectedPerRun: 180,
  },
  {
    id: "sports-clubs",
    name: "Sports Club Listings (mock)",
    description: "State sporting association club finder pages.",
    enabled: true,
    consentBasis: "Conspicuously published business address",
    expectedPerRun: 220,
  },
  {
    id: "school-events",
    name: "School Events Pages (mock)",
    description: "School newsletters and events calendars that list fetes, carnivals and concerts.",
    enabled: true,
    consentBasis: "Inferred consent (published for enquiries)",
    expectedPerRun: 240,
  },
];

export const SOURCE_HOST: Record<SourceId, string> = {
  "venue-directory": "venue-directory.example.test",
  "sports-clubs": "sports-club-listings.example.test",
  "school-events": "school-events.example.test",
};

/** Which sources plausibly list each organiser type. The first is the most likely. */
export const SOURCE_POOL: Record<OrganiserType, SourceId[]> = {
  venue: ["venue-directory", "school-events"],
  event_business: ["venue-directory", "school-events"],
  school: ["school-events", "venue-directory", "sports-clubs"],
  sports_club: ["sports-clubs", "venue-directory", "school-events"],
  community_group: ["venue-directory", "sports-clubs", "school-events"],
};

export const CAMPAIGNS: Campaign[] = [
  { id: "cmp_sports", name: "Q4 Ticketing for Sports Clubs", instantlyId: "inst-mock-7f3a21", dailySendLimit: 60 },
  { id: "cmp_venues", name: "Q4 Ticketing for Venues and Events", instantlyId: "inst-mock-2c9e04", dailySendLimit: 80 },
];

export const PRODUCTS: Product[] = [
  {
    id: "prd_sports",
    name: "Ticketing - Sports Clubs",
    audienceTypes: ["sports_club", "school"],
    campaignId: "cmp_sports",
  },
  {
    id: "prd_venues",
    name: "Ticketing - Venues",
    audienceTypes: ["venue", "event_business", "community_group"],
    campaignId: "cmp_venues",
  },
];
