import { CounterpartyDirectory } from "@/components/counterparty-directory";

export default function ConstructionCounterparties() {
	return (
		<CounterpartyDirectory
			title="Контрагенты · Контроль строительства"
			subtitle="Подрядчики и поставщики услуг для проектов строительства"
			allowedRoles={["service_provider", "subcontractor"]}
			defaultRole="service_provider"
			showRoleTabs
		/>
	);
}
