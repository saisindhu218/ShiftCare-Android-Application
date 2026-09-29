import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import GradientBackground from "../../lib/GradientBackground";
import { COLORS, RADIUS, SHADOW } from "../../lib/theme";

const FIELDS = [
  { key: "name", label: "Name", icon: "person-outline" },
  { key: "role", label: "Role", icon: "briefcase-outline" },
  { key: "specialization", label: "Specialization", icon: "medkit-outline" },
  { key: "hospital_unit", label: "Hospital / Unit", icon: "business-outline" },
  { key: "phone", label: "Phone", icon: "call-outline", keyboardType: "phone-pad" },
];

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", role: "", specialization: "", hospital_unit: "", phone: "" });
  const [savedToast, setSavedToast] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data);
      setForm({
        name: data.name || "", role: data.role || "", specialization: data.specialization || "",
        hospital_unit: data.hospital_unit || "", phone: data.phone || "",
      });
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => {
    if (!savedToast) return;
    const t = setTimeout(() => setSavedToast(false), 2200);
    return () => clearTimeout(t);
  }, [savedToast]);

  const startEdit = () => setEditing(true);
  const cancelEdit = () => {
    setForm({
      name: profile?.name || "", role: profile?.role || "", specialization: profile?.specialization || "",
      hospital_unit: profile?.hospital_unit || "", phone: profile?.phone || "",
    });
    setEditing(false);
  };

  const save = async () => {
    if (!form.name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        name: form.name.trim(), role: form.role.trim(), specialization: form.specialization.trim(),
        hospital_unit: form.hospital_unit.trim(), phone: form.phone.trim(),
      })
      .eq("id", profile.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) { Alert.alert("Could not save", error.message); return; }
    if (!data) {
      Alert.alert("Nothing was saved", "The database didn't accept this change (likely a permissions rule).");
      load();
      return;
    }
    setProfile(data);
    setEditing(false);
    setSavedToast(true);
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
      const path = `${profile.id}/avatar.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const cacheBustedUrl = `${pub.publicUrl}?t=${Date.now()}`;

      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: cacheBustedUrl })
        .eq("id", profile.id)
        .select()
        .maybeSingle();
      if (error) throw error;

      setProfile(data);
      setUploading(false);
      Alert.alert("Updated", "Your profile photo was changed.");
    } catch (e) {
      setUploading(false);
      Alert.alert("Could not upload photo", e.message || "Please try again.");
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryEnd} />
      </GradientBackground>
    );
  }

  const initials = (form.name || profile?.email || "?").trim().slice(0, 1).toUpperCase();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 110 }}>
        <View style={styles.avatarWrap}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploading} style={styles.avatarTouchable}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            )}
            <View style={styles.cameraBadge}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>Profile Details</Text>
            {!editing && (
              <TouchableOpacity style={styles.editLink} onPress={startEdit}>
                <Ionicons name="create-outline" size={16} color={COLORS.primaryEnd} />
                <Text style={styles.editLinkText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {FIELDS.map((f) => (
            <View key={f.key} style={styles.fieldRow}>
              <View style={styles.fieldIconWrap}><Ionicons name={f.icon} size={16} color={COLORS.textMuted} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{f.label}</Text>
                {editing ? (
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                    keyboardType={f.keyboardType}
                    placeholder={f.label}
                  />
                ) : (
                  <Text style={styles.value}>{form[f.key] || "—"}</Text>
                )}
              </View>
            </View>
          ))}

          {editing ? (
            <View style={styles.editButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            savedToast && (
              <View style={styles.toast}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.accentEnd} />
                <Text style={styles.toastText}>Saved</Text>
              </View>
            )
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarWrap: { alignItems: "center", marginBottom: 20 },
  avatarTouchable: { marginBottom: 10 },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primaryEnd,
    alignItems: "center", justifyContent: "center",
  },
  avatarImage: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#E5E9F0" },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "700" },
  cameraBadge: {
    position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.accentEnd, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORS.bgTop,
  },
  email: { color: COLORS.textMuted, fontSize: 15 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 20, ...SHADOW },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardHeading: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  editLinkText: { color: COLORS.primaryEnd, fontWeight: "700", fontSize: 13 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  fieldIconWrap: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center", marginTop: 18,
  },
  label: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontWeight: "600" },
  value: { fontSize: 16, color: COLORS.textDark, paddingVertical: 4 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 15 },
  editButtons: { flexDirection: "row", gap: 12, marginTop: 6 },
  cancelBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.button, backgroundColor: "#F3F4F6" },
  cancelText: { color: COLORS.textMuted, fontWeight: "700" },
  saveBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.button, backgroundColor: COLORS.primaryEnd },
  saveText: { color: "#fff", fontWeight: "700" },
  toast: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 6, backgroundColor: "#DCFCE7", borderRadius: RADIUS.pill, paddingVertical: 8,
  },
  toastText: { color: COLORS.accentEnd, fontWeight: "700", fontSize: 13 },
  signOutBtn: { flexDirection: "row", gap: 8, padding: 16, alignItems: "center", justifyContent: "center", marginTop: 16 },
  signOutText: { color: "#EF4444", fontWeight: "700" },
});
