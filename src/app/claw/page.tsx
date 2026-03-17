'use client';

import ClawChat from '@/components/ClawChat';
import { useFixedSiderWidth } from '@/components/Index';

export default function ClawPage() {
  const { width } = useFixedSiderWidth();
  return <ClawChat siderWidth={width} />;
}