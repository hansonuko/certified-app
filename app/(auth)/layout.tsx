import { PublicShell } from '@/components/PublicShell';

// callback/route.ts is a route handler (no JSX), so it's unaffected by this
// layout — only apply/, apply/status/, login/, and signup/ render inside it.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
