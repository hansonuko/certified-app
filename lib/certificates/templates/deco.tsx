import React from 'react';
import { Document, Page, View, Text, Svg, Rect, G } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Deco" (T14) — stepped geometric corner accents, both top corners, centered content.
export function DecoCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <G fill={brand.primaryColor}>
            <Rect x={0} y={0} width={180} height={12} />
            <Rect x={0} y={16} width={140} height={12} />
            <Rect x={0} y={32} width={100} height={12} />
            <Rect x={1020} y={0} width={180} height={12} />
            <Rect x={1060} y={16} width={140} height={12} />
            <Rect x={1100} y={32} width={100} height={12} />
          </G>
        </Svg>
        <Text style={{ position: 'absolute', left: 80, top: 80, color: '#0F172A', fontWeight: 700, fontSize: 23 }}>{brand.issuerName}</Text>
        {brand.issuerTagline ? <Text style={{ position: 'absolute', left: 80, top: 110, color: '#6B7280', fontSize: 11 }}>{brand.issuerTagline}</Text> : null}
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 236, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 280, fontFamily: SERIF, fontWeight: 700, fontSize: 50, color: '#0F172A' }}>{data.traineeName}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 370, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 408, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 454, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 80, bottom: 150, width: 220, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderTopStyle: 'solid', paddingTop: 12 }}>
          <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: '#0F172A' }}>{brand.signatoryName}</Text>
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
