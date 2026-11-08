import { PortalShell } from "@/components/portal-shell";
import { DriverWorkspace } from "@/components/driver-workspace";
import { requirePortalRole } from "@/lib/server/portal-auth";

export default async function DriverPage() {
  await requirePortalRole("driver");

  return (
    <PortalShell
      role="السائق"
      title="مساحة السائق"
      subtitle="لوحة متابعة حالة العمل والرحلات ومتطلبات اعتماد الحساب."
    >
      <DriverWorkspace />
    </PortalShell>
  );
}
