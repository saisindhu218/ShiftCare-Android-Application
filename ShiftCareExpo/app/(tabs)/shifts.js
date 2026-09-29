import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert,
  ActivityIndicator, ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS, SHADOW } from "../../lib/theme";
import { todayStr, monthStartStr } from "../../lib/dates";
import { SHIFT_TYPES, isValidDate } from "../../lib/shiftTypes";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function ShiftsScreen() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("08:00 AM");
  const [endTime, setEndTime] = useState("05:00 PM");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("shifts").select("*").eq("user_id", user.id).order("date", { ascending: true });
    if (error) Alert.alert("Error loading shifts", error.message);
    setShifts(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const addShift = async () => {
    if (!isValidDate(date)) { Alert.alert("Invalid date", "Use the format YYYY-MM-DD, e.g. 2026-10-05."); return; }
    if (!department.trim()) { Alert.alert("Missing info", "Please enter a department."); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("shifts").insert({
      user_id: user.id, date, start_time: startTime, end_time: endTime,
      department: department.trim(), location: location.trim(), status: "ASSIGNED",
    });
    setSaving(false);
    if (error) { Alert.alert("Could not add shift", error.message); return; }
    setModalVisible(false);
    setDepartment(""); setLocation("");
    load();
  };

  const deleteShift = (id) => {
    Alert.alert("Remove shift", "Delete this shift from your schedule?", [
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

  const cells = buildCalendarGrid(viewYear, viewMonth);
  const shiftsByDate = {};
  shifts.forEach((s) => {
    const d = new Date(s.date + "T00:00:00");
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      shiftsByDate[d.getDate()] = s;
    }
  });
  const todayShift = shifts.find((s) => s.date === todayStr());

  const changeMonth = (delta) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 110 }}>
        <Text style={styles.brand}>ShiftCare</Text>
        <Text style={styles.pageTitle}>Shift Management</Text>

        <LinearGradient colors={[COLORS.primaryStart, COLORS.primaryEnd]} style={styles.bigCard}>
          <Text style={styles.bigCardLabel}>TODAY'S SHIFT</Text>
          {todayShift ? (
            <>
              <Text style={styles.bigCardTime}>{todayShift.start_time} - {todayShift.end_time}</Text>
              <Text style={styles.bigCardSub}>{todayShift.department}{todayShift.location ? `, ${todayShift.location}` : ""}</Text>
            </>
          ) : (
            <Text style={styles.bigCardSub}>No shift scheduled today</Text>
          )}
        </LinearGradient>

        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => changeMonth(-1)}><Ionicons name="chevron-back" size={20} color={COLORS.textDark} /></TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)}><Ionicons name="chevron-forward" size={20} color={COLORS.textDark} /></TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => <Text key={w} style={styles.weekLabel}>{w}</Text>)}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              const shift = day ? shiftsByDate[day] : null;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dayCell, shift && styles.dayCellFilled]}
                  disabled={!shift}
                  onLongPress={() => shift && deleteShift(shift.id)}
                >
                  {day ? (
                    shift ? (
                      <>
                        <Text style={styles.dayNumberFilled}>{day}</Text>
                        <Text style={styles.dayTimeFilled} numberOfLines={1}>{shift.start_time.slice(0,5)}</Text>
                      </>
                    ) : (
                      <Text style={styles.dayNumber}>{day}</Text>
                    )
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.accentEnd }]} />
              <Text style={styles.legendText}>Assigned Shift</Text>
            </View>
          </View>
          <Text style={styles.hint}>Long-press a shift to delete it</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.assignBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.assignBtnText}>Assign Shift</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Shift</Text>
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
            <Text style={styles.chipLabel}>Shift type</Text>
            <View style={styles.chipRow}>
              {SHIFT_TYPES.map((t) => {
                const active = startTime === t.start && endTime === t.end;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => { setStartTime(t.start); setEndTime(t.end); }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput style={styles.input} placeholder="Start time (e.g. 08:00 AM)" value={startTime} onChangeText={setStartTime} />
            <TextInput style={styles.input} placeholder="End time (e.g. 05:00 PM)" value={endTime} onChangeText={setEndTime} />
            <TextInput style={styles.input} placeholder="Department" value={department} onChangeText={setDepartment} />
            <TextInput style={styles.input} placeholder="Location" value={location} onChangeText={setLocation} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addShift} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 15, color: COLORS.primaryEnd, fontWeight: "700" },
  pageTitle: { fontSize: 24, fontWeight: "700", color: COLORS.textDark, marginTop: 4, marginBottom: 18 },
  bigCard: { borderRadius: RADIUS.card, padding: 20, marginBottom: 20, ...SHADOW },
  bigCardLabel: { color: "#fff", fontWeight: "700", fontSize: 14, letterSpacing: 0.5 },
  bigCardTime: { color: "#fff", fontWeight: "700", fontSize: 20, marginTop: 8 },
  bigCardSub: { color: "rgba(255,255,255,0.9)", marginTop: 6, fontSize: 15 },
  calendarCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20, ...SHADOW },
  monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  monthTitle: { fontWeight: "700", fontSize: 17, color: COLORS.textDark },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: "center", fontSize: 13, color: COLORS.textFaint, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 8, marginBottom: 2,
  },
  dayCellFilled: { backgroundColor: COLORS.accentEnd },
  dayNumber: { fontSize: 14, color: COLORS.textDark },
  dayNumberFilled: { fontSize: 14, color: "#fff", fontWeight: "700" },
  dayTimeFilled: { fontSize: 10, color: "#fff" },
  legendRow: { flexDirection: "row", marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: COLORS.textMuted },
  hint: { fontSize: 12, color: COLORS.textFaint, marginTop: 6 },
  actionsRow: { marginTop: 20 },
  assignBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.accentEnd, borderRadius: RADIUS.button, padding: 16,
  },
  assignBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: COLORS.textDark },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 10 },
  chipLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600", marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#F3F4F6" },
  chipActive: { backgroundColor: COLORS.primaryEnd },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: "#F3F4F6" },
  cancelText: { color: COLORS.textMuted, fontWeight: "600" },
  saveBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: 10, backgroundColor: COLORS.primaryEnd },
  saveText: { color: "#fff", fontWeight: "700" },
});
