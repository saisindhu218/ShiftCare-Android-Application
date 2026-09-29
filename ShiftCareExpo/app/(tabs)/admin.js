import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS, SHADOW } from "../../lib/theme";
import { todayStr, monthStartStr } from "../../lib/dates";
import { SHIFT_TYPES, isValidDate } from "../../lib/shiftTypes";

export default function AdminScreen() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [swapHistory, setSwapHistory] = useState([]);

  // assign-shift form
  const [doctorId, setDoctorId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState(SHIFT_TYPES[1].start);
  const [endTime, setEndTime] = useState(SHIFT_TYPES[1].end);
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  // broadcast form
  const [alertText, setAlertText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const startStr = monthStartStr();

    const [{ data: profiles }, { data: shifts }, { data: swaps }] = await Promise.all([
      supabase.from("profiles").select("id, name, role").order("name"),
      supabase.from("shifts").select("*, owner:user_id(name)").order("date", { ascending: false }),
      supabase
        .from("swap_requests")
        .select("*, offered_shift:offered_shift_id(date, department, start_time, end_time), requester:requester_id(name), target:target_user_id(name)")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const counts = {};
    (profiles || []).forEach((p) => { counts[p.id] = { name: p.name, role: p.role, count: 0 }; });
    (shifts || []).filter((s) => s.date >= startStr).forEach((s) => { if (counts[s.user_id]) counts[s.user_id].count += 1; });

    setStaff(profiles || []);
    setWorkload(Object.values(counts).sort((a, b) => a.count - b.count));
    setAllShifts(shifts || []);
    setSwapHistory(swaps || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const assignShift = async () => {
    if (!doctorId) { Alert.alert("Pick a doctor", "Select who this shift is for."); return; }
    if (!isValidDate(date)) { Alert.alert("Invalid date", "Use the format YYYY-MM-DD, e.g. 2026-10-05."); return; }
    if (!department.trim()) { Alert.alert("Missing info", "Please enter a department."); return; }
    setSaving(true);
    const { error } = await supabase.from("shifts").insert({
      user_id: doctorId, date, start_time: startTime, end_time: endTime,
      department: department.trim(), location: location.trim(), status: "ASSIGNED",
    });
    if (error) { setSaving(false); Alert.alert("Could not assign shift", error.message); return; }
    await supabase.from("notifications").insert({
      user_id: doctorId,
      title: "New shift assigned",
      message: `${department.trim()} on ${date}, ${startTime} - ${endTime}.`,
      type: "SHIFT_UPDATE",
    });
    setSaving(false);
    Alert.alert("Assigned", "The shift was added and the doctor was notified.");
    load();
  };

  const broadcastUrgent = async () => {
    if (!alertText.trim()) { Alert.alert("Empty message", "Describe the vacancy, e.g. ICU Night Shift on Oct 28."); return; }
    setSending(true);
    const rows = staff.map((p) => ({
      user_id: p.id,
      title: "URGENT STAFFING NEED!",
      message: alertText.trim(),
      type: "URGENT_NEED",
      is_urgent: true,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) { Alert.alert("Could not send", error.message); return; }
    setAlertText("");
    Alert.alert("Sent", `Urgent alert delivered to ${rows.length} people.`);
  };

  const deleteShift = (id) => {
    Alert.alert("Remove shift", "Delete this shift from the roster? (Admin action)", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const { error } = await supabase.from("shifts").delete().eq("id", id);
          if (error) Alert.alert("Error", error.message);
          load();
        } },
    ]);
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
      <View style={styles.header}><Text style={styles.headerTitle}>Admin</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Assign a Shift</Text>
          <Text style={styles.cardSub}>The doctor is notified automatically</Text>
          <Text style={styles.label}>Doctor</Text>
          <View style={styles.chipRow}>
            {staff.map((p) => (
              <TouchableOpacity key={p.id} style={[styles.chip, doctorId === p.id && styles.chipActive]} onPress={() => setDoctorId(p.id)}>
                <Text style={[styles.chipText, doctorId === p.id && styles.chipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Shift type</Text>
          <View style={styles.chipRow}>
            {SHIFT_TYPES.map((t) => {
              const active = startTime === t.start && endTime === t.end;
              return (
                <TouchableOpacity key={t.key} style={[styles.chip, active && styles.chipActive]} onPress={() => { setStartTime(t.start); setEndTime(t.end); }}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label} ({t.start} - {t.end})</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
          <TextInput style={styles.input} placeholder="Department (e.g. Cardiology)" value={department} onChangeText={setDepartment} />
          <TextInput style={styles.input} placeholder="Location (e.g. Main Hospital)" value={location} onChangeText={setLocation} />
          <TouchableOpacity style={styles.primaryBtn} onPress={assignShift} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? "Assigning..." : "Assign Shift"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Broadcast Urgent Vacancy</Text>
          <Text style={styles.cardSub}>Shows as a red banner on every doctor's Notifications tab</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            placeholder="e.g. ICU - Night Shift (10 PM - 8 AM) on Oct 28"
            value={alertText}
            onChangeText={setAlertText}
            multiline
          />
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#EF4444" }]} onPress={broadcastUrgent} disabled={sending}>
            <Text style={styles.primaryBtnText}>{sending ? "Sending..." : "Send to Everyone"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Team Workload This Month</Text>
          <Text style={styles.cardSub}>Fewest shifts first, so the best candidates for a vacancy are on top</Text>
          {workload.map((w, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowName}>{w.name}{w.role ? ` · ${w.role}` : ""}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{w.count} shifts</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>All Shifts ({allShifts.length})</Text>
          {allShifts.slice(0, 25).map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftText}>{s.date} · {s.owner?.name || "Unknown"} · {s.department}</Text>
                <Text style={styles.shiftSub}>{s.start_time}-{s.end_time} · {s.status}</Text>
              </View>
              <Text style={styles.deleteLink} onPress={() => deleteShift(s.id)}>Delete</Text>
            </View>
          ))}
          {allShifts.length > 25 && <Text style={styles.cardSub}>Showing the most recent 25 of {allShifts.length}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Swap History</Text>
          {swapHistory.length === 0 ? (
            <Text style={styles.cardSub}>No swaps yet.</Text>
          ) : (
            swapHistory.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftText}>{s.requester?.name || "?"} → {s.target?.name || "(open)"}</Text>
                  <Text style={styles.shiftSub}>{s.offered_shift?.date} · {s.offered_shift?.department} · {s.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 8, paddingBottom: 10, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20, marginBottom: 18, ...SHADOW },
  cardHeading: { fontWeight: "700", fontSize: 17, color: COLORS.textDark, marginBottom: 4 },
  cardSub: { fontSize: 12, color: COLORS.textFaint, marginBottom: 12 },
  label: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#F3F4F6" },
  chipActive: { backgroundColor: COLORS.primaryEnd },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14 },
  primaryBtn: { backgroundColor: COLORS.accentEnd, borderRadius: RADIUS.button, padding: 14, alignItems: "center", marginTop: 4 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowName: { fontSize: 14, color: COLORS.textDark, flex: 1 },
  badge: { backgroundColor: "#DCFCE7", borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", color: COLORS.accentEnd },
  shiftText: { fontSize: 13, color: COLORS.textDark, fontWeight: "600" },
  shiftSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  deleteLink: { color: "#EF4444", fontSize: 12, fontWeight: "700", marginLeft: 10 },
});
