import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS, SHADOW } from "../../lib/theme";
import { todayStr, monthStartStr } from "../../lib/dates";

export default function SwapScreen() {
  const [loading, setLoading] = useState(true);
  const [myShifts, setMyShifts] = useState([]);
  const [openOffers, setOpenOffers] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [myShiftCount, setMyShiftCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [userId, setUserId] = useState(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const startStr = monthStartStr();

    const { data: shifts } = await supabase
      .from("shifts").select("*").eq("user_id", user.id)
      .gte("date", todayStr()).order("date", { ascending: true });

    const { data: swaps } = await supabase
      .from("swap_requests")
      .select("*, offered_shift:offered_shift_id(*), requester:requester_id(name)")
      .eq("status", "PENDING").order("created_at", { ascending: false });

    const [{ data: profiles }, { data: monthShifts }] = await Promise.all([
      supabase.from("profiles").select("id, name"),
      supabase.from("shifts").select("user_id").gte("date", startStr),
    ]);
    const counts = {};
    (profiles || []).forEach((p) => { counts[p.id] = { name: p.name, count: 0 }; });
    (monthShifts || []).forEach((s) => { if (counts[s.user_id]) counts[s.user_id].count += 1; });
    const ranked = Object.values(counts).sort((a, b) => a.count - b.count);

    setMyShifts(shifts || []);
    setOpenOffers((swaps || []).filter((s) => s.requester_id !== user.id));
    setMyOffers((swaps || []).filter((s) => s.requester_id === user.id));
    setWorkload(ranked.slice(0, 5));
    setMyShiftCount(counts[user.id]?.count || 0);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const offerShift = async (shift) => {
    const { error } = await supabase.from("swap_requests").insert({
      requester_id: userId, offered_shift_id: shift.id, status: "PENDING",
    });
    if (error) { Alert.alert("Could not create offer", error.message); return; }
    setModalVisible(false);
    load();
  };

  const cancelOffer = async (swapId) => {
    const { error } = await supabase.from("swap_requests")
      .update({ status: "CANCELLED", resolved_at: new Date().toISOString() }).eq("id", swapId);
    if (error) Alert.alert("Error", error.message);
    load();
  };

  const acceptOffer = async (swapId) => {
    const { error } = await supabase.rpc("accept_swap", { swap_id: swapId });
    if (error) { Alert.alert("Could not accept swap", error.message); return; }
    Alert.alert("Swap accepted", "That shift is now yours.");
    load();
  };

  const rejectOffer = async (swapId) => {
    const { error } = await supabase.rpc("reject_swap", { swap_id: swapId });
    if (error) { Alert.alert("Could not decline", error.message); return; }
    Alert.alert("Declined", "The requester was notified. It's still open for others.");
    load();
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryEnd} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.header}><Text style={styles.headerTitle}>Shift Swap</Text></View>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 110 }}
        data={openOffers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <LinearGradient colors={[COLORS.accentStart, COLORS.accentEnd]} style={styles.createBtn}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createBtnText}>Create New Swap</Text>
              </LinearGradient>
            </TouchableOpacity>

            {myOffers.map((o) => (
              <View key={o.id} style={styles.pendingCard}>
                <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.pendingText}>
                  Pending: {o.offered_shift?.department}, {o.offered_shift?.date} ({o.offered_shift?.start_time}-{o.offered_shift?.end_time})
                </Text>
                <TouchableOpacity onPress={() => cancelOffer(o.id)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            {workload.length > 0 && (
              <View style={styles.workloadCard}>
                <Text style={styles.workloadTitle}>Team Workload This Month</Text>
                <Text style={styles.workloadSub}>Fewest shifts first — good candidates to pick up a swap</Text>
                {workload.map((w, i) => (
                  <View key={i} style={styles.workloadRow}>
                    <Text style={[styles.workloadName, i === 0 && styles.workloadNameTop]}>
                      {i === 0 ? "⭐ " : ""}{w.name}
                    </Text>
                    <Text style={styles.workloadCount}>{w.count} shifts</Text>
                  </View>
                ))}
                <Text style={styles.myCountText}>You have {myShiftCount} shift{myShiftCount === 1 ? "" : "s"} this month</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Open Swap Offers</Text>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>No open swap offers right now.</Text>}
        renderItem={({ item }) => (
          <View style={styles.offerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.offerName}>{item.requester?.name || "A colleague"}</Text>
              <Text style={styles.offerDetail}>
                {item.offered_shift?.department} · {item.offered_shift?.date}
              </Text>
              <Text style={styles.offerDetail}>
                {item.offered_shift?.start_time} - {item.offered_shift?.end_time}
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOffer(item.id)}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectOffer(item.id)}>
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pick a shift to offer</Text>
            <FlatList
              data={myShifts}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={styles.empty}>You have no upcoming shifts to offer.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickRow} onPress={() => offerShift(item)}>
                  <Text style={styles.offerName}>{item.department}</Text>
                  <Text style={styles.offerDetail}>{item.date} · {item.start_time}-{item.end_time}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 8, paddingBottom: 10, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: COLORS.textDark },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: RADIUS.card, padding: 18, marginBottom: 18, ...SHADOW },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  pendingCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 14,
  },
  pendingText: { flex: 1, color: COLORS.textDark, fontSize: 15, fontWeight: "500" },
  sectionTitle: { fontWeight: "700", fontSize: 15, color: COLORS.textMuted, marginTop: 10, marginBottom: 8, letterSpacing: 0.5 },
  workloadCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 18, marginBottom: 18, ...SHADOW },
  workloadTitle: { fontWeight: "700", fontSize: 15, color: COLORS.textDark, marginBottom: 2 },
  workloadSub: { fontSize: 12, color: COLORS.textFaint, marginBottom: 10 },
  workloadRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  workloadName: { fontSize: 13, color: COLORS.textDark },
  workloadNameTop: { fontWeight: "700", color: COLORS.accentEnd },
  workloadCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  myCountText: { fontSize: 12, color: COLORS.textMuted, marginTop: 10, fontStyle: "italic" },
  rejectBtn: { backgroundColor: "#FEE2E2", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  rejectText: { color: "#EF4444", fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", color: COLORS.textFaint, marginTop: 20, marginBottom: 20 },
  offerCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 14,
  },
  offerName: { fontWeight: "700", color: COLORS.textDark, marginBottom: 2 },
  offerDetail: { color: COLORS.textMuted, fontSize: 14, marginTop: 1 },
  acceptBtn: { backgroundColor: COLORS.accentEnd, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: COLORS.textDark },
  pickRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancelBtn: { padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#F3F4F6", marginTop: 10 },
  cancelText: { color: COLORS.textMuted, fontWeight: "600" },
});
