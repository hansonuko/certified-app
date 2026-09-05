// Registry of the 10 confirmed certificate templates (docs/design-system.md §4).
// The issuer's `Organization.brand.template_id` (docs/blueprint.md §4) is one of these
// keys — look up the component here rather than branching on template name anywhere else,
// so adding/removing a template later is a one-line change.
import { AngleCertificate } from './angle';
import { FrameCertificate } from './frame';
import { BlockCertificate } from './block';
import { RibbonCertificate } from './ribbon';
import { MonogramCertificate } from './monogram';
import { WaveCertificate } from './wave';
import { HexCertificate } from './hex';
import { SplitCertificate } from './split';
import { DecoCertificate } from './deco';
import { HaloCertificate } from './halo';
import type { ComponentType } from 'react';
import type { TemplateProps } from '../types';

export const CERTIFICATE_TEMPLATES: Record<string, ComponentType<TemplateProps>> = {
  angle: AngleCertificate,
  frame: FrameCertificate,
  block: BlockCertificate,
  ribbon: RibbonCertificate,
  monogram: MonogramCertificate,
  wave: WaveCertificate,
  hex: HexCertificate,
  split: SplitCertificate,
  deco: DecoCertificate,
  halo: HaloCertificate,
};

export type TemplateId = keyof typeof CERTIFICATE_TEMPLATES;
