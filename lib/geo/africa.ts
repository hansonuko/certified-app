// Pan-African location data (docs/blueprint.md §7, post-rebrand scope
// change to Certified Africa). Nigeria's State/LGA model doesn't generalize
// across the continent — Ghana uses Regions/Districts, Kenya Counties,
// South Africa Provinces/Municipalities, and so on — so this module is
// structured in two tiers rather than one flat "State + LGA" shape:
//
// 1. Country — a real, structured dropdown. All 54 AU/UN-recognized
//    African states, a small and stable list.
// 2. Region (state/province/county/region depending on the country) —
//    structured, real dropdowns for the four "priority" countries this
//    platform is actually operating in first (Nigeria, Ghana, Kenya, South
//    Africa). Every other country falls back to a free-text region input
//    labeled generically ("State / Region / Province") rather than an
//    invented or unverified structured list — exhaustively sourcing and
//    maintaining accurate first-level admin-division data for all 54
//    countries is real, ongoing data-maintenance work disproportionate to
//    this platform's actual footprint today; expand this list
//    country-by-country as issuers in that country actually sign up.
//
// Locality (LGA/district/municipality/ward-equivalent) is free text
// everywhere, including the priority countries — that granularity runs into
// the thousands of entries per country (774 Nigerian LGAs alone) and is a
// separate, much larger data-sourcing effort than this module takes on.
// This matches how state/lga were already implemented pre-rebrand (free
// text end to end) for locality specifically, while region now gets real
// structured selection where it matters most.

export type CountryGeo = {
  name: string;
  /** What this country calls its first-level administrative division. Generic for non-priority countries. */
  regionLabel: string;
  /** Structured list of that country's first-level divisions — only present for priority countries. */
  regions?: string[];
};

const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory (Abuja)',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern', 'Greater Accra', 'North East',
  'Northern', 'Oti', 'Savannah', 'Upper East', 'Upper West', 'Volta', 'Western', 'Western North',
];

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay',
  'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu',
  'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru',
  'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
];

const SOUTH_AFRICA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga',
  'North West', 'Northern Cape', 'Western Cape',
];

const GENERIC_REGION_LABEL = 'State / Region / Province';

// All 54 AU/UN-recognized African sovereign states, alphabetical. The four
// priority countries get a real regionLabel + structured regions list;
// every other country gets the generic label and no regions array (callers
// fall back to a free-text region input).
export const AFRICAN_COUNTRIES: CountryGeo[] = [
  { name: 'Algeria', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Angola', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Benin', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Botswana', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Burkina Faso', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Burundi', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Cabo Verde', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Cameroon', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Central African Republic', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Chad', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Comoros', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Côte d’Ivoire', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Democratic Republic of the Congo', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Djibouti', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Egypt', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Equatorial Guinea', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Eritrea', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Eswatini', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Ethiopia', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Gabon', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Gambia', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Ghana', regionLabel: 'Region', regions: GHANA_REGIONS },
  { name: 'Guinea', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Guinea-Bissau', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Kenya', regionLabel: 'County', regions: KENYA_COUNTIES },
  { name: 'Lesotho', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Liberia', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Libya', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Madagascar', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Malawi', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Mali', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Mauritania', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Mauritius', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Morocco', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Mozambique', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Namibia', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Niger', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Nigeria', regionLabel: 'State', regions: NIGERIA_STATES },
  { name: 'Republic of the Congo', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Rwanda', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Sao Tome and Principe', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Senegal', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Seychelles', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Sierra Leone', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Somalia', regionLabel: GENERIC_REGION_LABEL },
  { name: 'South Africa', regionLabel: 'Province', regions: SOUTH_AFRICA_PROVINCES },
  { name: 'South Sudan', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Sudan', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Tanzania', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Togo', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Tunisia', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Uganda', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Zambia', regionLabel: GENERIC_REGION_LABEL },
  { name: 'Zimbabwe', regionLabel: GENERIC_REGION_LABEL },
];

export const LOCALITY_LABEL = 'City / District / LGA (as applicable)';

export function getCountryGeo(countryName: string | null | undefined): CountryGeo | undefined {
  return AFRICAN_COUNTRIES.find((c) => c.name === countryName);
}
