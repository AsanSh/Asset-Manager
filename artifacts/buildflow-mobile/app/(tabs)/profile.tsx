import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogout = () => {
    Alert.alert(
      "Выйти из аккаунта",
      "Вы уверены, что хотите выйти?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await logout();
              router.replace("/(auth)/login");
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "U";
  const isAdmin = user?.role === "admin";

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.dark, paddingTop: topPad + 16 }]}>
        <Text style={s.headerTitle}>Профиль</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.userCard, { backgroundColor: colors.dark }]}>
          <View style={s.avatarOuter}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={s.userName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <View style={[s.roleBadge, isAdmin ? s.roleBadgeAdmin : s.roleBadgeUser]}>
            <Feather name="shield" size={11} color={isAdmin ? "#60a5fa" : "#8da3ba"} />
            <Text style={[s.roleText, isAdmin ? s.roleTextAdmin : s.roleTextUser]}>
              {isAdmin ? "Администратор" : "Сотрудник"}
            </Text>
          </View>
        </View>

        {user?.company && (
          <Section title="Организация" colors={colors}>
            <InfoRow icon="home" label="Название" value={user.company.name} colors={colors} />
            {user.company.phone && (
              <InfoRow icon="phone" label="Телефон" value={user.company.phone} colors={colors} />
            )}
            {user.company.email && (
              <InfoRow icon="mail" label="Email" value={user.company.email} colors={colors} />
            )}
          </Section>
        )}

        <Section title="Аккаунт" colors={colors}>
          <InfoRow icon="user" label="Имя" value={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`} colors={colors} />
          <InfoRow icon="mail" label="Email" value={user?.email ?? ""} colors={colors} />
          <InfoRow icon="shield" label="Роль" value={isAdmin ? "Администратор" : "Сотрудник"} colors={colors} />
        </Section>

        <TouchableOpacity
          style={[s.logoutBtn, { borderColor: "#ef444433" }]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.7}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={s.logoutText}>Выйти из аккаунта</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[s.versionText, { color: colors.mutedForeground }]}>
          BuildFlow Mobile · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[sectS.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[sectS.title, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}
const sectS = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingTop: 12, paddingBottom: 4 },
});

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={[infoS.row, { borderTopColor: colors.border }]}>
      <View style={infoS.left}>
        <Feather name={icon as any} size={14} color={colors.mutedForeground} />
        <Text style={[infoS.label, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[infoS.value, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}
const infoS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1 },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right", marginLeft: 16 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff" },
  content: { padding: 16, paddingTop: 0 },
  userCard: {
    borderRadius: 20, padding: 24, alignItems: "center",
    marginBottom: 16, marginTop: -1,
  },
  avatarOuter: {
    padding: 3, borderRadius: 40,
    borderWidth: 2, borderColor: "#2563eb55", marginBottom: 12,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#2563eb",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#ffffff" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8da3ba", marginTop: 3 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 12,
    borderWidth: 1,
  },
  roleBadgeAdmin: { backgroundColor: "#2563eb22", borderColor: "#2563eb44" },
  roleBadgeUser: { backgroundColor: "#ffffff14", borderColor: "#ffffff22" },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  roleTextAdmin: { color: "#60a5fa" },
  roleTextUser: { color: "#8da3ba" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14,
    marginBottom: 16, marginTop: 4,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ef4444" },
  versionText: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
});
