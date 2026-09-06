'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

export type ProgramFormState = { error: string } | null;

function readProgramFields(formData: FormData) {
  const title = (formData.get('title') as string | null)?.trim();
  const description = (formData.get('description') as string | null)?.trim() || null;
  const category = (formData.get('category') as string | null)?.trim() || null;
  const duration = (formData.get('duration') as string | null)?.trim() || null;
  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;
  const validityRaw = (formData.get('certificate_validity_months') as string | null)?.trim();
  const certificateValidityMonths = validityRaw ? Number(validityRaw) : null;

  return { title, description, category, duration, startDate, endDate, certificateValidityMonths };
}

export async function createProgram(_prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const fields = readProgramFields(formData);
  if (!fields.title) {
    return { error: 'A program title is required.' };
  }
  if (fields.certificateValidityMonths !== null && (!Number.isInteger(fields.certificateValidityMonths) || fields.certificateValidityMonths <= 0)) {
    return { error: 'Certificate validity, if set, must be a whole number of months greater than zero.' };
  }

  const { data, error } = await supabase
    .from('training_programs')
    .insert({
      org_id: orgId,
      title: fields.title,
      description: fields.description,
      category: fields.category,
      duration: fields.duration,
      start_date: fields.startDate,
      end_date: fields.endDate,
      certificate_validity_months: fields.certificateValidityMonths,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: `Could not create program: ${error?.message ?? 'unknown error'}` };
  }

  revalidatePath('/dashboard/programs');
  redirect(`/dashboard/programs/${data.id}`);
}

export async function updateProgram(programId: string, _prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const fields = readProgramFields(formData);
  if (!fields.title) {
    return { error: 'A program title is required.' };
  }
  if (fields.certificateValidityMonths !== null && (!Number.isInteger(fields.certificateValidityMonths) || fields.certificateValidityMonths <= 0)) {
    return { error: 'Certificate validity, if set, must be a whole number of months greater than zero.' };
  }

  const { error } = await supabase
    .from('training_programs')
    .update({
      title: fields.title,
      description: fields.description,
      category: fields.category,
      duration: fields.duration,
      start_date: fields.startDate,
      end_date: fields.endDate,
      certificate_validity_months: fields.certificateValidityMonths,
    })
    .eq('id', programId)
    .eq('org_id', orgId); // belt-and-suspenders alongside RLS's own org_id scoping

  if (error) {
    return { error: `Could not save changes: ${error.message}` };
  }

  revalidatePath(`/dashboard/programs/${programId}`);
  return null;
}
