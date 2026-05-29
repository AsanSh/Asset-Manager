import { CounterpartyDirectory } from "@/components/counterparty-directory";

export default function CrmCounterparties() {
	return (
		<CounterpartyDirectory
			title="Контрагенты · CRM"
			subtitle="Покупатели, лиды и продавцы"
			allowedRoles={["buyer", "lead", "seller"]}
			defaultRole="buyer"
			showRoleTabs
		/>
	);
}
