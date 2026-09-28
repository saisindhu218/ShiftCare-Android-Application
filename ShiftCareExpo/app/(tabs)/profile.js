import { useCallback, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS } from "../../lib/theme";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [hospitalUnit, setHospitalUnit] = useState("");
  const [phone, setPhone] = useState("");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data);
      setName(data.name || ""); setRole(data.role || "");
      setSpecialization(data.specialization || ""); setHospitalUnit(data.hospital_unit || "");
      setPhone(data.phone || "");
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: name.trim(), role: role.trim(), specialization: specialization.trim(),
      hospital_unit: hospitalUnit.trim(), phone: phone.trim(),
    }).eq("id", profile.id);
    setSaving(false);
    if (error) Alert.alert("Could not save", error.message);
    else Alert.alert("Saved", "Your profile was updated.");
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryEnd} />
      </GradientBackground>
    );
  }

  const initials = (name || profile?.email || "?").trim().slice(0, 1).toUpperCase();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10 }}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        <View style={styles.card}>
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Role" value={role} onChangeText={setRole} />
          <Field label="Specialization" value={specialization} onChangeText={setSpecialization} />
          <Field label="Hospital / Unit" value={hospitalUnit} onChangeText={setHospitalUnit} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarWrap: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryEnd,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  email: { color: COLORS.textMuted, fontSize: 15 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20 },
  label: { fontSize: 14, color: COLORS.textMuted, marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12 },
  saveBtn: { backgroundColor: COLORS.primaryEnd, borderRadius: RADIUS.button, padding: 16, alignItems: "center", marginTop: 6 },
  saveText: { color: "#fff", fontWeight: "700" },
  signOutBtn: { flexDirection: "row", gap: 8, padding: 16, alignItems: "center", justifyContent: "center", marginTop: 16 },
  signOutText: { color: "#EF4444", fontWeight: "700" },
});
