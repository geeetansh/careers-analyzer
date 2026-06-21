import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { decodeListingHtml } from "@/lib/html/decode-listing-html";

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "br",
  "strong",
  "em",
  "a",
  "div",
  "section",
  "article",
]);

function cleanNode($: cheerio.CheerioAPI, element: Element) {
  const tagName = element.tagName?.toLowerCase();
  if (!tagName) return;

  if (!BLOCK_TAGS.has(tagName)) {
    $(element).replaceWith($(element).html() ?? "");
    return;
  }

  $(element).removeAttr("class");
  $(element).removeAttr("id");
  $(element).removeAttr("style");
  $(element).removeAttr("data-mce-style");
  $(element).removeAttr("data-testid");

  if (tagName === "a") {
    const href = $(element).attr("href");
    $(element).removeAttr("target");
    $(element).removeAttr("rel");
    if (href) $(element).attr("href", href);
  }

  $(element)
    .children()
    .each((_, child) => cleanNode($, child));
}

function unwrapEmptyWrappers($: cheerio.CheerioAPI) {
  $("div, span").each((_, element) => {
    const $el = $(element);
    const text = $el.text().replace(/\s+/g, "").trim();
    const hasStructure = $el.children("p, ul, ol, h1, h2, h3, h4, h5, h6, table").length > 0;
    if (!text && !hasStructure) {
      $el.remove();
    }
  });
}

export function sanitizeListingHtml(html: string): string {
  if (!html.trim()) return "";

  const decoded = decodeListingHtml(html);
  const $ = cheerio.load(decoded);
  $("script, style, noscript, iframe, svg, form, button, input, nav, footer, header").remove();

  const root =
    $(".content").first().length > 0
      ? $(".content").first()
      : $("[class*='job-description']").first().length > 0
        ? $("[class*='job-description']").first()
        : $("main").first().length > 0
          ? $("main").first()
          : $("article").first().length > 0
            ? $("article").first()
            : $("body");

  root.children().each((_, child) => cleanNode($, child));
  unwrapEmptyWrappers($);

  const cleaned = root.html()?.trim() ?? "";
  if (cleaned) return cleaned;

  return $.root().text().replace(/\n{3,}/g, "\n\n").trim();
}

export function listingHtmlToPlainText(html: string): string {
  const $ = cheerio.load(sanitizeListingHtml(html));
  return $.text().replace(/\s+/g, " ").trim();
}
