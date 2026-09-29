import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS, SHADOW } from "../../lib/theme";
import { todayStr, monthStartStr } from "../../lib/dates";

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [todayShift, setTodayShift] = useState(null);
  const [nextShift, setNextShift] = useState(null);
  const [teamOffer, setTeamOffer] = useState(null);
  const [teamOfferCount, setTeamOfferCount] = useState(0);
  const [myPendingOffer, setMyPendingOffer] = useState(null);
  const [userId, setUserId] = useState(null);
  const [adminModal, setAdminModal] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [sendingAdmin, setSendingAdmin] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const todayDate = todayStr();

    const [{ data: profile }, { data: shifts }, { data: openSwaps }, { data: mine }] = await Promise.all([
      supabase.from("profiles").select("name, role, specialization").eq("id", user.id).single(),
      supabase.from("shifts").select("*").eq("user_id", user.id).gte("date", todayDate).order("date", { ascending: true }).limit(2),
      supabase
        .from("swap_requests")
        .select("*, offered_shift:offered_shift_id(*), requester:requester_id(name)")
        .eq("status", "PENDING")
        .neq("requester_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("swap_requests")
        .select("*, offered_shift:offered_shift_id(*)")
        .eq("requester_id", user.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    setName(profile?.name || "");
    setRole(profile?.role || "");
    setSpecialization(profile?.specialization || "");
    setTodayShift((shifts || []).find((s) => s.date === todayDate) || null);
    setNextShift((shifts || []).find((s) => s.date !== todayDate) || shifts?.[0] || null);
    setTeamOffer(openSwaps?.[0] || null);
    setTeamOfferCount(openSwaps?.length || 0);
    setMyPendingOffer(mine?.[0] || null);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = () => { setRefreshing(true); load(); };

  const notifyAdmins = async () => {
    if (!adminMsg.trim()) { Alert.alert("Empty message", "Type what you want the admin to know."); return; }
    setSendingAdmin(true);
    const { data: admins, error: adminErr } = await supabase.from("profiles").select("id").eq("is_admin", true);
    if (adminErr || !admins || admins.length === 0) {
      setSendingAdmin(false);
      Alert.alert("No admin found", "No account is marked as admin yet.");
      return;
    }
    const rows = admins.map((a) => ({
      user_id: a.id,
      title: `Message from ${name || "a doctor"}`,
      message: adminMsg.trim(),
      type: "GENERAL",
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSendingAdmin(false);
    if (error) { Alert.alert("Could not send", error.message); return; }
    setAdminMsg("");
    setAdminModal(false);
    Alert.alert("Sent", "Your message was delivered to the admin.");
  };

  const acceptOffer = async (swapId) => {
    const { error } = await supabase.rpc("accept_swap", { swap_id: swapId });
    if (error) { Alert.alert("Could not accept swap", error.message); return; }
    Alert.alert("Swap accepted", "That shift is now yours.");
    load();
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryEnd} />
      </GradientBackground>
    );
  }

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.brand}>ShiftCare</Text>
        <Text style={styles.greeting}>{timeGreeting}{name ? `, ${name}` : ""}</Text>
        {(role || specialization) ? (
          <Text style={styles.subGreeting}>{[role, specialization].filter(Boolean).join(", ")}</Text>
        ) : null}

        <LinearGradient colors={[COLORS.primaryStart, COLORS.primaryEnd]} style={styles.bigCard}>
          <View style={styles.bigCardHeader}>
            <Text style={styles.bigCardLabel}>TODAY'S SHIFT</Text>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
          </View>
          {todayShift ? (
            <>
              <View style={styles.bigCardRow}>
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={styles.bigCardTime}>{todayShift.start_time} - {todayShift.end_time}</Text>
              </View>
              <Text style={styles.bigCardSub}>{todayShift.department}{todayShift.location ? `, ${todayShift.location}` : ""}</Text>
            </>
          ) : (
            <Text style={styles.bigCardSub}>No shift scheduled today</Text>
          )}
        </LinearGradient>

        <LinearGradient colors={[COLORS.accentStart, COLORS.accentEnd]} style={[styles.bigCard, { marginTop: 16 }]}>
          <Text style={styles.bigCardLabel}>NEXT SHIFT</Text>
          {nextShift ? (
            <Text style={styles.bigCardTime}>
              {nextShift.date} · {nextShift.start_time} - {nextShift.end_time}
            </Text>
          ) : (
            <Text style={styles.bigCardSub}>Nothing upcoming yet</Text>
          )}
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>SHIFT SWAP REQUESTS</Text>
            {teamOfferCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{teamOfferCount} New</Text></View>
            )}
          </View>
          {teamOffer ? (
            <View style={styles.swapRow}>
              <Text style={styles.swapText}>
                {teamOffer.requester?.name || "A colleague"} needs swap for{"\n"}
                {teamOffer.offered_shift?.date}
              </Text>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOffer(teamOffer.id)}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>No open swap offers right now</Text>
          )}
          {myPendingOffer && (
            <View style={styles.pendingRow}>
              <Text style={styles.pendingText}>
                Pending: My request for {myPendingOffer.offered_shift?.date}
              </Text>
              <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/swap")}>
            <View style={styles.quickIconCircle}><Ionicons name="swap-horizontal" size={22} color={COLORS.accentEnd} /></View>
            <Text style={styles.quickLabel}>Request Swap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/shifts")}>
            <View style={styles.quickIconCircle}><Ionicons name="calendar" size={22} color={COLORS.accentEnd} /></View>
            <Text style={styles.quickLabel}>View Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setAdminModal(true)}
          >
            <View style={styles.quickIconCircle}><Ionicons name="megaphone" size={22} color={COLORS.accentEnd} /></View>
            <Text style={styles.quickLabel}>Notify Admin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal visible={adminModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Notify Admin</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. I will be late tomorrow / I need leave on Oct 30"
              value={adminMsg}
              onChangeText={setAdminMsg}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAdminModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSend} onPress={notifyAdmins} disabled={sendingAdmin}>
                <Text style={styles.modalSendText}>{sendingAdmin ? "Sending..." : "Send"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 110 },
  center: { alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 14, color: COLORS.primaryEnd, fontWeight: "700", marginBottom: 4 },
  greeting: { fontSize: 27, fontWeight: "700", color: COLORS.textDark },
  subGreeting: { fontSize: 15, color: COLORS.textMuted, marginTop: 4, marginBottom: 22 },
  bigCard: { borderRadius: RADIUS.card, padding: 20, ...SHADOW },
  bigCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bigCardLabel: { color: "#fff", fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },
  bigCardRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  bigCardTime: { color: "#fff", fontWeight: "700", fontSize: 20, marginTop: 10 },
  bigCardSub: { color: "rgba(255,255,255,0.9)", marginTop: 8, fontSize: 14 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: 20,
    marginTop: 20, ...SHADOW },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.5 },
  badge: { backgroundColor: "#DCFCE7", borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: COLORS.accentEnd, fontWeight: "700", fontSize: 12 },
  swapRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  swapText: { flex: 1, color: COLORS.textDark, fontWeight: "600", fontSize: 14 },
  acceptBtn: { backgroundColor: COLORS.accentEnd, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyText: { color: COLORS.textFaint, marginTop: 12, fontSize: 14 },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pendingText: { color: COLORS.textDark, fontSize: 14, fontWeight: "500", flex: 1, marginRight: 8 },
  quickActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  quickAction: { alignItems: "center", flex: 1 },
  quickIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 14, color: COLORS.textDark },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, height: 100, textAlignVertical: "top", fontSize: 15 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 14 },
  modalCancel: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#F3F4F6" },
  modalCancelText: { color: COLORS.textMuted, fontWeight: "600" },
  modalSend: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: COLORS.primaryEnd },
  modalSendText: { color: "#fff", fontWeight: "700" },
  quickLabel: { fontSize: 12, color: COLORS.textDark, fontWeight: "600", textAlign: "center" },
});
