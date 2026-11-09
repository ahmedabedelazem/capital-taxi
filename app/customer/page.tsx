import { PortalShell } from "@/components/portal-shell";
import { CustomerRideForm } from "@/components/customer-ride-form";
import { requirePortalRole } from "@/lib/server/portal-auth";

export default async function CustomerPage() {
  await requirePortalRole("customer");

  return (
    <PortalShell
      role="العميل"
      title="إلى أين نذهب؟"
      subtitle="حدد مكان الانطلاق والوجهة، اختر فئة السيارة، وراجع تقدير الرحلة قبل تأكيد الطلب. الدفع النقدي متاح حالياً."
    >
      <CustomerRideForm />
    </PortalShell>
  );
}
