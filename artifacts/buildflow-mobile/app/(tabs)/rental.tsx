import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, formatCurrency, formatDate } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface Tenant {
  id: number;
  name: string;
  phone?: string;
  status: string;
  email?: string;
}
interface Accrual {
  id: number;
  month: string;
  amount: string;
  balance: string;
  status: string;
  dueDate?: string;
  leaseContractId: number;
}
interface Payment {
  id: number;
  amount: string;
  paymentDate: string;
  method?: string;
  note?: string;
}

const TENANT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Активен", color: "#16a34a", bg: "#f0fdf4" },
  inactive: { label: "Неактивен", color: "#6c7a8d", bg: "#f4f7fb" },
};
const ACCRUAL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Ожидает", color: "#ea580c", bg: "#fff7ed" },
  partial: { label: "Частично", color: "#2563eb", bg: "#eff4ff" },
  paid: { label: "Оплачено", color: "#16a34a", bg: "#f0fdf4" },
  cancelled: { label: "Отменено", color: "#6c7a8d", bg: "#f4f7fb" },
};

const TABS = ["Арендаторы", "Начисления", "Платежи"] as const;
type TabName = typeof TABS[number];

export default function RentalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabName>("Арендаторы");

  const { data: tenants, isLoading: lt, refetch: rt } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => apiFetch<Tenant[]>("/rental/tenants"),
    enabled: true,
  });
  const { data: accruals, isLoading: la, refetch: ra } = useQuery({
    queryKey: ["accruals"],
    queryFn: () => apiFetch<Accrual[]>("/rental/accruals"),
    enabled: true,
  });
  const { data: payments, isLoading: lp, refetch: rp } = useQuery({
    queryKey: ["payments"],
    queryFn: () => apiFetch<Payment[]>("/rental/payments"),
    enabled: true,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isLoading = (tab === "Арендаторы" && lt) || (tab === "Начисления" && la) || (tab === "Платежи" && lp);
  const onRefresh = () => { rt(); ra(); rp(); };

  const renderTenant = ({ item }: { item: Tenant }) => {
    const st = TENANT_STATUS[item.status] ?? TENANT_STATUS.inactive;
    return (
      <View style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[s.avatarText, { color: colors.primary }]}>
            {(item.name ?? "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.rowTitle, { color: colors.foreground }]}>{item.name}</Text>
          {item.phone && <Text style={[s.rowSub, { color: colors.mutedForeground }]}>{item.phone}</Text>}
        </View>
        <View style={[s.pill, { backgroundColor: st.bg }]}>
          <Text style={[s.pillText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
    );
  };

  const renderAccrual = ({ item }: { item: Accrual }) => {
    const st = ACCRUAL_STATUS[item.status] ?? ACCRUAL_STATUS.pending;
    return (
      <View style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.accrualIcon, { backgroundColor: st.bg }]}>
          <Feather name="file-text" size={16} color={st.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.rowTitle, { color: colors.foreground }]}>Начисление #{item.id}</Text>
          <Text style={[s.rowSub, { color: colors.mutedForeground }]}>
            {item.month}{item.dueDate ? ` · до ${formatDate(item.dueDate)}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={[s.amount, { color: item.status === "paid" ? "#16a34a" : "#ef4444" }]}>
            {formatCurrency(item.balance)}
          </Text>
          <View style={[s.pill, { backgroundColor: st.bg }]}>
            <Text style={[s.pillText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPayment = ({ item }: { item: Payment }) => (
    <View style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.accrualIcon, { backgroundColor: "#f0fdf4" }]}>
        <Feather name="credit-card" size={16} color="#16a34a" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, { color: colors.foreground }]}>Платёж #{item.id}</Text>
        <Text style={[s.rowSub, { color: colors.mutedForeground }]}>
          {formatDate(item.paymentDate)}{item.method ? ` · ${item.method}` : ""}
        </Text>
        {item.note && <Text style={[s.rowSub, { color: colors.mutedForeground }]}>{item.note}</Text>}
      </View>
      <Text style={[s.amount, { color: "#16a34a" }]}>{formatCurrency(item.amount)}</Text>
    </View>
  );

  const listData = tab === "Арендаторы" ? tenants : tab === "Начисления" ? accruals : payments;
  const renderItem = tab === "Арендаторы" ? renderTenant : tab === "Начисления" ? renderAccrual : renderPayment as any;
  const emptyIcon = tab === "Арендаторы" ? "users" : tab === "Начисления" ? "file-text" : "credit-card";
  const emptyText = tab === "Арендаторы" ? "Нет арендаторов" : tab === "Начисления" ? "Нет начислений" : "Нет платежей";

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.dark, paddingTop: topPad + 16 }]}>
        <Text style={s.headerTitle}>Аренда</Text>
        <View style={s.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, tab === t && s.tabBtnActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={listData as any[]}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[s.listContent, { paddingBottom: botPad + 20 }]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Feather name={emptyIcon as any} size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>{emptyText}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 16 },
  tabs: { flexDirection: "row", gap: 4 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, backgroundColor: "transparent",
  },
  tabBtnActive: { backgroundColor: "#2563eb22" },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#8da3ba" },
  tabTextActive: { color: "#60a5fa", fontFamily: "Inter_600SemiBold" },
  listContent: { padding: 16 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  accrualIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyWrap: { alignItems: "center", paddingTop: 64, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
