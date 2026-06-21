import * as cheerio from "cheerio";

export function looksEntityEncoded(html: string): boolean {
  return /&lt;\/?[a-z]/i.test(html);
}

export function decodeListingHtml(html: string): string {
  if (!html.trim() || !looksEntityEncoded(html)) return html;

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    let decoded = textarea.value;

    while (looksEntityEncoded(decoded)) {
      textarea.innerHTML = decoded;
      const next = textarea.value;
      if (next === decoded) break;
      decoded = next;
    }

    return decoded;
  }

  const $ = cheerio.load("<textarea></textarea>");
  $("textarea").html(html);
  let decoded = $("textarea").text();

  while (looksEntityEncoded(decoded)) {
    $("textarea").html(decoded);
    const next = $("textarea").text();
    if (next === decoded) break;
    decoded = next;
  }

  return decoded;
}
