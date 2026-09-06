import React from 'react';
import { Document, Page, View, Text, Svg, Polygon } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { IssuerLogo } from '../IssuerLogo';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Split" (T11) — mirrored diagonal corners, top-left + bottom-right, centered content.
export function SplitCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS }}>
        <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Polygon points="0,0 220,0 0,140" fill={brand.primaryColor} />
          <Polygon points="1200,848 980,848 1200,708" fill={brand.primaryColor} />
        </Svg>
        {brand.logoUrl ? (
          <View style={{ position: 'absolute', left: PAGE_WIDTH / 2 - 16, top: 44 }}>
            <IssuerLogo logoUrl={brand.logoUrl} size={32} />
          </View>
        ) : null}
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 80, fontWeight: 700, fontSize: 21, color: '#0F172A' }}>{brand.issuerName}</Text>
        {brand.issuerTagline ? <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 110, color: '#6B7280', fontSize: 11 }}>{brand.issuerTagline}</Text> : null}
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 196, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 252, fontFamily: SERIF, fontWeight: 700, fontSize: 50, color: '#0F172A' }}>{data.traineeName}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 344, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 382, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 428, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 96, bottom: 150, width: 220, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderTopStyle: 'solid', paddingTop: 12 }}>
          <Signature signatureImageUrl={brand.signatureImageUrl} signatoryName={brand.signatoryName} />
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{brand.signatoryTitle}</Text>
        </View>
        <View style={{ position: 'absolute', left: 568, bottom: 56 }}>
          <VerificationQr dataUrl={data.qrDataUrl} publicId={data.publicId} />
        </View>
        <View style={{ position: 'absolute', right: 170, bottom: 130 }}>
          <GoldSeal size={112} />
        </View>
      </Page>
    </Document>
  );
}
