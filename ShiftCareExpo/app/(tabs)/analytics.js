import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS } from "../../lib/theme";
import { todayStr, monthStartStr } from "../../lib/dates";

function parseHours(start, end) {
  const parse = (t) => {
    const m = t.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = (m[3] || "").toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h + min / 60;
  };
  const s = parse(start), e = parse(end);
  if (s === null || e === null) return 0;
  let diff = e - s;
  if (diff < 0) diff += 24;
  return diff;
}

function ProgressRing({ progress, color, size = 110, strokeWidth = 10, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(progress, 1));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#E5E9F0" strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>{children}</View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const startStr = monthStartStr();

    const [{ data: shifts }, { data: allSwaps }] = await Promise.all([
      supabase.from("shifts").select("*").eq("user_id", user.id).gte("date", startStr).order("date", { ascending: false }),
      supabase.from("swap_requests").select("*").or(`requester_id.eq.${user.id},target_user_id.eq.${user.id}`),
    ]);

    const totalHours = (shifts || []).reduce((sum, s) => sum + parseHours(s.start_time, s.end_time), 0);
    const monthlyTargetHours = 180;
    const swapsRequested = (allSwaps || []).filter((s) => s.requester_id === user.id).length;
    const swapsAccepted = (allSwaps || []).filter((s) => s.status === "ACCEPTED").length;
    const pickedUpThisMonth = (allSwaps || []).filter(
      (s) => s.target_user_id === user.id && s.status === "ACCEPTED" && (s.resolved_at || "") >= startStr
    ).length;
    const approvalRate = swapsRequested > 0 ? Math.round((swapsAccepted / swapsRequested) * 100) : 0;

    setStats({
      totalHours: Math.round(totalHours),
      monthlyTargetHours,
      swapsRequested,
      swapsAccepted,
      approvalRate,
      pickedUpThisMonth,
    });
    setHistory((shifts || []).slice(0, 6));
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading || !stats) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryEnd} />
      </GradientBackground>
    );
  }

  const hoursProgress = stats.totalHours / stats.monthlyTargetHours;
  const swapProgress = stats.swapsRequested > 0 ? stats.swapsAccepted / stats.swapsRequested : 0;

  return (
    <GradientBackground>
      <View style={styles.header}><Text style={styles.headerTitle}>Attendance & Analytics</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Overview - This Month</Text>
          <View style={styles.ringsRow}>
            <ProgressRing progress={hoursProgress} color={COLORS.primaryEnd}>
              <Text style={styles.ringLabel}>Total Hours</Text>
              <Text style={styles.ringValue}>{stats.totalHours}</Text>
              <Text style={styles.ringSub}>/ {stats.monthlyTargetHours} hrs</Text>
            </ProgressRing>
            <ProgressRing progress={swapProgress} color={COLORS.accentEnd}>
              <Text style={styles.ringLabel}>Successful Swaps</Text>
              <Text style={styles.ringValue}>{stats.swapsAccepted} / {stats.swapsRequested}</Text>
              <Text style={styles.ringSub}>swaps</Text>
            </ProgressRing>
          </View>
        </View>

        {stats.pickedUpThisMonth > 2 && (
          <View style={styles.restAlert}>
            <Text style={styles.restAlertText}>
              Rest Alert: you have picked up {stats.pickedUpThisMonth} swapped shifts this month. Please make sure you get adequate rest.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Shift History</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>No shifts recorded this month yet.</Text>
          ) : (
            history.map((s) => (
              <View key={s.id} style={styles.historyRow}>
                <Text style={styles.historyText}>
                  {s.date}: {s.start_time} - {s.end_time}
                </Text>
                <View style={[styles.statusPill, s.status === "SWAPPED" && styles.statusPillSwapped]}>
                  <Text style={styles.statusPillText}>{s.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Swap Statistics</Text>
          <BarRow label="Swaps Requested" value={stats.swapsRequested} max={Math.max(stats.swapsRequested, 1)} color={COLORS.primaryEnd} />
          <BarRow label="Swaps Accepted" value={stats.swapsAccepted} max={Math.max(stats.swapsRequested, 1)} color={COLORS.accentEnd} />
          <Text style={styles.approvalText}>Approval Rate: {stats.approvalRate}%</Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

function BarRow({ label, value, max, color }) {
  const width = `${Math.min(100, (value / max) * 100)}%`;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={[styles.barTrack, { backgroundColor: "#EEF2F7" }]}>
        <View style={[styles.barFill, { width, backgroundColor: color }]}>
          <Text style={styles.barLabel}>{label}</Text>
        </View>
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 8, paddingBottom: 10, alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20, marginBottom: 18 },
  cardHeading: { fontWeight: "700", fontSize: 17, color: COLORS.textDark, marginBottom: 14 },
  ringsRow: { flexDirection: "row", justifyContent: "space-around" },
  ringLabel: { fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
  ringValue: { fontSize: 20, fontWeight: "700", color: COLORS.textDark, marginTop: 2 },
  ringSub: { fontSize: 12, color: COLORS.textFaint },
  historyRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  historyText: { fontSize: 15, color: COLORS.textDark, flex: 1 },
  statusPill: { backgroundColor: "#DCFCE7", borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillSwapped: { backgroundColor: "#DBEAFE" },
  statusPillText: { fontSize: 12, fontWeight: "700", color: COLORS.accentEnd },
  empty: { color: COLORS.textFaint, fontSize: 15 },
  barTrack: { height: 26, borderRadius: 8, overflow: "hidden", marginBottom: 4 },
  barFill: { height: "100%", justifyContent: "center", paddingLeft: 10, borderRadius: 8, minWidth: 40 },
  barLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },
  barValue: { textAlign: "right", fontSize: 14, color: COLORS.textMuted },
  restAlert: { backgroundColor: "#F59E0B", borderRadius: RADIUS.card, padding: 18, marginBottom: 18 },
  restAlertText: { color: "#fff", fontWeight: "700", fontSize: 14, lineHeight: 20 },
  approvalText: { textAlign: "center", color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
});
