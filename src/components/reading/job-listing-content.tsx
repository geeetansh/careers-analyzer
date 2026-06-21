"use client";

import { useMemo } from "react";
import { decodeListingHtml } from "@/lib/html/decode-listing-html";
import { cn } from "@/lib/utils";

interface JobListingContentProps {
  html: string;
  className?: string;
}

export function JobListingContent({ html, className }: JobListingContentProps) {
  const displayHtml = useMemo(() => decodeListingHtml(html), [html]);

  if (!displayHtml.trim()) return null;

  return (
    <article
      className={cn(
        "job-listing-content prose prose-neutral dark:prose-invert max-w-none",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
}
