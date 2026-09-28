import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS } from "../../lib/theme";

const TYPE_META = {
  URGENT_NEED: { icon: "alert-circle", bg: "#EF4444" },
  SWAP_APPROVAL: { icon: "checkmark-circle", bg: COLORS.primaryEnd },
  SWAP_REQUEST: { icon: "swap-horizontal", bg: COLORS.primaryEnd },
  TRAINING: { icon: "school", bg: COLORS.accentEnd },
  SHIFT_UPDATE: { icon: "time", bg: "#38BDF8" },
  GENERAL: { icon: "megaphone", bg: COLORS.accentEnd },
};

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const markRead = async (id) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryEnd} />
      </GradientBackground>
    );
  }

  const urgent = items.find((i) => i.type === "URGENT_NEED" && !i.is_read);
  const rest = items.filter((i) => i.id !== urgent?.id);

  return (
    <GradientBackground>
      <View style={styles.header}><Text style={styles.headerTitle}>Notifications</Text></View>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={rest}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          urgent ? (
            <TouchableOpacity onPress={() => markRead(urgent.id)}>
              <LinearGradient colors={[COLORS.accentStart, COLORS.primaryEnd]} style={styles.urgentCard}>
                <Text style={styles.urgentTitle}>URGENT STAFFING NEED!</Text>
                <Text style={styles.urgentMessage}>{urgent.message}</Text>
                <Text style={styles.urgentTap}>Tap to dismiss</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={!urgent ? <Text style={styles.empty}>You're all caught up.</Text> : null}
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] || TYPE_META.GENERAL;
          return (
            <TouchableOpacity
              style={[styles.row, !item.is_read && styles.unreadRow]}
              onPress={() => markRead(item.id)}
            >
              <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 8, paddingBottom: 10, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: COLORS.textDark },
  urgentCard: { borderRadius: RADIUS.card, padding: 20, marginBottom: 18 },
  urgentTitle: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.5, marginBottom: 6 },
  urgentMessage: { color: "#fff", fontSize: 16, marginBottom: 6 },
  urgentTap: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  empty: { textAlign: "center", color: COLORS.textFaint, marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  unreadRow: { backgroundColor: "#EAF3FE" },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 12 },
  title: { fontWeight: "700", fontSize: 16, color: COLORS.textDark },
  message: { color: COLORS.textMuted, marginTop: 2, fontSize: 14 },
});
