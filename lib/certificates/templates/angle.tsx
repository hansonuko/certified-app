import React from 'react';
import { Document, Page, View, Text, Svg, Polygon } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Angle" (T01) — diagonal brand-color block down the left edge, content right-aligned.
export function AngleCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Polygon points="0,0 340,0 190,848 0,848" fill={brand.primaryColor} />
        </Svg>
        <View style={{ position: 'absolute', left: 56, top: 56, width: 40, height: 40, backgroundColor: '#C9992E' }} />
        <Text style={{ position: 'absolute', left: 56, top: 118, color: '#fff', fontWeight: 700, fontSize: 23 }}>{brand.issuerName}</Text>
        {brand.issuerTagline ? (
          <Text style={{ position: 'absolute', left: 56, top: 154, width: 220, color: '#D9E0EA', fontSize: 10, lineHeight: 1.5 }}>{brand.issuerTagline}</Text>
        ) : null}
        <Text style={{ position: 'absolute', right: 80, width: 640, textAlign: 'right', top: 100, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', right: 80, width: 640, textAlign: 'right', top: 200, fontFamily: SERIF, fontWeight: 700, fontSize: 52, color: '#0F172A' }}>{data.traineeName}</Text>
        <View style={{ position: 'absolute', right: 80, top: 288, width: 230, height: 3, backgroundColor: '#C9992E' }} />
        <Text style={{ position: 'absolute', right: 80, width: 640, textAlign: 'right', top: 320, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', right: 80, width: 640, textAlign: 'right', top: 360, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F2340' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', right: 80, width: 640, textAlign: 'right', top: 406, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 230, bottom: 150, width: 200, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderTopStyle: 'solid', paddingTop: 12 }}>
          <Signature signatureImageUrl={brand.signatureImageUrl} signatoryName={brand.signatoryName} />
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{brand.signatoryTitle}</Text>
        </View>
        <View style={{ position: 'absolute', left: 600, bottom: 56 }}>
          <VerificationQr dataUrl={data.qrDataUrl} publicId={data.publicId} />
        </View>
        <View style={{ position: 'absolute', right: 64, bottom: 52 }}>
          <GoldSeal size={112} />
        </View>
      </Page>
    </Document>
  );
}
