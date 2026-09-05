import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Block" (T03) — solid brand-color panel occupies the right third, content in the open two-thirds.
export function BlockCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <View style={{ position: 'absolute', right: 0, top: 0, width: 380, height: PAGE_HEIGHT, backgroundColor: brand.primaryColor, padding: 48, paddingTop: 64 }}>
          <View style={{ width: 40, height: 40, backgroundColor: '#fff', opacity: 0.9 }} />
          <Text style={{ color: '#fff', fontWeight: 700, fontSize: 23, marginTop: 20 }}>{brand.issuerName}</Text>
          {brand.issuerTagline ? <Text style={{ color: '#E6E6E6', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>{brand.issuerTagline}</Text> : null}
          <View style={{ marginTop: 56, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', borderTopStyle: 'solid', paddingTop: 20 }}>
            <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: '#fff' }}>{brand.signatoryName}</Text>
            <Text style={{ fontSize: 10, color: '#E6E6E6', marginTop: 4 }}>{brand.signatoryTitle}</Text>
          </View>
        </View>
        <Text style={{ position: 'absolute', left: 72, top: 96, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 72, top: 200, width: 700, fontFamily: SERIF, fontWeight: 700, fontSize: 52, color: '#0F172A' }}>{data.traineeName}</Text>
        <View style={{ position: 'absolute', left: 72, top: 290, width: 230, height: 3, backgroundColor: brand.primaryColor }} />
        <Text style={{ position: 'absolute', left: 72, top: 326, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 72, top: 364, width: 700, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 72, top: 410, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 72, bottom: 56 }}>
          <VerificationQr dataUrl={data.qrDataUrl} publicId={data.publicId} />
        </View>
        <View style={{ position: 'absolute', right: 436, bottom: 52 }}>
          <GoldSeal size={112} />
        </View>
      </Page>
    </Document>
  );
}
