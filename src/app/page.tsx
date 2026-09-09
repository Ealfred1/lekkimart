"use client";

import { CredentialsGate } from "@/components/CredentialsGate";
import { Wizard } from "@/components/Wizard";
import { useCredentialsStore } from "@/lib/store";

export default function Home() {
  const credentials = useCredentialsStore((s) => s.credentials);
  const hasHydrated = useCredentialsStore((s) => s.hasHydrated);

  if (!hasHydrated) return null;
  return credentials ? <Wizard /> : <CredentialsGate />;
}
