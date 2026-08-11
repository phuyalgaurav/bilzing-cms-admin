import { NextRequest, NextResponse } from "next/server";

interface NominatimResult {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json(
      { detail: "Enter at least 3 characters to search." },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.slice(0, 160));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set(
    "accept-language",
    (request.headers.get("accept-language")?.split(",")[0] || "en").slice(
      0,
      20,
    ),
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Bilzing CMS location search (https://bilzing.com)",
      },
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      throw new Error(`Geocoder returned ${response.status}`);
    }

    const results = (await response.json()) as NominatimResult[];
    return NextResponse.json(
      results.flatMap((result) => {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        if (
          !result.display_name ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return [];
        }
        return [
          {
            address: result.display_name,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            type: result.type ?? "place",
          },
        ];
      }),
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { detail: "Location search is temporarily unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
