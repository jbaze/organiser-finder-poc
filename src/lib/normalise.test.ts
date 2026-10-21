import { describe, expect, it } from "vitest";
import {
  classifyMatch,
  groupDuplicates,
  matchScore,
  normaliseAddress,
  normaliseDomain,
  normaliseName,
  normalisePhone,
  similarity,
} from "./normalise";

describe("normaliseName", () => {
  it("expands club abbreviations and drops legal noise", () => {
    expect(normaliseName("Richmond FC")).toBe("richmond football club");
    expect(normaliseName("The Richmond Football Club Inc.")).toBe("richmond football club");
  });

  it("handles punctuation, ampersands and case", () => {
    expect(normaliseName("GEELONG ARTS & CRAFTS SOCIETY INCORPORATED")).toBe("geelong arts and crafts society");
    expect(normaliseName("St Mary's College")).toBe("saint mary s college");
  });
});

describe("normalisePhone", () => {
  it("treats landline formats as the same number", () => {
    expect(normalisePhone("(03) 9421 5521")).toBe("0394215521");
    expect(normalisePhone("+61 3 9421 5521")).toBe("0394215521");
    expect(normalisePhone("03 9421 5521")).toBe("0394215521");
  });

  it("handles mobiles in international format", () => {
    expect(normalisePhone("+61 412 345 678")).toBe("0412345678");
  });
});

describe("normaliseDomain", () => {
  it("strips protocol, www and path", () => {
    expect(normaliseDomain("https://www.example-club.test/contact")).toBe("example-club.test");
    expect(normaliseDomain("http://example-club.test")).toBe("example-club.test");
  });
});

describe("normaliseAddress", () => {
  it("expands street type abbreviations", () => {
    expect(normaliseAddress("12 Smith St")).toBe(normaliseAddress("12 Smith Street"));
  });
});

describe("similarity", () => {
  it("is 1 for identical strings and lower for different ones", () => {
    expect(similarity("richmond", "richmond")).toBe(1);
    expect(similarity("richmond", "fitzroy")).toBeLessThan(0.3);
  });
});

describe("matchScore and classifyMatch", () => {
  const richmond = {
    name: "Richmond FC",
    phone: "(03) 9421 5521",
    website: "https://www.example-richmond-fc.test",
    address: "12 Punt Rd",
    postcode: "3121",
  };

  it("auto-merges the same club listed under two names", () => {
    const other = { ...richmond, name: "Richmond Football Club Inc", phone: "+61 3 9421 5521", address: "12 Punt Road" };
    const { score, reasons } = matchScore(richmond, other);
    expect(classifyMatch(score)).toBe("auto_merge");
    expect(reasons).toContain("Same phone number");
    expect(reasons).toContain("Same website domain");
  });

  it("sends same-name, different-website records to review", () => {
    const other = { ...richmond, name: "Richmond Football Club", website: "https://example-richmond-footy.test" };
    expect(classifyMatch(matchScore(richmond, other).score)).toBe("review");
  });

  it("keeps clearly different organisers apart", () => {
    const other = {
      name: "Bondi Surf Lifesaving Club",
      phone: "(02) 9300 1111",
      website: "https://example-bondi-surf.test",
      address: "1 Beach Rd",
      postcode: "2026",
    };
    expect(classifyMatch(matchScore(richmond, other).score)).toBe("distinct");
  });
});

describe("groupDuplicates", () => {
  it("groups records that refer to the same organiser", () => {
    const records = [
      { name: "Richmond FC", phone: "(03) 9421 5521", website: "example-richmond.test", address: "12 Punt Rd", postcode: "3121" },
      { name: "Fitzroy Netball Club", phone: "(03) 9000 1234", website: "example-fitzroy.test", address: "4 Brunswick St", postcode: "3065" },
      { name: "Richmond Football Club Inc", phone: "03 9421 5521", website: "https://www.example-richmond.test", address: "12 Punt Road", postcode: "3121" },
    ];
    const groups = groupDuplicates(records).map((g) => g.sort());
    expect(groups).toHaveLength(2);
    expect(groups).toContainEqual([0, 2]);
    expect(groups).toContainEqual([1]);
  });
});
