import React from 'react';
import { Document, Page, View, Text, Svg, Polygon } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Ribbon" (T05) — folded corner ribbon (enlarged so the full issuer name always fits
// inside the color, never crossing onto the white background), everything else centered.
export function RibbonCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Polygon points="0,0 340,0 0,220" fill={brand.primaryColor} />
          <Polygon points="0,220 0,190 30,220" fill={brand.primaryColor} opacity={0.6} />
        </Svg>
        <Text style={{ position: 'absolute', left: 56, top: 52, width: 250, color: '#fff', fontWeight: 700, fontSize: 21 }}>{brand.issuerName}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 250, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 294, fontFamily: SERIF, fontWeight: 700, fontSize: 52, color: '#0F172A' }}>{data.traineeName}</Text>
        <View style={{ position: 'absolute', left: (PAGE_WIDTH - 230) / 2, top: 378, width: 230, height: 3, backgroundColor: brand.primaryColor }} />
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 408, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 446, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 492, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 80, bottom: 56, width: 220, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderTopStyle: 'solid', paddingTop: 12 }}>
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
