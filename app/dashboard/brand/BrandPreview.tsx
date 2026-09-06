'use client';

import { PDFViewer } from '@react-pdf/renderer';
import { CERTIFICATE_TEMPLATES, type TemplateId } from '@/lib/certificates/templates';
import type { BrandConfig, CertificateData } from '@/lib/certificates/types';

// Sample data for the live preview (docs/build-phases.md Phase 3: "Provide
// a live preview in the wizard showing the issuer's brand applied to
// their chosen template with sample data"). qrDataUrl is a placeholder —
// real QR generation is wired up at issuance time (Phase 4, via the
// qrcode package); a preview doesn't need a scannable code, just something
// occupying the QR's visual slot.
const SAMPLE_DATA: CertificateData = {
  traineeName: 'Jordan Sample',
  programTitle: 'Sample Training Program',
  durationLabel: '6 weeks',
  dateRangeLabel: 'Jan – Feb 2026',
  distinction: 'Distinction',
  publicId: 'CERT-SAMPLE-0001',
  // btoa, not Buffer — this file runs client-side (a 'use client'
  // component), where Buffer isn't available without a polyfill.
  qrDataUrl:
    'data:image/svg+xml;base64,' +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#E2E5EA"/><text x="32" y="36" font-size="8" text-anchor="middle" fill="#6B7280">QR</text></svg>',
    ),
};

export function BrandPreview({ brand, templateId }: { brand: BrandConfig; templateId: TemplateId }) {
  const TemplateComponent = CERTIFICATE_TEMPLATES[templateId];

  if (!TemplateComponent) return null;

  return (
    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
      <TemplateComponent brand={brand} data={SAMPLE_DATA} />
    </PDFViewer>
  );
}
