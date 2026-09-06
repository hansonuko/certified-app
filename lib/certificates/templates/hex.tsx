import React from 'react';
import { Document, Page, View, Text, Svg, Polygon } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Hex" (T10) — hexagon motif, top-right corner, technical feel. Left-aligned body.
export function HexCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Polygon points="1200,-40 1050,60 1050,220 1200,320 1300,220 1300,60" fill={brand.primaryColor} opacity={0.08} />
          <Polygon points="1000,0 900,60 900,180 1000,240 1100,180 1100,60" fill="none" stroke={brand.primaryColor} strokeWidth={2} />
        </Svg>
        <Text style={{ position: 'absolute', left: 80, top: 64, color: '#0F172A', fontWeight: 700, fontSize: 23 }}>{brand.issuerName}</Text>
        {brand.issuerTagline ? <Text style={{ position: 'absolute', left: 80, top: 94, color: '#6B7280', fontSize: 11 }}>{brand.issuerTagline}</Text> : null}
        <Text style={{ position: 'absolute', left: 80, top: 220, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 80, top: 264, fontFamily: SERIF, fontWeight: 700, fontSize: 52, color: '#0F172A' }}>{data.traineeName}</Text>
        <View style={{ position: 'absolute', left: 80, top: 352, width: 230, height: 3, backgroundColor: brand.primaryColor }} />
        <Text style={{ position: 'absolute', left: 80, top: 388, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 80, top: 426, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 80, top: 472, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
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
