'use client';

import { useActionState, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { saveBrand, type BrandFormState } from './actions';
import type { TemplateId } from '@/lib/certificates/templates';

// react-pdf's <PDFViewer> touches browser-only APIs at module scope, so it
// can't be part of the server-rendered HTML — ssr:false keeps it out of
// that pass entirely rather than erroring during it.
const BrandPreview = dynamic(() => import('./BrandPreview').then((m) => m.BrandPreview), { ssr: false });

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'angle', label: 'Angle' },
  { id: 'frame', label: 'Frame' },
  { id: 'block', label: 'Block' },
  { id: 'ribbon', label: 'Ribbon' },
  { id: 'monogram', label: 'Monogram' },
  { id: 'wave', label: 'Wave' },
  { id: 'hex', label: 'Hex' },
  { id: 'split', label: 'Split' },
  { id: 'deco', label: 'Deco' },
  { id: 'halo', label: 'Halo' },
];

type InitialBrand = {
  issuerName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  signatureImageUrl: string | null;
  templateId: string | null;
};

export function BrandForm({ initial }: { initial: InitialBrand }) {
  const [state, formAction, pending] = useActionState<BrandFormState, FormData>(saveBrand, null);

  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor ?? '#0F2340');
  const [signatoryName, setSignatoryName] = useState(initial.signatoryName ?? '');
  const [signatoryTitle, setSignatoryTitle] = useState(initial.signatoryTitle ?? '');
  const [signatureMethod, setSignatureMethod] = useState<'typed' | 'upload'>(
    initial.signatureImageUrl ? 'upload' : 'typed',
  );
  const [templateId, setTemplateId] = useState<TemplateId>((initial.templateId as TemplateId) ?? 'angle');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  // Newly selected (not yet saved) files preview immediately via a local
  // blob URL; otherwise fall back to whatever's already saved.
  const logoPreviewUrl = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : (initial.logoUrl ?? undefined)), [logoFile, initial.logoUrl]);
  const signaturePreviewUrl = useMemo(
    () => (signatureFile ? URL.createObjectURL(signatureFile) : (initial.signatureImageUrl ?? undefined)),
    [signatureFile, initial.signatureImageUrl],
  );

  const previewBrand = {
    issuerName: initial.issuerName,
    logoUrl: logoPreviewUrl,
    primaryColor,
    signatoryName: signatoryName || 'Signatory Name',
    signatoryTitle: signatoryTitle || 'Title',
    signatureImageUrl: signatureMethod === 'upload' ? signaturePreviewUrl : undefined,
  };

  return (
    <div className="grid grid-cols-2 gap-8 p-8">
      <form action={formAction} className="flex flex-col gap-4">
        <h1 className="font-display text-2xl text-certified-navy">Brand setup</h1>

        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Logo
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Primary color
          <input
            type="color"
            name="primary_color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-20 rounded-control border border-certified-border"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Signatory name
          <input
            type="text"
            name="signatory_name"
            value={signatoryName}
            onChange={(e) => setSignatoryName(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Signatory title
          <input
            type="text"
            name="signatory_title"
            value={signatoryTitle}
            onChange={(e) => setSignatoryTitle(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>

        <fieldset>
          <legend className="text-sm text-certified-ink">Signature</legend>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="signature_method"
                value="typed"
                checked={signatureMethod === 'typed'}
                onChange={() => setSignatureMethod('typed')}
              />
              Typed (renders your name in a script serif)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="signature_method"
                value="upload"
                checked={signatureMethod === 'upload'}
                onChange={() => setSignatureMethod('upload')}
              />
              Upload an image of your signature
            </label>
            {signatureMethod === 'upload' ? (
              <input
                type="file"
                name="signature_image"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)}
                className="rounded-control border border-certified-border px-3 py-2"
              />
            ) : null}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm text-certified-ink">Template</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded-control border border-certified-border px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="template_id"
                  value={t.id}
                  checked={templateId === t.id}
                  onChange={() => setTemplateId(t.id)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        {state && 'error' in state ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
        {state && 'success' in state ? <p className="text-sm text-certified-success">Saved.</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save brand settings'}
        </button>
      </form>

      <div className="h-[600px] rounded-card border border-certified-border">
        <BrandPreview brand={previewBrand} templateId={templateId} />
      </div>
    </div>
  );
}
