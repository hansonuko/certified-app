// GET-submitted native form, same reasoning as ../DirectoryFilters.tsx:
// works with no JS, every field name matches a searchParams key 1:1. Just
// one input — the search matches name, bio, training fields, and location
// together (app/directory/organizations/page.tsx), so there's no separate
// set of dropdown filters to keep in sync the way the trainee search has.
export function OrganizationSearchFilters({ defaults }: { defaults: { q?: string } }) {
  return (
    <form
      method="get"
      action="/directory/organizations"
      className="flex flex-col gap-4 rounded-card border border-certified-border bg-certified-surface p-5 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
        Search by name, description, training field, or location
        <input
          name="q"
          defaultValue={defaults.q}
          placeholder="e.g. welding, Lagos, food safety academy"
          className="rounded-control border border-certified-border px-3 py-2"
        />
      </label>

      <div className="flex gap-3">
        <button type="submit" className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white">
          Search
        </button>
        <a href="/directory/organizations" className="rounded-control border border-certified-border px-4 py-2 text-sm text-certified-ink">
          Clear
        </a>
      </div>
    </form>
  );
}
