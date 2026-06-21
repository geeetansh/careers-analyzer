import { NextResponse } from "next/server";
import { fetchJobDetail } from "@/lib/scraper/analyzer";
import {
  listingHtmlToPlainText,
  sanitizeListingHtml,
} from "@/lib/html/sanitize-listing";
import type { CareersProvider } from "@/lib/types/company";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: CareersProvider;
      boardSlug?: string;
      jobId?: string;
      url?: string;
    };

    const { provider, boardSlug, jobId, url } = body;

    if (!provider || !jobId || !url) {
      return NextResponse.json(
        { error: "provider, jobId, and url are required" },
        { status: 400 },
      );
    }

    const detail = await fetchJobDetail({
      provider,
      boardSlug,
      jobId,
      url,
    });

    const contentHtml = sanitizeListingHtml(detail.contentHtml);

    return NextResponse.json({
      ...detail,
      contentHtml,
      contentText: listingHtmlToPlainText(contentHtml) || detail.contentText,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch job detail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
