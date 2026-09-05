// Shared types every certificate template (lib/certificates/templates/*.tsx) consumes.
// Keeping these in one place is what makes "switch templates" a data-driven choice
// instead of a rebuild — see docs/design-system.md §4.

export type BrandConfig = {
  issuerName: string;
  issuerTagline?: string;
  logoUrl?: string;
  /** Issuer's own brand color — drives every template's accent geometry. Never used for the gold seal. */
  primaryColor: string;
  signatoryName: string;
  signatoryTitle: string;
  signatureImageUrl?: string;
};

export type CertificateData = {
  traineeName: string;
  programTitle: string;
  durationLabel?: string;
  dateRangeLabel?: string;
  distinction?: string;
  /** Random, non-sequential public id, e.g. CERT-8F2K9-XQ41 (docs/blueprint.md §3.4). */
  publicId: string;
  /** Server-generated QR pointing at /verify/{publicId} — a data: URL or remote image URL, per the `qrcode` package output. */
  qrDataUrl: string;
};

export type TemplateProps = {
  brand: BrandConfig;
  data: CertificateData;
};

// Every template renders at this exact point size — matches A4 landscape's ~1.414 aspect
// ratio closely enough to treat pixels as points 1:1 (docs/design-system.md §3).
export const PAGE_WIDTH = 1200;
export const PAGE_HEIGHT = 848;
