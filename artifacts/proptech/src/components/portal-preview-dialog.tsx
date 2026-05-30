import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ContractorPortal from "@/pages/portal/contractor";
import SupplierPortal from "@/pages/portal/supplier";
import TenantPortal from "@/pages/portal/tenant";
import BuyerPortal from "@/pages/portal/buyer";

export type PortalPreviewType = "contractor" | "supplier" | "tenant" | "buyer";

export function PortalPreviewDialog({
	type,
	id,
	open,
	onClose,
}: {
	type: PortalPreviewType;
	id: number;
	open: boolean;
	onClose: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto p-0 gap-0">
				<DialogTitle className="sr-only">Предпросмотр портала</DialogTitle>
				{open && type === "contractor" && (
					<ContractorPortal previewContractorId={id} />
				)}
				{open && type === "supplier" && (
					<SupplierPortal previewSupplierId={id} />
				)}
				{open && type === "tenant" && <TenantPortal previewTenantId={id} />}
				{open && type === "buyer" && <BuyerPortal previewBuyerId={id} />}
			</DialogContent>
		</Dialog>
	);
}
