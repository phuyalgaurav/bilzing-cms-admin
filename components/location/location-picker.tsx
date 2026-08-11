"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  Search,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LocationSelection {
  address: string;
  latitude: string;
  longitude: string;
}

interface LocationPickerProps extends LocationSelection {
  onChange: (selection: LocationSelection) => void;
}

function coordinatesAreValid(latitude: string, longitude: string) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    latitude !== "" &&
    longitude !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function LocationPicker({
  address,
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const [query, setQuery] = useState(address);
  const [results, setResults] = useState<LocationSelection[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string>();
  const requestController = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    setQuery(address);
  }, [address]);

  useEffect(
    () => () => requestController.current?.abort(),
    [],
  );

  const hasCoordinates = coordinatesAreValid(latitude, longitude);
  const destination = hasCoordinates
    ? `${latitude},${longitude}`
    : address.trim();
  const previewUrl = destination
    ? `https://www.google.com/maps?q=${encodeURIComponent(destination)}&z=16&output=embed`
    : undefined;
  const googleMapsUrl = destination
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`
    : undefined;

  const selectedCoordinates = useMemo(
    () => `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`,
    [latitude, longitude],
  );

  async function searchLocations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (nextQuery.length < 3) {
      setError("Enter at least 3 characters to search.");
      return;
    }

    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setSearching(true);
    setError(undefined);

    try {
      const response = await fetch(
        `/api/maps/search?q=${encodeURIComponent(nextQuery)}`,
        { signal: controller.signal },
      );
      const body = (await response.json()) as
        | LocationSelection[]
        | { detail?: string };
      if (!response.ok) {
        throw new Error(
          !Array.isArray(body) && body.detail
            ? body.detail
            : "Location search failed.",
        );
      }
      const nextResults = Array.isArray(body) ? body : [];
      setResults(nextResults);
      if (!nextResults.length) {
        setError("No matching places found. Try a broader address.");
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setResults([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "Location search is temporarily unavailable.",
      );
    } finally {
      if (requestController.current === controller) setSearching(false);
    }
  }

  function chooseLocation(selection: LocationSelection) {
    onChange(selection);
    setQuery(selection.address);
    setResults([]);
    setError(undefined);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location access is not supported by this browser.");
      return;
    }
    setLocating(true);
    setError(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          address,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setResults([]);
        setLocating(false);
      },
      () => {
        setError("Location access was not available. Search for the address instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <section className="border-t pt-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Location on Google Maps</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Search for the business, landmark, or full street address, then choose the correct result.
        </p>
      </div>

      <form className="flex gap-2" onSubmit={searchLocations}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search for a location"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a place or address"
          />
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Search
        </Button>
      </form>

      {results.length ? (
        <div className="mt-2 overflow-hidden rounded-lg border bg-card">
          {results.map((result) => {
            const selected =
              result.latitude === latitude && result.longitude === longitude;
            return (
              <button
                key={`${result.latitude}:${result.longitude}`}
                type="button"
                className="flex w-full items-start gap-3 border-b px-3 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                onClick={() => chooseLocation(result)}
              >
                <MapPinned className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 leading-5">{result.address}</span>
                {selected ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
          <p className="border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            Search results © OpenStreetMap contributors
          </p>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border bg-muted/30">
        {previewUrl ? (
          <iframe
            key={previewUrl}
            title="Google Maps location preview"
            src={previewUrl}
            className="h-64 w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="grid min-h-48 place-items-center p-6 text-center">
            <div>
              <MapPinned className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Choose a location</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                The selected place will appear here before you save it.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t bg-card p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <LocateFixed className="size-3.5" />
            )}
            Use current location
          </Button>
          {googleMapsUrl ? (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-3.5" /> Open in Google Maps
            </a>
          ) : null}
          {hasCoordinates ? (
            <span className="ml-auto text-xs text-muted-foreground">
              Pin: {selectedCoordinates}
            </span>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
