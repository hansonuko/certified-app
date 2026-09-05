import React from 'react';
import { View, Image, Text } from '@react-pdf/renderer';

/**
 * Verification QR + public ID (docs/design-system.md §4, §5). `dataUrl` is whatever
 * the `qrcode` package produced server-side at issuance (a data: URL or a stored
 * image URL) — this component never generates the QR itself, it only renders it.
 */
export function VerificationQr({ dataUrl, publicId }: { dataUrl: string; publicId: string }) {
  return (
    <View>
      <Image src={dataUrl} style={{ width: 64, height: 64, borderWidth: 1, borderColor: '#D7DCE3' }} />
      <Text style={{ fontFamily: 'Courier', fontSize: 8, color: '#6B7280', marginTop: 6 }}>{publicId}</Text>
    </View>
  );
}
