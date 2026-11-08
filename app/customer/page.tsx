import { PortalShell } from "@/components/portal-shell";
import { CustomerRideForm } from "@/components/customer-ride-form";

export default function CustomerPage() {
  return <PortalShell role="العميل" title="اطلب رحلتك" subtitle="حدد نقطة الانطلاق والوجهة، واختر السيارة وطريقة الدفع.">
    <CustomerRideForm />
  </PortalShell>;
}
