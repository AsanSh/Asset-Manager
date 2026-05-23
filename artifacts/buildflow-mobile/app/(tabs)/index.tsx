import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth";
import { apiFetch, formatCurrency } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface Property { id: number; status: string; name: string; }
interface Tenant { id: number; status: string; }
interface Accrual {
  id: number;
  month: string;
  amount: string;
  balance: string;
  status: string;
}
interface DebtReport { totalDebt: string; debtorsCount: number; }

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: properties, isLoading: lp, refetch: rp } = useQuery({
    queryKey: ["properties"],
    queryFn: () => apiFetch<Property[]>("/properties"),
    enabled: !!user,
  });
  const { data: tenants, isLoading: lt, refetch: rt } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => apiFetch<Tenant[]>("/rental/tenants"),
    enabled: !!user,
  });
  const { data: accruals, isLoading: la, refetch: ra } = useQuery({
    queryKey: ["accruals-pending"],
    queryFn: () => apiFetch<Accrual[]>("/rental/accruals?status=pending"),
    enabled: !!user,
  });
  const { data: debt, isLoading: ld, refetch: rd } = useQuery({
    queryKey: ["debt"],
    queryFn: () => apiFetch<DebtReport>("/reports/debt"),
    enabled: !!user,
  });

  const isLoading = lp || lt || la || ld;
  const onRefresh = () => { rp(); rt(); ra(); rd(); };

  const totalPending = (accruals ?? []).reduce(
    (sum, a) => sum + parseFloat(a.balance || "0"),
    0,
  );

  const s = makeStyles(colors, insets);
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
  const firstName = user?.firstName ?? "";

  if (isLoading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const pending = (accruals ?? []).slice(0, 5);
  const activeTenants = (tenants ?? []).filter(t => (t as any).status === "active").length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.headerDate}>{today}</Text>
          <Text style={s.headerGreeting}>Привет, {firstName}</Text>
        </View>
        <View style={s.badgeWrap}>
          <View style={s.badge}>
            <Text style={s.badgeText}>KGS</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionLabel}>Обзор</Text>
        <View style={s.grid}>
          <StatCard
            icon="home"
            iconBg="#eff4ff"
            iconColor="#2563eb"
            value={String(properties?.length ?? 0)}
            label="Объектов"
            sub={`${(properties ?? []).filter(p => p.status === "available").length} свободно`}
            colors={colors}
          />
          <StatCard
            icon="users"
            iconBg="#f0fdf4"
            iconColor="#16a34a"
            value={String(tenants?.length ?? 0)}
            label="Арендаторов"
            sub={`${activeTenants} активных`}
            colors={colors}
          />
          <StatCard
            icon="clock"
            iconBg="#fff7ed"
            iconColor="#ea580c"
            value={formatCurrency(totalPending)}
            label="Ожидает оплаты"
            sub={`${accruals?.length ?? 0} начислений`}
            colors={colors}
          />
          <StatCard
            icon="trending-down"
            iconBg="#fef2f2"
            iconColor="#ef4444"
            value={formatCurrency(debt?.totalDebt ?? 0)}
            label="Задолженность"
            sub={`${debt?.debtorsCount ?? 0} должников`}
            colors={colors}
          />
        </View>

        <Text style={s.sectionLabel}>Ожидают оплаты</Text>
        {pending.length === 0 ? (
          <View style={s.emptyWrap}>
            <Feather name="check-circle" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>Нет ожидающих начислений</Text>
          </View>
        ) : (
          pending.map(a => (
            <View key={a.id} style={s.accrualRow}>
              <View style={s.accrualDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.accrualId}>Начисление #{a.id}</Text>
                <Text style={s.accrualMonth}>{a.month}</Text>
              </View>
              <Text style={s.accrualBalance}>{formatCurrency(a.balance)}</Text>
            </View>
          ))
        )}
        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon, iconBg, iconColor, value, label, sub, colors,
}: {
  icon: string; iconBg: string; iconColor: string;
  value: string; label: string; sub: string; colors: any;
}) {
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[cardStyles.iconBox, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <Text style={[cardStyles.value, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
      <Text style={[cardStyles.label, { color: colors.foreground }]}>{label}</Text>
      <Text style={[cardStyles.sub, { color: colors.mutedForeground }]}>{sub}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: "45%", borderRadius: 16,
    padding: 16, borderWidth: 1,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  value: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});

function makeStyles(colors: any, insets: any) {
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },
    header: {
      backgroundColor: colors.dark,
      paddingTop: topPad + 16,
      paddingBottom: 24,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    headerDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8da3ba", marginBottom: 4 },
    headerGreeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff" },
    badgeWrap: {},
    badge: {
      backgroundColor: "#2563eb22",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "#2563eb44",
    },
    badgeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#60a5fa" },
    content: { padding: 16, paddingTop: 20 },
    sectionLabel: {
      fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12, marginTop: 4,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
    accrualRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.card, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: colors.border, marginBottom: 8,
    },
    accrualDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ea580c" },
    accrualId: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    accrualMonth: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    accrualBalance: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#ef4444" },
    emptyWrap: { alignItems: "center", paddingVertical: 32, gap: 10 },
    emptyText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  });
}
