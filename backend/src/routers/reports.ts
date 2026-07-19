import { submitReportSchema } from "@dorfpartys/shared";
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { report, reportRateLimit } from "../db/schema.js";
import {
  sendReportConfirmation,
  sendReportNotification,
} from "../email/service.js";
import { sanitizeText } from "../sanitization/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";

// Rate limiting: 5 reports per IP per hour
const RATE_LIMIT_REPORTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function checkRateLimit(
  db: Database,
  ipAddress: string,
): Promise<{ allowed: boolean; remainingReports: number }> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

    // Get existing rate limit entry
    const [existing] = await db
      .select()
      .from(reportRateLimit)
      .where(
        and(
          eq(reportRateLimit.ipAddress, ipAddress),
          gt(reportRateLimit.resetAt, windowStart),
        ),
      );

    if (!existing) {
      // No entry or expired, create new one
      try {
        await db.insert(reportRateLimit).values({
          ipAddress,
          reportCount: 1,
          resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
        });
      } catch (insertErr: any) {
        // Table might not exist yet - that's okay, skip rate limiting
        if (insertErr?.code !== "42P01") throw insertErr;
      }
      return { allowed: true, remainingReports: RATE_LIMIT_REPORTS - 1 };
    }

    if (existing.reportCount >= RATE_LIMIT_REPORTS) {
      return { allowed: false, remainingReports: 0 };
    }

    // Increment counter
    await db
      .update(reportRateLimit)
      .set({ reportCount: existing.reportCount + 1 })
      .where(eq(reportRateLimit.ipAddress, existing.ipAddress));

    return {
      allowed: true,
      remainingReports: RATE_LIMIT_REPORTS - existing.reportCount - 1,
    };
  } catch (err: any) {
    // If rate_limit table doesn't exist (error code 42P01), skip rate limiting
    if (err?.code === "42P01") {
      console.warn(
        "report_rate_limit table not found - skipping rate limit check. Run: pnpm --filter backend db:migrate",
      );
      return { allowed: true, remainingReports: RATE_LIMIT_REPORTS - 1 };
    }

    // For any other error, fail open and allow the report
    console.error("Rate limit check error:", err);
    return { allowed: true, remainingReports: RATE_LIMIT_REPORTS - 1 };
  }
}

function requiresReporterEmail(type: string): boolean {
  return [
    "dmca",
    "copyright",
    "dsa",
    "netzdk",
    "netsperrer",
    "swisslaw",
  ].includes(type);
}

export const reportsRouter = router({
  submit: publicProcedure
    .input(submitReportSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get IP address from headers
        const forwardedFor = ctx.req.headers["x-forwarded-for"];
        const ipAddress =
          (typeof forwardedFor === "string"
            ? forwardedFor.split(",")[0]
            : null) ||
          ctx.req.ip ||
          "unknown";

        // Check rate limit
        const rateLimit = await checkRateLimit(ctx.db, ipAddress);
        if (!rateLimit.allowed) {
          throw new Error(
            "Rate limit exceeded. You can submit at most 5 reports per hour.",
          );
        }

        // Validate that legal report types have email
        if (requiresReporterEmail(input.type) && !input.reporterEmail) {
          throw new Error(
            `Email address is required for ${input.type.toUpperCase()} reports`,
          );
        }

        // Sanitiere Text-Eingaben vor Ablage
        const sanitizedDescription = sanitizeText(input.description);
        const sanitizedReporterName = input.reporterName ? sanitizeText(input.reporterName) : null;

        // Insert report into database
        const reportId = await ctx.db
          .insert(report)
          .values({
            type: input.type as any,
            subjectType: input.subjectType as any,
            subjectId: input.subjectId ?? null,
            url: input.url,
            description: sanitizedDescription,
            reporterEmail: input.reporterEmail ?? null,
            reporterName: sanitizedReporterName,
            country: input.country ?? null,
            status: "open",
          })
          .returning({ id: report.id });

        const newReportId = reportId[0]?.id;
        if (!newReportId) {
          throw new Error("Failed to create report");
        }

        // Generate ticket number
        const ticketNumber = `RP-${Date.now()}-${newReportId.slice(0, 8).toUpperCase()}`;

        // Send notification to admins
        await sendReportNotification(
          input.type,
          input.reporterEmail,
          input.url,
          input.description,
        );

        // Send confirmation to reporter if required by law
        if (requiresReporterEmail(input.type) && input.reporterEmail) {
          await sendReportConfirmation(
            input.reporterEmail,
            input.type,
            ticketNumber,
          );
        }

        return {
          success: true,
          reportId: newReportId,
          ticketNumber,
          message:
            "Your report has been submitted successfully. Thank you for helping us keep dorfpartys.com safe.",
        };
      } catch (err: any) {
        // Log the actual error server-side for debugging
        console.error("Report submission error:", err);

        // Return generic error to client (never expose SQL or internal errors)
        if (err.message?.includes("Rate limit")) {
          throw err;
        }
        if (err.message?.includes("Email address is required")) {
          throw err;
        }

        // For all other errors, return generic message
        throw new Error("Failed to submit report. Please try again later.");
      }
    }),
});
