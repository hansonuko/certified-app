import React from 'react';
import { Document, Page, View, Text, Svg, Path } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Wave" (T09) — soft asymmetric wave anchors the footer in the brand color. The
// signature (left-aligned) and the QR (centered) share one bottom line, never stacked.
export function WaveCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d="M0,848 L0,680 C300,620 700,660 1000,630 C1100,620 1150,650 1200,640 L1200,848 Z" fill={brand.primaryColor} />
        </Svg>
        <Text style={{ position: 'absolute', left: 80, top: 64, color: '#0F172A', fontWeight: 700, fontSize: 23 }}>{brand.issuerName}</Text>
        {brand.issuerTagline ? <Text style={{ position: 'absolute', left: 80, top: 94, color: '#6B7280', fontSize: 11 }}>{brand.issuerTagline}</Text> : null}
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 220, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 278, fontFamily: SERIF, fontWeight: 700, fontSize: 50, color: '#0F172A' }}>{data.traineeName}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 368, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 406, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 452, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 80, bottom: 56, width: 220, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.5)', borderTopStyle: 'solid', paddingTop: 12 }}>
          <Signature signatureImageUrl={brand.signatureImageUrl} signatoryName={brand.signatoryName} color="#fff" />
          <Text style={{ fontSize: 10, color: '#E6F0EE' }}>{brand.signatoryTitle}</Text>
        </View>
        <View style={{ position: 'absolute', left: 568, bottom: 56 }}>
          <VerificationQr dataUrl={data.qrDataUrl} publicId={data.publicId} />
        </View>
        <View style={{ position: 'absolute', right: 70, bottom: 36 }}>
          <GoldSeal size={112} />
        </View>
      </Page>
    </Document>
  );
}
