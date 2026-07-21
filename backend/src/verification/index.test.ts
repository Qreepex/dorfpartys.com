import { describe, expect, it } from "vitest";
import { isOrganizerCurrentlyVerified } from "./index.js";

describe("isOrganizerCurrentlyVerified", () => {
  it("is false for a freetext organizer (no organizerUserId)", () => {
    expect(
      isOrganizerCurrentlyVerified({
        organizerUserId: null,
        organizerConfirmed: true,
        organizerProfileVerifiedAt: new Date(),
      }),
    ).toBe(false);
  });

  it("is false while a foreign-profile nomination is still unconfirmed, even if that profile is verified", () => {
    expect(
      isOrganizerCurrentlyVerified({
        organizerUserId: "user-1",
        organizerConfirmed: false,
        organizerProfileVerifiedAt: new Date(),
      }),
    ).toBe(false);
  });

  it("is false when the confirmed organizer's profile has no verifiedAt", () => {
    expect(
      isOrganizerCurrentlyVerified({
        organizerUserId: "user-1",
        organizerConfirmed: true,
        organizerProfileVerifiedAt: null,
      }),
    ).toBe(false);
  });

  it("is true when the confirmed organizer's profile is currently verified", () => {
    expect(
      isOrganizerCurrentlyVerified({
        organizerUserId: "user-1",
        organizerConfirmed: true,
        organizerProfileVerifiedAt: new Date(),
      }),
    ).toBe(true);
  });

  // Regression: das Event wurde eingereicht, BEVOR sich der Veranstalter
  // verifiziert hat - `event.organizerVerified` (gespeicherte Momentaufnahme)
  // ist `false` und bleibt es, ohne dass sich hier etwas ändert. Der Live-Check
  // muss trotzdem `true` liefern, sobald das Profil nachträglich verifiziert wurde.
  it("reflects verification granted after the event was already submitted", () => {
    expect(
      isOrganizerCurrentlyVerified({
        organizerUserId: "user-1",
        organizerConfirmed: true,
        organizerProfileVerifiedAt: new Date(),
      }),
    ).toBe(true);
  });
});
