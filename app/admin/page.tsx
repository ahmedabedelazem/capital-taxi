import { PortalShell } from "@/components/portal-shell";
import { AdminWorkspace } from "@/components/admin-workspace";

export default function AdminPage() {
  return <PortalShell role="الإدارة" title="مركز التحكم" subtitle="مركز إدارة العملاء والسائقين والرحلات والتسعير والدعم.">
    <AdminWorkspace />
  </PortalShell>;
}
