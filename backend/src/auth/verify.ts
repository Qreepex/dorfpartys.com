import { jwtVerify } from "jose";
import { getAuthentikJwks } from "./jwks.js";

export interface AuthentikClaims {
  sub: string;
  groups: string[];
}

/**
 * Verifiziert ein von Authentik ausgestelltes JWT zustandslos gegen den
 * JWKS-Endpoint (AGENTS.md Abschnitt 5). Wirft bei ungültiger/abgelaufener
 * Signatur oder falschem Issuer.
 *
 * Der email-Claim wird bewusst nicht ausgelesen/gespeichert - viele extern
 * angebundene Accounts (Google/Discord/Facebook via Authentik-Source) liefern
 * ihn gar nicht, und die App braucht die Adresse nirgends.
 */
export async function verifyAuthentikToken(
  token: string,
): Promise<AuthentikClaims> {
  const issuer = process.env.AUTHENTIK_ISSUER;
  if (!issuer) {
    throw new Error("AUTHENTIK_ISSUER ist nicht gesetzt");
  }

  const { payload } = await jwtVerify(token, getAuthentikJwks(), { issuer });

  if (typeof payload.sub !== "string") {
    throw new Error("JWT ohne gültigen sub-Claim");
  }

  const groups = Array.isArray(payload.groups)
    ? payload.groups.filter((g): g is string => typeof g === "string")
    : [];

  return { sub: payload.sub, groups };
}
