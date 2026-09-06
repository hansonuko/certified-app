'use client';

import { useState } from 'react';
import { AFRICAN_COUNTRIES, getCountryGeo } from '@/lib/geo/africa';

type Issuer = { id: string; display_name: string };

// GET-submitted native form (docs/design-system.md §3: excellent on mobile,
// no JS required to search) — every field name matches a /directory
// searchParams key 1:1, so submitting just reloads the page with a new
// query string. Country/Region mirrors components/LocationFields.tsx's
// cascading behavior (structured Region dropdown for the priority
// countries, free text elsewhere) but as an optional *filter*, not a
// required input, so "Any" is always a valid choice.
export function DirectoryFilters({
  issuers,
  defaults,
}: {
  issuers: Issuer[];
  defaults: {
    q?: string;
    country?: string;
    region?: string;
    issuer?: string;
    from?: string;
    to?: string;
    open_to_hire?: string;
  };
}) {
  const [country, setCountry] = useState(defaults.country ?? '');
  const geo = getCountryGeo(country);

  return (
    <form
      method="get"
      action="/directory"
      className="flex flex-col gap-4 rounded-card border border-certified-border bg-certified-surface p-5"
    >
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Search by name, field, or program
        <input
          name="q"
          defaultValue={defaults.q}
          placeholder="e.g. welding, food safety, Jordan"
          className="rounded-control border border-certified-border px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Country
          <select
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2"
          >
            <option value="">Any country</option>
            {AFRICAN_COUNTRIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          {geo?.regionLabel ?? 'Region'}
          {geo?.regions ? (
            <select
              key={country}
              name="region"
              defaultValue={defaults.region}
              className="rounded-control border border-certified-border px-3 py-2"
            >
              <option value="">Any</option>
              {geo.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={country}
              name="region"
              defaultValue={defaults.region}
              placeholder="Any"
              className="rounded-control border border-certified-border px-3 py-2"
            />
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Issuer
          <select
            name="issuer"
            defaultValue={defaults.issuer}
            className="rounded-control border border-certified-border px-3 py-2"
          >
            <option value="">Any issuer</option>
            {issuers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.display_name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 self-end pb-2 text-sm text-certified-ink">
          <input type="checkbox" name="open_to_hire" value="1" defaultChecked={defaults.open_to_hire === '1'} />
          Open to hire only
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:w-1/2">
        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Completed from
          <input
            type="date"
            name="from"
            defaultValue={defaults.from}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Completed to
          <input
            type="date"
            name="to"
            defaultValue={defaults.to}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white">
          Search
        </button>
        <a href="/directory" className="rounded-control border border-certified-border px-4 py-2 text-sm text-certified-ink">
          Clear filters
        </a>
      </div>
    </form>
  );
}
