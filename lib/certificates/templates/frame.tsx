import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Frame" (T02) — hairline perimeter rule + header band, centered, formal.
// "CERTIFICATE OF COMPLETION" sits centered in the body, above the bearer name —
// not sharing the header band, so both read clearly on their own.
export function FrameCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <View style={{ position: 'absolute', left: 28, top: 28, right: 28, bottom: 28, borderWidth: 2, borderColor: brand.primaryColor, borderStyle: 'solid' }} />
        <View style={{ position: 'absolute', left: 28, top: 28, right: 28, height: 96, backgroundColor: brand.primaryColor, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 44 }}>
          <View>
            <Text style={{ color: '#fff', fontWeight: 700, fontSize: 23 }}>{brand.issuerName}</Text>
            {brand.issuerTagline ? <Text style={{ color: '#EAEAEA', fontSize: 11 }}>{brand.issuerTagline}</Text> : null}
          </View>
        </View>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 210, color: brand.primaryColor, fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 260, fontFamily: SERIF, fontWeight: 700, fontSize: 54, color: '#0F172A' }}>{data.traineeName}</Text>
        <View style={{ position: 'absolute', left: (PAGE_WIDTH - 260) / 2, top: 350, width: 260, height: 3, backgroundColor: brand.primaryColor }} />
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 376, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 414, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 452, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
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
