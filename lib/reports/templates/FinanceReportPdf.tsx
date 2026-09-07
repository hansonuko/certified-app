import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { IssuanceMonthRow, OrgGrowthRow } from '../finance-data';
import type { ManualUsageValues } from '../manual-usage';

// Plain internal document, not a certificate — deliberately not importing
// lib/certificates/fonts.ts/GoldSeal/VerificationQr, none of which apply
// here (CLAUDE.md rule #2 is about certificate/badge surfaces specifically).
// Default Helvetica keeps this independent of any issuer's brand.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#0F172A' },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 9, color: '#6B7280', marginBottom: 20 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 4 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0F172A', paddingBottom: 4, fontWeight: 700 },
  cell: { flex: 1 },
  empty: { color: '#6B7280', fontStyle: 'italic', marginBottom: 8 },
});

export function FinanceReportPdf({
  generatedAt,
  issuance,
  orgGrowth,
  manualUsage,
}: {
  generatedAt: string;
  issuance: IssuanceMonthRow[];
  orgGrowth: OrgGrowthRow[];
  manualUsage: ManualUsageValues;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Certified Africa — Finance Report</Text>
        <Text style={styles.meta}>Generated {generatedAt}</Text>

        <Text style={styles.h2}>Issuance volume by month</Text>
        {issuance.length === 0 ? (
          <Text style={styles.empty}>No certificates issued yet.</Text>
        ) : (
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.cell}>Month</Text>
              <Text style={styles.cell}>Status</Text>
              <Text style={styles.cell}>Count</Text>
            </View>
            {issuance.map((row, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.cell}>{row.issue_month}</Text>
                <Text style={styles.cell}>{row.status}</Text>
                <Text style={styles.cell}>{row.certificate_count}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Organization growth</Text>
        {orgGrowth.length === 0 ? (
          <Text style={styles.empty}>No organizations yet.</Text>
        ) : (
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.cell}>Organization</Text>
              <Text style={styles.cell}>Status</Text>
              <Text style={styles.cell}>Joined</Text>
              <Text style={styles.cell}>Certificates issued</Text>
            </View>
            {orgGrowth.map((row) => (
              <View style={styles.row} key={row.id}>
                <Text style={styles.cell}>{row.name}</Text>
                <Text style={styles.cell}>{row.status}</Text>
                <Text style={styles.cell}>{new Date(row.created_at).toLocaleDateString()}</Text>
                <Text style={styles.cell}>{row.certificates_issued}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Usage snapshot</Text>
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>Metric</Text>
            <Text style={styles.cell}>Used</Text>
            <Text style={styles.cell}>Limit</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Supabase database</Text>
            <Text style={styles.cell}>{manualUsage.supabaseDb ?? 'unavailable'}</Text>
            <Text style={styles.cell}>500 MB</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Supabase storage</Text>
            <Text style={styles.cell}>{manualUsage.supabaseStorage ?? 'unavailable'}</Text>
            <Text style={styles.cell}>1 GB</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Resend emails</Text>
            <Text style={styles.cell}>{manualUsage.resendUsed ?? 'not entered'}</Text>
            <Text style={styles.cell}>{manualUsage.resendLimit ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Upstash commands</Text>
            <Text style={styles.cell}>{manualUsage.upstashUsed ?? 'not entered'}</Text>
            <Text style={styles.cell}>{manualUsage.upstashLimit ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Vercel invocations</Text>
            <Text style={styles.cell}>{manualUsage.vercelUsed ?? 'not entered'}</Text>
            <Text style={styles.cell}>{manualUsage.vercelLimit ?? '—'}</Text>
          </View>
        </View>
        <Text style={{ ...styles.meta, marginTop: 12 }}>
          Resend/Upstash/Vercel figures are staff-entered on /staff/finance (browser-local, not a live reading) — see
          lib/usage/free-tier.ts for why.
        </Text>
      </Page>
    </Document>
  );
}
