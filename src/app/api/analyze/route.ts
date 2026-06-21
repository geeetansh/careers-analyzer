import { NextResponse } from "next/server";
import { analyzeCareersPage } from "@/lib/scraper/analyzer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { careersPage?: string };
    const careersPage = body.careersPage?.trim();

    if (!careersPage) {
      return NextResponse.json(
        { error: "careersPage is required" },
        { status: 400 },
      );
    }

    new URL(careersPage);
    const result = await analyzeCareersPage(careersPage);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze careers page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
