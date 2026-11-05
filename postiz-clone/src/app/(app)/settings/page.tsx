import { Suspense } from "react";
import { SettingsView } from "@/components/app/Settings";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsView />
    </Suspense>
  );
}
