const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; CareersAnalyzer/1.0; +https://github.com/careers-analyzer)",
  Accept: "text/html,application/json",
};

export async function fetchText(
  url: string,
  init?: RequestInit,
): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...init?.headers,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const text = await fetchText(url, init);
  return JSON.parse(text) as T;
}
