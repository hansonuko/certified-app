'use client';

import { useState } from 'react';
import { AFRICAN_COUNTRIES, getCountryGeo, LOCALITY_LABEL } from '@/lib/geo/africa';

/**
 * Country + Region + Locality — the pan-African replacement for the old
 * flat "State + LGA" text fields (docs/blueprint.md §7). Shared between the
 * application form and the trainee-add/issuance form rather than
 * duplicating the country-aware region logic in both places.
 *
 * Plain named inputs (not a controlled form-wide state object) so this
 * drops into either caller's existing FormData-based server action without
 * either of them needing to lift location state — only `country` is local
 * state here, purely to decide whether Region renders as a dropdown
 * (priority countries) or a free-text input (everywhere else).
 */
export function LocationFields({
  countryName,
  regionName,
  localityName,
  defaultCountry = '',
  defaultRegion = '',
  defaultLocality = '',
  required = false,
}: {
  countryName: string;
  regionName: string;
  localityName: string;
  defaultCountry?: string;
  defaultRegion?: string;
  defaultLocality?: string;
  required?: boolean;
}) {
  const [country, setCountry] = useState(defaultCountry);
  const geo = getCountryGeo(country);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Country{required ? '' : ' (optional)'}
        <select
          name={countryName}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required={required}
          className="rounded-control border border-certified-border px-3 py-2"
        >
          <option value="">Select a country…</option>
          {AFRICAN_COUNTRIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
          {geo?.regionLabel ?? 'State / Region / Province'}
          {geo?.regions ? (
            // key={country} forces a clean remount when switching between
            // two priority countries, so a stale selected value from the
            // previous country's list can't linger in the DOM.
            <select
              key={country}
              name={regionName}
              defaultValue={defaultRegion}
              className="rounded-control border border-certified-border px-3 py-2"
            >
              <option value="">Select…</option>
              {geo.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={country}
              name={regionName}
              type="text"
              defaultValue={defaultRegion}
              className="rounded-control border border-certified-border px-3 py-2"
            />
          )}
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
          {LOCALITY_LABEL}
          <input
            name={localityName}
            type="text"
            defaultValue={defaultLocality}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>
      </div>
    </div>
  );
}
