import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Monogram" (T07) — circular emblem mounts the issuer mark top-center. Generous,
// deliberate spacing between the brand name, the completion label, and the bearer name.
export function MonogramCertificate({ brand, data }: TemplateProps) {
  const initials = brand.issuerName.slice(0, 2).toUpperCase();
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <View style={{ position: 'absolute', left: PAGE_WIDTH / 2 - 44, top: 56, width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: brand.primaryColor, borderStyle: 'solid', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 24, color: brand.primaryColor }}>{initials}</Text>
        </View>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 172, fontWeight: 700, fontSize: 20, color: '#0F172A' }}>{brand.issuerName}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 256, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 330, fontFamily: SERIF, fontWeight: 700, fontSize: 50, color: '#0F172A' }}>{data.traineeName}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 420, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 458, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 504, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 80, bottom: 150, width: 220, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderTopStyle: 'solid', paddingTop: 12 }}>
          <Signature signatureImageUrl={brand.signatureImageUrl} signatoryName={brand.signatoryName} />
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{brand.signatoryTitle}</Text>
        </View>
        <View style={{ position: 'absolute', left: 568, bottom: 56 }}>
          <VerificationQr dataUrl={data.qrDataUrl} publicId={data.publicId} />
        </View>
        <View style={{ position: 'absolute', right: 70, bottom: 52 }}>
          <GoldSeal size={112} />
        </View>
      </Page>
    </Document>
  );
}
