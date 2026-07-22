import { config } from "dotenv";
import { eq, and, ne } from "drizzle-orm";
import postgres_client from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema.js";
import {
  extractInstagramHandle,
  extractTiktokHandle,
} from "../verification/index.js";

config({ path: ".env" });

const postgresClient = postgres_client(process.env.DATABASE_URL || "");
const db = drizzle(postgresClient, { schema });

const verificationMethods = ["email", "instagram", "tiktok"] as const;

async function verifyUser(
  userId: string,
  method: (typeof verificationMethods)[number],
) {
  // Lade User + Profil
  let userRow, profileRow;
  [userRow] = await db.select().from(schema.user).where(eq(schema.user.id, userId));

  if (!userRow) {
    console.error(`User not found: ${userId}`);
    process.exit(1);
  }

  [profileRow] = await db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userRow.id));

  if (!profileRow) {
    console.error(`User profile not found for user: ${userRow.id}`);
    process.exit(1);
  }

  console.log(`Verifying user: ${profileRow.displayName} (${userRow.id})`);
  console.log(`Method: ${method}`);

  // Für Instagram/TikTok: extrahiere den Handle aus der URL
  let handleToVerify: string | null = null;
  if (method === "instagram") {
    handleToVerify = profileRow.instagramUrl
      ? extractInstagramHandle(profileRow.instagramUrl)
      : null;
    if (!handleToVerify) {
      console.error("No Instagram URL found or invalid format");
      process.exit(1);
    }
  } else if (method === "tiktok") {
    handleToVerify = profileRow.tiktokUrl
      ? extractTiktokHandle(profileRow.tiktokUrl)
      : null;
    if (!handleToVerify) {
      console.error("No TikTok URL found or invalid format");
      process.exit(1);
    }
  }

  // Konflikt-Bereinigung: entferne verifizierten Status bei anderen Usern
  // mit denselben Handle
  if (method === "instagram" && handleToVerify) {
    const conflictUsers = await db
      .select()
      .from(schema.userProfile)
      .where(
        and(
          eq(schema.userProfile.verifiedInstagramHandle, handleToVerify),
          ne(schema.userProfile.userId, userRow.id),
        ),
      );

    for (const conflictUser of conflictUsers) {
      console.log(
        `  - Clearing verified_at for user ${conflictUser.userId} (had same Instagram handle)`,
      );
      await db
        .update(schema.userProfile)
        .set({
          verifiedAt: null,
          verificationMethod: null,
          verifiedInstagramHandle: null,
        })
        .where(eq(schema.userProfile.userId, conflictUser.userId));
    }
  } else if (method === "tiktok" && handleToVerify) {
    const conflictUsers = await db
      .select()
      .from(schema.userProfile)
      .where(
        and(
          eq(schema.userProfile.verifiedTiktokHandle, handleToVerify),
          ne(schema.userProfile.userId, userRow.id),
        ),
      );

    for (const conflictUser of conflictUsers) {
      console.log(
        `  - Clearing verified_at for user ${conflictUser.userId} (had same TikTok handle)`,
      );
      await db
        .update(schema.userProfile)
        .set({
          verifiedAt: null,
          verificationMethod: null,
          verifiedTiktokHandle: null,
        })
        .where(eq(schema.userProfile.userId, conflictUser.userId));
    }
  }

  // Setze den User als verifiziert
  const updateData: Record<string, any> = {
    verifiedAt: new Date(),
    verificationMethod: method,
    verificationCode: null,
    updatedAt: new Date(),
  };

  if (method === "instagram" && handleToVerify) {
    updateData.verifiedInstagramHandle = handleToVerify;
  } else if (method === "tiktok" && handleToVerify) {
    updateData.verifiedTiktokHandle = handleToVerify;
  }

  await db
    .update(schema.userProfile)
    .set(updateData)
    .where(eq(schema.userProfile.userId, userRow.id));

  console.log(`✓ User ${profileRow.displayName} verified via ${method}`);
  if (handleToVerify) {
    console.log(`  Handle: @${handleToVerify}`);
  }

  process.exit(0);
}

// Parse CLI args
const [userId, method] = process.argv.slice(2);

if (!userId || !method) {
  console.error("Usage: verify-user <user-id> <email|instagram|tiktok>");
  process.exit(1);
}

if (!verificationMethods.includes(method as any)) {
  console.error(
    `Invalid method: ${method}. Must be one of: ${verificationMethods.join(", ")}`,
  );
  process.exit(1);
}

verifyUser(userId, method as (typeof verificationMethods)[number]).catch(
  (err) => {
    console.error("Error during verification:", err);
    process.exit(1);
  },
);
