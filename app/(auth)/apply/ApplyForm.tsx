'use client';

import { useActionState, useState, useEffect, useRef, useTransition } from 'react';
import 'altcha';
import { submitApplication, type ApplyFormState } from './actions';
import { saveApplicationDraftAction, uploadDraftDocumentAction } from './draft-actions';
import { LocationFields } from '@/components/LocationFields';
import type { ApplicationDraft } from '@/lib/apply/draft';

// Multi-step application wizard (docs/blueprint.md §3.1, docs/build-phases.md
// Phase 1). All steps stay mounted throughout (toggled with a `hidden`
// class, not conditionally unmounted) specifically so file inputs don't
// lose their selected file when the applicant navigates back and forth —
// browsers won't let JS restore a file input's value once unmounted.
// Native `required` is deliberately not used on any field: a hidden
// required input still blocks native form submission and tries to focus
// itself, which is broken UX for a field the applicant can't currently
// see. Step-level "did you fill this in" checks happen in handleNext
// instead; the Server Action (actions.ts) is the real validation.
//
// Save-and-continue-later (app/(auth)/apply/draft-actions.ts): every Next/
// Back click snapshots the form's current field values to a draft row,
// silently, best-effort — no "saved!" toast, no separate button. Returning
// to /apply while signed in (app/(auth)/apply/page.tsx) resumes right back
// into this same wizard with those values and step pre-filled. File inputs
// upload to the draft the moment they're chosen (immediately, not waiting
// for Next) since a resumed session can never repopulate a file input —
// only the already-uploaded path can survive that round trip.

const STEPS_BUSINESS = ['type', 'business', 'contact', 'documents', 'review'] as const;
const STEPS_INDIVIDUAL = ['type', 'business', 'contact', 'documents', 'declaration', 'review'] as const;

type ApplicantType = 'business' | 'individual' | null;

export function ApplyForm({ initialDraft }: { initialDraft: ApplicationDraft | null }) {
  const [state, formAction, pending] = useActionState<ApplyFormState, FormData>(submitApplication, null);
  const draftFields = initialDraft?.form_data ?? {};
  const initialApplicantType: ApplicantType =
    draftFields.applicant_type === 'business' || draftFields.applicant_type === 'individual' ? draftFields.applicant_type : null;
  const [applicantType, setApplicantType] = useState<ApplicantType>(initialApplicantType);
  const initialSteps = initialApplicantType === 'individual' ? STEPS_INDIVIDUAL : STEPS_BUSINESS;
  const [stepIndex, setStepIndex] = useState(
    Math.min(Math.max(initialDraft?.step_index ?? 0, 0), initialSteps.length - 1),
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startDraftSave] = useTransition();

  // Already-uploaded draft documents — a resumed session's actual file
  // <input> starts empty (browsers never restore that), so these paths are
  // what actually gets submitted (actions.ts's draft_*_path hidden fields)
  // unless the applicant picks a fresh file to replace one.
  const [identificationPath, setIdentificationPath] = useState<string | null>(initialDraft?.identification_document_path ?? null);
  const [proofOfOperationPath, setProofOfOperationPath] = useState<string | null>(initialDraft?.proof_of_operation_path ?? null);
  const [identificationUploadError, setIdentificationUploadError] = useState<string | null>(null);
  const [proofUploadError, setProofUploadError] = useState<string | null>(null);
  const [identificationUploading, setIdentificationUploading] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);

  const steps = applicantType === 'individual' ? STEPS_INDIVIDUAL : STEPS_BUSINESS;
  const currentStep = steps[stepIndex];

  // Re-fetch a fresh Altcha challenge if the form comes back with a server
  // error (a stale/expired challenge shouldn't strand the applicant).
  useEffect(() => {
    if (state?.error) {
      document.querySelectorAll('altcha-widget').forEach((el) => (el as HTMLElement & { reset?: () => void }).reset?.());
    }
  }, [state]);

  function fieldValue(name: string): string {
    const el = formRef.current?.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value.trim();
    if (el instanceof RadioNodeList) {
      for (const item of Array.from(el)) {
        if (item instanceof HTMLInputElement && item.checked) return item.value;
      }
    }
    return '';
  }

  function hasFile(name: 'identification_document' | 'proof_of_operation'): boolean {
    const el = formRef.current?.elements.namedItem(name);
    const hasNewFile = el instanceof HTMLInputElement && !!el.files && el.files.length > 0;
    if (hasNewFile) return true;
    // A resumed draft's already-uploaded document counts as "has a file"
    // even though the native input itself is empty.
    return name === 'identification_document' ? !!identificationPath : !!proofOfOperationPath;
  }

  function saveDraft(nextStepIndex: number) {
    if (!formRef.current) return;
    const snapshot = new FormData(formRef.current);
    startDraftSave(() => {
      saveApplicationDraftAction(snapshot, nextStepIndex).catch(() => {
        // Best-effort — autosave failing silently is the correct behavior
        // for a convenience feature (see draft-actions.ts's own comment).
      });
    });
  }

  async function handleDraftFileChange(
    label: 'identification' | 'proof-of-operation',
    file: File | null,
  ) {
    const setPath = label === 'identification' ? setIdentificationPath : setProofOfOperationPath;
    const setError = label === 'identification' ? setIdentificationUploadError : setProofUploadError;
    const setUploading = label === 'identification' ? setIdentificationUploading : setProofUploading;

    setError(null);
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const result = await uploadDraftDocumentAction(label, fd);
      if ('error' in result) {
        setError(result.error);
      } else {
        setPath(result.path);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleNext() {
    setStepError(null);
    if (currentStep === 'type' && !applicantType) {
      setStepError('Choose Business/Training Centre or Individual Trainer to continue.');
      return;
    }
    if (currentStep === 'business') {
      if (!fieldValue('legal_name') || !fieldValue('display_name') || !fieldValue('trainee_volume_band')) {
        setStepError('Legal name, display name, and expected trainee volume are required.');
        return;
      }
    }
    if (currentStep === 'contact') {
      if (!fieldValue('owner_full_name') || !fieldValue('owner_phone') || !fieldValue('owner_email')) {
        setStepError('Owner full name, phone, and email are all required — this is who we reach out to.');
        return;
      }
    }
    if (currentStep === 'documents') {
      if (!hasFile('identification_document')) {
        setStepError('An identification document is required.');
        return;
      }
      if (applicantType === 'business' && !hasFile('proof_of_operation')) {
        setStepError('A business registration certificate (e.g. CAC in Nigeria) upload is required for Business/Training Centre applicants.');
        return;
      }
    }
    const next = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(next);
    saveDraft(next);
  }

  function handleBack() {
    setStepError(null);
    const prev = Math.max(stepIndex - 1, 0);
    setStepIndex(prev);
    saveDraft(prev);
  }

  return (
    <form ref={formRef} action={formAction} className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <input type="hidden" name="applicant_type" value={applicantType ?? ''} />
      <input type="hidden" name="draft_identification_path" value={identificationPath ?? ''} />
      <input type="hidden" name="draft_proof_of_operation_path" value={proofOfOperationPath ?? ''} />

      {initialDraft ? (
        <p className="rounded-control border border-certified-border bg-certified-surface-2 px-3 py-2 text-sm text-certified-muted">
          Picking up where you left off — your progress is saved automatically as you go.
        </p>
      ) : null}

      <section className={currentStep === 'type' ? '' : 'hidden'}>
        <h2 className="font-display text-xl text-certified-navy">What kind of applicant are you?</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-control border border-certified-border p-3">
            <input
              type="radio"
              name="applicant_type_choice"
              value="business"
              checked={applicantType === 'business'}
              onChange={() => setApplicantType('business')}
            />
            Business / Training Centre
          </label>
          <label className="flex items-center gap-2 rounded-control border border-certified-border p-3">
            <input
              type="radio"
              name="applicant_type_choice"
              value="individual"
              checked={applicantType === 'individual'}
              onChange={() => setApplicantType('individual')}
            />
            Individual Trainer
          </label>
        </div>
      </section>

      <section className={currentStep === 'business' ? 'flex flex-col gap-4' : 'hidden'}>
        <h2 className="font-display text-xl text-certified-navy">Tell us about the business</h2>
        <Field label="Legal / registered name" name="legal_name" defaultValue={draftFields.legal_name} />
        <Field label="Display name (shown publicly)" name="display_name" defaultValue={draftFields.display_name} />
        <Field
          label={`Business registration number, if any (e.g. RC/CAC in Nigeria) ${applicantType === 'individual' ? '(optional — leave blank if none)' : ''}`}
          name="rc_number"
          defaultValue={draftFields.rc_number}
        />
        <Field label="Street address" name="address_street" defaultValue={draftFields.address_street} />
        <LocationFields
          countryName="address_country"
          regionName="address_region"
          localityName="address_locality"
          defaultCountry={draftFields.address_country ?? ''}
          defaultRegion={draftFields.address_region ?? ''}
          defaultLocality={draftFields.address_locality ?? ''}
        />
        <Field label="Field(s) of training you intend to certify in" name="training_fields" defaultValue={draftFields.training_fields} />
        <TextAreaField label="Short description of what you train" name="training_description" defaultValue={draftFields.training_description} />
        <fieldset>
          <legend className="text-sm text-certified-ink">Expected trainee volume this year</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {(['0-5', '6-15', '16-29', '30+'] as const).map((band) => (
              <label key={band} className="flex items-center gap-2 rounded-control border border-certified-border px-3 py-2">
                <input
                  type="radio"
                  name="trainee_volume_band"
                  value={band}
                  defaultChecked={draftFields.trainee_volume_band === band}
                />
                {band}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className={currentStep === 'contact' ? 'flex flex-col gap-4' : 'hidden'}>
        <h2 className="font-display text-xl text-certified-navy">Who do we reach out to?</h2>
        <Field label="Owner full name" name="owner_full_name" defaultValue={draftFields.owner_full_name} />
        <Field label="Owner phone" name="owner_phone" type="tel" defaultValue={draftFields.owner_phone} />
        <Field label="Owner email" name="owner_email" type="email" defaultValue={draftFields.owner_email} />
      </section>

      <section className={currentStep === 'documents' ? 'flex flex-col gap-4' : 'hidden'}>
        <h2 className="font-display text-xl text-certified-navy">Identification & proof of operation</h2>
        <FileField
          label="Identification document (business/work ID card, government ID, etc.)"
          name="identification_document"
          uploadedPath={identificationPath}
          uploading={identificationUploading}
          uploadError={identificationUploadError}
          onFileChange={(file) => handleDraftFileChange('identification', file)}
        />
        <FileField
          label={`Business registration certificate (e.g. CAC in Nigeria) ${applicantType === 'individual' ? '(optional)' : '(required)'}`}
          name="proof_of_operation"
          uploadedPath={proofOfOperationPath}
          uploading={proofUploading}
          uploadError={proofUploadError}
          onFileChange={(file) => handleDraftFileChange('proof-of-operation', file)}
        />
      </section>

      {applicantType === 'individual' && (
        <section className={currentStep === 'declaration' ? 'flex flex-col gap-4' : 'hidden'}>
          <h2 className="font-display text-xl text-certified-navy">Declaration</h2>
          <div className="max-h-64 overflow-y-auto rounded-control border border-certified-border p-4 text-sm text-certified-muted">
            <DeclarationText />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="declaration_agree" className="mt-1" defaultChecked={draftFields.declaration_agree === 'on'} />
            I have read and agree to this declaration.
          </label>
        </section>
      )}

      <section className={currentStep === 'review' ? 'flex flex-col gap-4' : 'hidden'}>
        <h2 className="font-display text-xl text-certified-navy">Submit application</h2>
        <p className="text-sm text-certified-muted">
          Review the previous steps with Back if needed, then complete the check below to submit.
        </p>
        {/* @ts-expect-error -- altcha-widget is a custom element, not a typed JSX intrinsic */}
        <altcha-widget challenge="/api/altcha-challenge" />
        {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Submitting…' : 'Submit application'}
        </button>
      </section>

      {stepError ? <p className="text-sm text-certified-danger">{stepError}</p> : null}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="rounded-control border border-certified-border px-4 py-2 text-certified-ink disabled:opacity-30"
        >
          Back
        </button>
        {currentStep !== 'review' ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-control bg-certified-navy px-4 py-2 text-white"
          >
            Next
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({ label, name, type = 'text', defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
      {label}
      <input name={name} type={type} defaultValue={defaultValue ?? ''} className="rounded-control border border-certified-border px-3 py-2" />
    </label>
  );
}

function TextAreaField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-certified-ink">
      {label}
      <textarea name={name} rows={3} defaultValue={defaultValue ?? ''} className="rounded-control border border-certified-border px-3 py-2" />
    </label>
  );
}

function FileField({
  label,
  name,
  uploadedPath,
  uploading,
  uploadError,
  onFileChange,
}: {
  label: string;
  name: string;
  uploadedPath: string | null;
  uploading: boolean;
  uploadError: string | null;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-certified-ink">
      {label}
      <input
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        className="rounded-control border border-certified-border px-3 py-2"
      />
      {uploading ? <span className="text-xs text-certified-muted">Uploading…</span> : null}
      {!uploading && uploadedPath ? <span className="text-xs text-certified-success">✓ Uploaded — choose a new file to replace it.</span> : null}
      {uploadError ? <span className="text-xs text-certified-danger">{uploadError}</span> : null}
    </label>
  );
}

function DeclarationText() {
  // Kept in sync by hand with docs/declaration-form.md — bump
  // ApplyFormState's declarationVersion (actions.ts) if this wording changes.
  return (
    <>
      <p className="mb-2 font-semibold">STATUTORY DECLARATION AND SELF-ATTESTATION</p>
      <ol className="list-decimal space-y-2 pl-4">
        <li>I am the person I claim to be, and the identification document provided in this application is genuine, accurate, and belongs to me.</li>
        <li>I possess genuine competence, training, qualification, and/or verifiable practical experience in the field(s) of training I have indicated in this application, and I am not misrepresenting my ability to deliver such training.</li>
        <li>All information I have provided in this application is true and correct to the best of my knowledge.</li>
        <li>I understand that any certificate I issue through Certified Africa will represent to the public that the certified individual has genuinely undergone and completed the training described.</li>
        <li>I understand that Certified Africa relies on this declaration, in the absence of formal business registration, as a basis for approving my account.</li>
        <li>I understand that knowingly making a false declaration may constitute an offence under applicable law in my country of operation and may result in suspension, removal of issued certificates, and referral to authorities.</li>
        <li>Certified Africa may request additional supporting evidence at any time and may suspend or revoke approved status if not satisfactorily provided.</li>
        <li>I consent to Certified Africa retaining this declaration and my identification document for verification, audit, and regulatory compliance, per the data protection law applicable in my country of operation (e.g. Nigeria&apos;s NDPA 2023, or the equivalent elsewhere) and Certified Africa&apos;s Privacy Policy.</li>
      </ol>
    </>
  );
}
