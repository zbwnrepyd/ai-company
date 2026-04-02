import { getStartupDetailBySlug, upsertStartupDetail } from "../../../../lib/db/details-repo";
import { migrate } from "../../../../lib/db/migrate";
import { buildStartupCard } from "../../../../lib/startups/get-startup-card";
import { createTrustMrrClient } from "../../../../lib/trustmrr/client";

type StartupRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(
  _request: Request,
  context: StartupRouteContext,
) {
  migrate();

  const { slug } = await context.params;
  let detail = getStartupDetailBySlug(slug);

  if (!detail) {
    try {
      const remoteDetail = await createTrustMrrClient().getStartup(slug);
      upsertStartupDetail(remoteDetail);
      detail = getStartupDetailBySlug(slug);
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Failed to fetch startup detail",
        },
        { status: 502 },
      );
    }
  }

  if (!detail) {
    return Response.json({ error: "Startup detail not found" }, { status: 404 });
  }

  return Response.json(
    buildStartupCard({
      slug,
      description: detail.description,
      targetAudience: detail.targetAudience,
      onSale: detail.onSale,
      askingPrice: detail.askingPrice,
      techStack: detail.techStack,
    }),
  );
}
