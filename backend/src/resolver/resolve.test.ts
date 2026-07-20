import type { EventListItem } from "@dorfpartys/shared";
import { describe, expect, it } from "vitest";
import { resolve } from "./resolve.js";
import type { EventFilterIds, TaxonomyRepository } from "./types.js";

class FakeTaxonomyRepository implements TaxonomyRepository {
  constructor(
    private readonly eventCount = 1,
    private readonly archiveCount = 0,
  ) {}

  async findBundeslandBySlug(_country: string, slug: string) {
    if (slug === "schleswig-holstein") return { id: "bl-sh", slug };
    if (slug === "bayern") return { id: "bl-by", slug };
    return undefined;
  }

  async findKreisBySlug(_country: string, slug: string) {
    if (slug === "ostholstein") {
      return {
        id: "kr-oh",
        slug,
        bundeslandId: "bl-sh",
        bundeslandSlug: "schleswig-holstein",
      };
    }
    return undefined;
  }

  async findPartyArtBySlug(slug: string) {
    if (slug === "schuetzenfeste") return { id: "pa-schuetzen", slug };
    if (slug === "zeltfeten") return { id: "pa-zelt", slug };
    return undefined;
  }

  async countApprovedEvents(_country: string, _filters: EventFilterIds) {
    return this.eventCount;
  }

  async listApprovedEvents(): Promise<EventListItem[]> {
    return [];
  }

  async listApprovedEventsPast12Months(): Promise<EventListItem[]> {
    return [];
  }

  async listKreiseForBundesland(
    _country: string,
    _bundeslandId: string,
    _filters?: EventFilterIds,
  ) {
    return [];
  }

  async listPartyArtenForLocation(_country: string, _filters: EventFilterIds) {
    return [];
  }
}

const repo = new FakeTaxonomyRepository(1, 0);
const emptyRepo = new FakeTaxonomyRepository(0, 0);

describe("resolve - URLs ohne Monat (Phase 2 Refactor)", () => {
  it("bundesland/kreis/art (3 Segmente)", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "ostholstein", "schuetzenfeste"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("bundesland/kreis (2 Segmente)", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "ostholstein"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("bundesland/art (2 Segmente)", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "schuetzenfeste"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("nur bundesland (1 Segment)", async () => {
    const result = await resolve("de", ["schleswig-holstein"], repo);
    expect(result.kind).toBe("result");
  });

  it("nur art (1 Segment)", async () => {
    const result = await resolve("de", ["schuetzenfeste"], repo);
    expect(result.kind).toBe("result");
  });

  it("Land-Root ohne Segmente", async () => {
    const result = await resolve("de", [], repo);
    expect(result.kind).toBe("result");
  });

  it("Monat-Segment ist jetzt 404", async () => {
    const result = await resolve("de", ["august"], repo);
    expect(result.kind).toBe("not-found");
  });

  it("Monat mit anderen Segmenten ist 404", async () => {
    const result = await resolve("de", ["schleswig-holstein", "august"], repo);
    expect(result.kind).toBe("not-found");
  });
});

describe("resolve - Kanonisierung/Redirects (AGENTS.md 1.4 updated)", () => {
  it("Kreis impliziert Bundesland: fehlt es, wird es per 301 ergänzt", async () => {
    const result = await resolve("de", ["ostholstein", "zeltfeten"], repo);
    expect(result).toEqual({
      kind: "redirect",
      location: "/de/schleswig-holstein/ostholstein/zeltfeten/",
      permanent: true,
    });
  });

  it("falsche Segment-Reihenfolge wird zur kanonischen Reihenfolge redirected (ohne Monat)", async () => {
    const result = await resolve(
      "de",
      ["schuetzenfeste", "schleswig-holstein"],
      repo,
    );
    expect(result).toEqual({
      kind: "redirect",
      location: "/de/schleswig-holstein/schuetzenfeste/",
      permanent: true,
    });
  });

  it("explizites Bundesland, das nicht zum Kreis passt, ist 404", async () => {
    const result = await resolve("de", ["bayern", "ostholstein"], repo);
    expect(result).toEqual({ kind: "not-found" });
  });

  it("unbekanntes Segment ist 404", async () => {
    const result = await resolve("de", ["nicht-existent"], repo);
    expect(result).toEqual({ kind: "not-found" });
  });

  it("mehr als 3 Segmente ist 404", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "ostholstein", "schuetzenfeste", "zuviel"],
      repo,
    );
    expect(result).toEqual({ kind: "not-found" });
  });
});

describe("resolve - Indexierungsregeln (Phase 2: Archiv-Integration)", () => {
  it("future Events > 0 -> indexable = true", async () => {
    const result = await resolve("de", ["schuetzenfeste"], repo);
    if (result.kind !== "result") throw new Error("expected result");
    expect(result.indexable).toBe(true);
    expect(result.total).toBe(1);
  });

  it("keine Events (future + archive = 0) -> indexable = false (noindex)", async () => {
    const result = await resolve("de", ["schuetzenfeste"], emptyRepo);
    if (result.kind !== "result") throw new Error("expected result");
    expect(result.indexable).toBe(false);
    expect(result.total).toBe(0);
  });
});
