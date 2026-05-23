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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, formatCurrency } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface Property {
  id: number;
  name: string;
  type: string;
  status: string;
  projectName?: string;
  floor?: number;
  area?: string;
  price?: string;
  block?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: "Свободна", color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
  rented: { label: "Занята", color: "#2563eb", bg: "#eff4ff", dot: "#3b82f6" },
  reserved: { label: "Бронь", color: "#ea580c", bg: "#fff7ed", dot: "#f97316" },
  sold: { label: "Продана", color: "#6c7a8d", bg: "#f4f7fb", dot: "#9aa5b4" },
};

const TYPE_LABELS: Record<string, string> = {
  apartment: "Квартира",
  office: "Офис",
  commercial: "Коммерч.",
  parking: "Паркинг",
  storage: "Склад",
};

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "available", label: "Свободна" },
  { key: "rented", label: "Занята" },
  { key: "reserved", label: "Бронь" },
] as const;

export default function PropertiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: properties, isLoading, refetch } = useQuery({
    queryKey: ["properties"],
    queryFn: () => apiFetch<Property[]>("/properties"),
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = (properties ?? []).filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.projectName ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const renderProperty = ({ item: p }: { item: Property }) => {
    const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.available;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.cardTop}>
          <View style={s.cardTitleRow}>
            <View style={[s.dot, { backgroundColor: st.dot }]} />
            <Text style={[s.cardTitle, { color: colors.foreground }]}>{p.name}</Text>
          </View>
          <View style={[s.pill, { backgroundColor: st.bg }]}>
            <Text style={[s.pillText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <View style={s.cardMeta}>
          {p.projectName && (
            <MetaChip icon="map-pin" label={p.projectName} colors={colors} />
          )}
          {p.type && (
            <MetaChip icon="grid" label={TYPE_LABELS[p.type] ?? p.type} colors={colors} />
          )}
          {p.floor != null && (
            <MetaChip icon="layers" label={`${p.floor} эт.`} colors={colors} />
          )}
          {p.area && (
            <MetaChip icon="maximize-2" label={`${p.area} м²`} colors={colors} />
          )}
        </View>
        {p.price && (
          <Text style={[s.price, { color: colors.primary }]}>
            {formatCurrency(p.price)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.dark, paddingTop: topPad + 16 }]}>
        <Text style={s.headerTitle}>Объекты</Text>
        <View style={[s.searchWrap, { backgroundColor: "#ffffff14", borderColor: "#ffffff22" }]}>
          <Feather name="search" size={15} color="#8da3ba" />
          <TextInput
            style={s.searchInput}
            placeholder="Поиск..."
            placeholderTextColor="#8da3ba"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color="#8da3ba" />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterBtn, filter === f.key && s.filterBtnActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
                {f.label}
              </Text>
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
          data={filtered}
          keyExtractor={p => String(p.id)}
          renderItem={renderProperty}
          contentContainerStyle={[s.list, { paddingBottom: botPad + 20 }]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Feather name="home" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Объекты не найдены</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function MetaChip({ icon, label, colors }: { icon: string; label: string; colors: any }) {
  return (
    <View style={[chipS.chip, { backgroundColor: colors.muted }]}>
      <Feather name={icon as any} size={11} color={colors.mutedForeground} />
      <Text style={[chipS.text, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const chipS = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontSize: 11, fontFamily: "Inter_500Medium" },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff", marginBottom: 12 },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffff", height: 20 },
  filters: { flexDirection: "row", gap: 6, paddingBottom: 4 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  filterBtnActive: { backgroundColor: "#2563eb" },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#8da3ba" },
  filterTextActive: { color: "#ffffff", fontFamily: "Inter_600SemiBold" },
  list: { padding: 16 },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  price: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
  emptyWrap: { alignItems: "center", paddingTop: 64, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
