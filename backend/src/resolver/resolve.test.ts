import { describe, expect, it } from "vitest";
import type { EventListItem } from "@dorfpartys/shared";
import { resolve } from "./resolve.js";
import type { EventFilterIds, TaxonomyRepository } from "./types.js";

// Fixture spiegelt die Beispiel-URLs aus AGENTS.md 1.2 wider.
class FakeTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly eventCount = 1) {}

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
}

const repo = new FakeTaxonomyRepository(1);
const emptyRepo = new FakeTaxonomyRepository(0);

describe("resolve — kanonische URLs aus AGENTS.md 1.2 (kein Redirect)", () => {
  it("bundesland/kreis/art/monat", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "ostholstein", "schuetzenfeste", "august"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("bundesland/kreis/art", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "ostholstein", "schuetzenfeste"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("bundesland/kreis/monat", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "ostholstein", "august"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("bundesland/kreis", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "ostholstein"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("bundesland/monat", async () => {
    const result = await resolve("de", ["schleswig-holstein", "august"], repo);
    expect(result.kind).toBe("result");
  });

  it("bundesland/art", async () => {
    const result = await resolve(
      "de",
      ["schleswig-holstein", "schuetzenfeste"],
      repo,
    );
    expect(result.kind).toBe("result");
  });

  it("art", async () => {
    const result = await resolve("de", ["schuetzenfeste"], repo);
    expect(result.kind).toBe("result");
  });

  it("monat", async () => {
    const result = await resolve("de", ["august"], repo);
    expect(result.kind).toBe("result");
  });

  it("Land-Root ohne Segmente", async () => {
    const result = await resolve("de", [], repo);
    expect(result.kind).toBe("result");
  });
});

describe("resolve — Kanonisierung/Redirects (AGENTS.md 1.4)", () => {
  it("Kreis impliziert Bundesland: fehlt es, wird es per 301 ergänzt", async () => {
    const result = await resolve("de", ["ostholstein", "zeltfeten"], repo);
    expect(result).toEqual({
      kind: "redirect",
      location: "/de/schleswig-holstein/ostholstein/zeltfeten/",
      permanent: true,
    });
  });

  it("falsche Segment-Reihenfolge wird zur kanonischen Reihenfolge redirected", async () => {
    const result = await resolve("de", ["august", "schleswig-holstein"], repo);
    expect(result).toEqual({
      kind: "redirect",
      location: "/de/schleswig-holstein/august/",
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

  it("mehr als 4 Segmente ist 404", async () => {
    const result = await resolve(
      "de",
      [
        "schleswig-holstein",
        "ostholstein",
        "schuetzenfeste",
        "august",
        "zuviel",
      ],
      repo,
    );
    expect(result).toEqual({ kind: "not-found" });
  });
});

describe("resolve — Indexierungsregeln (bewusste Abweichung von AGENTS.md 1.6, siehe TODO.md)", () => {
  it("Treffer > 0 -> indexable", async () => {
    const result = await resolve("de", ["schuetzenfeste"], repo);
    if (result.kind !== "result") throw new Error("expected result");
    expect(result.indexable).toBe(true);
    expect(result.total).toBe(1);
  });

  it("keine Treffer, aber gültige Kombination -> trotzdem indexable (Ranking-Aufbau für künftige Events)", async () => {
    const result = await resolve("de", ["schuetzenfeste"], emptyRepo);
    if (result.kind !== "result") throw new Error("expected result");
    expect(result.indexable).toBe(true);
    expect(result.total).toBe(0);
  });
});
