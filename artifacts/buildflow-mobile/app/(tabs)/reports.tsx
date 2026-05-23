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
import { apiFetch, formatCurrency } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface DebtReport {
  totalDebt: string;
  debtorsCount: number;
  items?: { tenantName: string; amount: string; contractId: number }[];
}
interface RentalSummary {
  totalCharged: string;
  totalPaid: string;
  collectionRate: number;
  periodFrom?: string;
  periodTo?: string;
}
interface CashflowReport {
  totalInflow: string;
  totalOutflow: string;
  netFlow: string;
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const to = now.toISOString().split("T")[0];

  const { data: debt, isLoading: ld, refetch: rd } = useQuery({
    queryKey: ["debt-report"],
    queryFn: () => apiFetch<DebtReport>("/reports/debt"),
  });
  const { data: rental, isLoading: lr, refetch: rr } = useQuery({
    queryKey: ["rental-summary", from, to],
    queryFn: () => apiFetch<RentalSummary>(`/reports/rental-summary?from=${from}&to=${to}`),
  });
  const { data: cashflow, isLoading: lc, refetch: rc } = useQuery({
    queryKey: ["cashflow", from, to],
    queryFn: () => apiFetch<CashflowReport>(`/reports/cashflow?from=${from}&to=${to}`),
  });

  const isLoading = ld || lr || lc;
  const onRefresh = () => { rd(); rr(); rc(); };

  if (isLoading) {
    return (
      <View style={[s.container, s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const collRate = rental?.collectionRate ?? 0;
  const netFlow = parseFloat(cashflow?.netFlow ?? "0");

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.dark, paddingTop: topPad + 16 }]}>
        <Text style={s.headerTitle}>Отчёты</Text>
        <Text style={s.headerSub}>Текущий месяц</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: botPad + 20 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ReportCard
          icon="trending-down"
          iconColor="#ef4444"
          iconBg="#fef2f2"
          title="Задолженность"
          colors={colors}
          rows={[
            { label: "Должников", value: String(debt?.debtorsCount ?? 0) },
            { label: "Сумма долга", value: formatCurrency(debt?.totalDebt ?? 0), highlight: true },
          ]}
        />

        <ReportCard
          icon="file-text"
          iconColor="#2563eb"
          iconBg="#eff4ff"
          title="Сводка аренды"
          colors={colors}
          rows={[
            { label: "Начислено", value: formatCurrency(rental?.totalCharged ?? 0) },
            { label: "Оплачено", value: formatCurrency(rental?.totalPaid ?? 0) },
            { label: "Собираемость", value: `${Math.round(collRate)}%`, highlight: true },
          ]}
          footer={
            collRate >= 80 ? { text: "Хорошая собираемость", color: "#16a34a" }
              : collRate >= 50 ? { text: "Средняя собираемость", color: "#ea580c" }
                : { text: "Низкая собираемость", color: "#ef4444" }
          }
        />

        <ReportCard
          icon="activity"
          iconColor={netFlow >= 0 ? "#16a34a" : "#ef4444"}
          iconBg={netFlow >= 0 ? "#f0fdf4" : "#fef2f2"}
          title="Денежный поток"
          colors={colors}
          rows={[
            { label: "Поступления", value: formatCurrency(cashflow?.totalInflow ?? 0) },
            { label: "Расходы", value: formatCurrency(cashflow?.totalOutflow ?? 0) },
            {
              label: "Чистый поток",
              value: formatCurrency(cashflow?.netFlow ?? 0),
              highlight: true,
              valueColor: netFlow >= 0 ? "#16a34a" : "#ef4444",
            },
          ]}
        />

        {(debt?.items ?? []).length > 0 && (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Должники</Text>
            {(debt!.items!).slice(0, 5).map((item, i) => (
              <View key={i} style={[s.debtRow, { borderTopColor: colors.border }]}>
                <Text style={[s.debtName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.tenantName}
                </Text>
                <Text style={[s.debtAmount, { color: "#ef4444" }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ReportCard({
  icon, iconColor, iconBg, title, rows, footer, colors,
}: {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  rows: { label: string; value: string; highlight?: boolean; valueColor?: string }[];
  footer?: { text: string; color: string };
  colors: any;
}) {
  return (
    <View style={[rc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={rc.topRow}>
        <View style={[rc.iconBox, { backgroundColor: iconBg }]}>
          <Feather name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={[rc.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={[rc.row, { borderTopColor: colors.border }]}>
          <Text style={[rc.label, { color: colors.mutedForeground }]}>{row.label}</Text>
          <Text
            style={[
              rc.value,
              { color: row.valueColor ?? (row.highlight ? colors.foreground : colors.foreground) },
              row.highlight && rc.valueBold,
            ]}
          >
            {row.value}
          </Text>
        </View>
      ))}
      {footer && (
        <View style={[rc.footer, { backgroundColor: `${footer.color}14` }]}>
          <Text style={[rc.footerText, { color: footer.color }]}>{footer.text}</Text>
        </View>
      )}
    </View>
  );
}

const rc = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderTopWidth: 1 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  valueBold: { fontSize: 15, fontFamily: "Inter_700Bold" },
  footer: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  footerText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8da3ba", marginTop: 4 },
  content: { padding: 16, paddingTop: 20 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  debtRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 8, borderTopWidth: 1,
  },
  debtName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  debtAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
