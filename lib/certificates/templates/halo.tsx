import React from 'react';
import { Document, Page, View, Text, Svg, Circle } from '@react-pdf/renderer';
import '../fonts';
import { SERIF, SANS } from '../fonts';
import { GoldSeal } from '../GoldSeal';
import { VerificationQr } from '../VerificationQr';
import { Signature } from '../Signature';
import { IssuerLogo } from '../IssuerLogo';
import { PAGE_WIDTH, PAGE_HEIGHT, TemplateProps } from '../types';

const meta = (d: TemplateProps['data']) => [d.durationLabel, d.dateRangeLabel, d.distinction].filter(Boolean).join('   ·   ');

// "Halo" (T15) — quietest of the ten: a faint gold ring echoes the seal into the
// background, plus a dashed perimeter. Deliberately not brand-color-driven — the
// halo nods at the seal, so it stays gold regardless of the issuer's own color.
export function HaloCertificate({ brand, data }: TemplateProps) {
  return (
    <Document>
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={{ fontFamily: SANS, backgroundColor: '#FCFBF7' }}>
        <View style={{ position: 'absolute', left: 24, top: 24, right: 24, bottom: 24, borderWidth: 1, borderColor: 'rgba(201,153,46,0.4)', borderStyle: 'dashed' }} />
        <Svg width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Circle cx={1090} cy={770} r={220} fill="none" stroke="#C9992E" strokeWidth={1} opacity={0.35} />
          <Circle cx={1090} cy={770} r={280} fill="none" stroke="#C9992E" strokeWidth={1} opacity={0.18} />
        </Svg>
        {brand.logoUrl ? (
          <View style={{ position: 'absolute', left: PAGE_WIDTH / 2 - 14, top: 40 }}>
            <IssuerLogo logoUrl={brand.logoUrl} size={28} />
          </View>
        ) : null}
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 76, fontWeight: 700, fontSize: 21, color: '#0F172A' }}>{brand.issuerName}</Text>
        {brand.issuerTagline ? <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 106, color: '#6B7280', fontSize: 11 }}>{brand.issuerTagline}</Text> : null}
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 210, color: '#0F2340', fontSize: 19, fontWeight: 700 }}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 266, fontFamily: SERIF, fontWeight: 700, fontSize: 52, color: '#0F172A' }}>{data.traineeName}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 360, color: '#374151', fontSize: 15 }}>has successfully completed the training program</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 398, fontFamily: SERIF, fontWeight: 700, fontSize: 26, color: '#0F172A' }}>{data.programTitle}</Text>
        <Text style={{ position: 'absolute', left: 0, width: PAGE_WIDTH, textAlign: 'center', top: 444, color: '#6B7280', fontSize: 12 }}>{meta(data)}</Text>
        <View style={{ position: 'absolute', left: 96, bottom: 150, width: 220, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderTopStyle: 'solid', paddingTop: 12 }}>
          <Signature signatureImageUrl={brand.signatureImageUrl} signatoryName={brand.signatoryName} />
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{brand.signatoryTitle}</Text>
        </View>
        <View style={{ position: 'absolute', left: 568, bottom: 56 }}>
          <VerificationQr dataUrl={data.qrDataUrl} publicId={data.publicId} />
        </View>
        <View style={{ position: 'absolute', right: 96, bottom: 60 }}>
          <GoldSeal size={112} />
        </View>
      </Page>
    </Document>
  );
}
