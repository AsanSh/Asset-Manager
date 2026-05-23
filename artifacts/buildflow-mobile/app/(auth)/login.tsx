import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";

interface LoginResponse {
  token: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Введите email и пароль");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      await login(res.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message ?? "Ошибка входа");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.hero, { paddingTop: topPad + 48 }]}>
        <View style={styles.iconWrap}>
          <Feather name="home" size={28} color="#ffffff" />
        </View>
        <Text style={styles.brand}>BuildFlow</Text>
        <Text style={styles.sub}>Платформа управления недвижимостью</Text>
      </View>

      <View style={[styles.card, { paddingBottom: botPad + 32 }]}>
        <Text style={styles.cardTitle}>Войти в аккаунт</Text>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={16} color="#6c7a8d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="admin@buildflow.kz"
              placeholderTextColor="#9aa5b4"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Пароль</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={16} color="#6c7a8d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputPass]}
              placeholder="••••••••"
              placeholderTextColor="#9aa5b4"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#6c7a8d" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.loginBtnText}>Войти</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.footerText}>KGS · Кыргызстан</Text>
          <View style={styles.divider} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1a1d2e" },
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  brand: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8da3ba",
    marginTop: 6,
    textAlign: "center",
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0e1b2e",
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#ef4444", flex: 1 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0e1b2e", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#dce4ef",
    borderRadius: 12,
    backgroundColor: "#f4f7fb",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0e1b2e",
    height: "100%",
  },
  inputPass: { paddingRight: 8 },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#ffffff" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#dce4ef" },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9aa5b4" },
});
