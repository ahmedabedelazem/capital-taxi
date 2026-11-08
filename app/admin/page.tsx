import { PortalShell } from "@/components/portal-shell";
import { AdminWorkspace } from "@/components/admin-workspace";
import { requirePortalRole } from "@/lib/server/portal-auth";

export default async function AdminPage() {
  await requirePortalRole("admin");

  return (
    <PortalShell
      role="الإدارة"
      title="مركز التحكم"
      subtitle="مركز إدارة العملاء والسائقين والرحلات والتسعير والدعم."
    >
      <AdminWorkspace />
    </PortalShell>
  );
}
