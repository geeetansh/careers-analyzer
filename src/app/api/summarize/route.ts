import { NextResponse } from "next/server";
import { summarizeJobListing } from "@/lib/ai/summarize-job";

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is not configured. Add it to .env.local to enable AI summaries.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      title?: string;
      companyName?: string;
      location?: string;
      department?: string;
      listingText?: string;
    };

    const { title, companyName, location, department, listingText } = body;

    if (!title || !listingText?.trim()) {
      return NextResponse.json(
        { error: "title and listingText are required" },
        { status: 400 },
      );
    }

    const summary = await summarizeJobListing({
      title,
      companyName,
      location,
      department,
      listingText,
    });

    return NextResponse.json({
      ...summary,
      summarizedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to summarize listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
