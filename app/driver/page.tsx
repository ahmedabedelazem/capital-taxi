import { PortalShell } from "@/components/portal-shell";
import { DriverWorkspace } from "@/components/driver-workspace";

export default function DriverPage() {
  return <PortalShell role="السائق" title="مساحة السائق" subtitle="لوحة متابعة حالة العمل والرحلات ومتطلبات اعتماد الحساب.">
    <DriverWorkspace />
  </PortalShell>;
}
