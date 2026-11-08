import { DriverApplicationForm } from "@/components/driver-application-form";
import { PortalShell } from "@/components/portal-shell";
import { requirePortalRole } from "@/lib/server/portal-auth";

export default async function DriverApplicationPage() {
  await requirePortalRole("customer");

  return (
    <PortalShell
      role="انضم كسائق"
      title="ابدأ رحلتك مع تاكسي العاصمة"
      subtitle="قدّم بياناتك وتابع حالة طلب الانضمام من مكان واحد."
    >
      <DriverApplicationForm />
    </PortalShell>
  );
}
