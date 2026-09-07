import { PageTransition } from '@/components/marketing/PageTransition';

export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
