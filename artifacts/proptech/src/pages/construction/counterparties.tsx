import { useEffect } from "react";
import { useLocation } from "wouter";

/** Единый справочник контрагентов — без дублирования mock-страницы. */
export default function ConstructionCounterparties() {
	const [, setLocation] = useLocation();

	useEffect(() => {
		setLocation("/counterparties");
	}, [setLocation]);

	return (
		<div className="p-6 text-sm text-gray-500">
			Переход в справочник контрагентов…
		</div>
	);
}
