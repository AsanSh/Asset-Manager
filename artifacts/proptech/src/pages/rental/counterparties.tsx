import { CounterpartyDirectory } from "@/components/counterparty-directory";

export default function RentalCounterparties() {
	return (
		<CounterpartyDirectory
			title="Контрагенты · Аренда"
			subtitle="Арендаторы и собственники объектов аренды"
			allowedRoles={["tenant", "landlord"]}
			defaultRole="tenant"
			showRoleTabs
		/>
	);
}
