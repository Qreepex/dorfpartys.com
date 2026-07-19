import { submitReportSchema } from "@dorfpartys/shared";
import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async ({ url }) => {
  const prefilledUrl = url.searchParams.get("url");
  const reportType = url.searchParams.get("type");
  const subjectType = url.searchParams.get("subjectType");

  return {
    prefilledUrl: prefilledUrl || "",
    prefilledType: reportType || "",
    prefilledSubjectType: subjectType || "",
  };
};

export const actions: Actions = {
  submit: async ({ request, locals }) => {
    const formData = await request.formData();

    const input = {
      type: formData.get("type") as string,
      subjectType: formData.get("subjectType") as string,
      subjectId: formData.get("subjectId") || null,
      url: formData.get("url") as string,
      description: formData.get("description") as string,
      country: formData.get("country") as "de" | "at" | "ch",
      reporterEmail: formData.get("reporterEmail") || undefined,
      reporterName: formData.get("reporterName") || undefined,
      copyrightHolder: formData.get("copyrightHolder") || undefined,
      copyrightOwnerName: formData.get("copyrightOwnerName") || undefined,
      illegalContentType: formData.get("illegalContentType") || undefined,
      specificLegalViolation: formData.get("specificLegalViolation") || undefined,
      illegalContentCategory: formData.get("illegalContentCategory") || undefined,
      legalBasis: formData.get("legalBasis") || undefined,
    };

    // Validate input with Zod
    const validation = submitReportSchema.safeParse(input);
    if (!validation.success) {
      const error = validation.error.errors[0];
      return fail(400, {
        error: error?.message || "Validation error",
      });
    }

    try {
      const result = await locals.trpc.reports.submit.mutate(validation.data);
      return {
        success: true,
        ticketNumber: result.ticketNumber,
        message: result.message,
      };
    } catch {
      // Generic error message - never expose internal details to frontend
      return fail(500, {
        error: "Failed to submit report. Please try again later. You can always contact us via email at info@dorfpartys.com.",
      });
    }
  },
};
