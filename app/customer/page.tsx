import { PortalShell } from "@/components/portal-shell";
import { CustomerRideForm } from "@/components/customer-ride-form";
import { requirePortalRole } from "@/lib/server/portal-auth";

export default async function CustomerPage() {
  await requirePortalRole("customer");

  return (
    <PortalShell
      role="العميل"
      title="اطلب رحلتك"
      subtitle="حدد نقطة الانطلاق والوجهة، واختر السيارة وطريقة الدفع."
    >
      <CustomerRideForm />
    </PortalShell>
  );
}
