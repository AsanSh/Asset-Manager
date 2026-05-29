import { CounterpartyDirectory } from "@/components/counterparty-directory";

export default function WarehouseCounterparties() {
	return (
		<CounterpartyDirectory
			title="Контрагенты · Закуп / Склад"
			subtitle="Поставщики материалов для склада"
			allowedRoles={["material_supplier"]}
			defaultRole="material_supplier"
		/>
	);
}
