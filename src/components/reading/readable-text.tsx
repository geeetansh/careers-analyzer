import { chunkListItems } from "@/lib/reading/chunk-text";
import { cn } from "@/lib/utils";

interface ReadableTextProps {
  text: string;
  as?: "paragraphs" | "list";
  className?: string;
}

export function ReadableText({
  text,
  as = "paragraphs",
  className,
}: ReadableTextProps) {
  const chunks = chunkListItems(text);

  if (as === "list") {
    return (
      <ul className={cn("readable-chunks space-y-5", className)}>
        {chunks.map((chunk, index) => (
          <li
            key={index}
            className="readable-chunk flex gap-4 rounded-2xl border border-border/80 bg-white px-5 py-5 dark:bg-card"
          >
            <span
              aria-hidden
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
            >
              {index + 1}
            </span>
            <span className="text-[1.375rem] leading-[1.85] text-foreground">
              {chunk}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn("readable-chunks space-y-6", className)}>
      {chunks.map((chunk, index) => (
        <p
          key={index}
          className="readable-chunk text-[1.375rem] leading-[1.9] text-foreground"
        >
          {chunk}
        </p>
      ))}
    </div>
  );
}
