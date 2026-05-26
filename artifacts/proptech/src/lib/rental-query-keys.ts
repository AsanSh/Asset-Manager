/** Centralized TanStack Query keys for rental module (api-client + local endpoints). */
export {
	getListAccrualsQueryKey,
	getListExpensesQueryKey,
	getListLeaseContractsQueryKey,
	getListPaymentsQueryKey,
	getListRentalPropertiesQueryKey,
	getListTenantsQueryKey,
} from "@/api-client";

/** Not yet in Orval spec — stable key for rental bank accounts. */
export const getRentalAccountsQueryKey = () => ["/rental/accounts"] as const;

export const getDistributionsQueryKey = () => ["/rental/distributions"] as const;

export const getAccrualsOpenQueryKey = (leaseContractId: number | string) =>
	["accruals-open", leaseContractId] as const;

/** Analytics pages — aggregated fetches. */
export const getRentalPaymentsAllQueryKey = () => ["/rental/payments", "all"] as const;
export const getRentalExpensesAllQueryKey = () => ["/rental/expenses", "all"] as const;
