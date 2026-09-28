import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hospitalUnit, setHospitalUnit] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please re-enter your password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), hospital_unit: hospitalUnit.trim() },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Signup failed", error.message);
      return;
    }

    if (!data.session) {
      // Email confirmation is enabled on the Supabase project
      Alert.alert(
        "Check your email",
        "We sent you a confirmation link. Confirm it, then log in.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    }
    // If a session came back immediately (email confirmations off), _layout.js redirects automatically.
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join your team on ShiftCare</Text>

      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Hospital / Unit (e.g. Main Hospital - ICU)"
        value={hospitalUnit}
        onChangeText={setHospitalUnit}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((v) => !v)}
          style={styles.eyeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#888" />
        </TouchableOpacity>
      </View>
      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm password"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword((v) => !v)}
          style={styles.eyeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Creating..." : "Sign Up"}</Text>
      </TouchableOpacity>

      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", color: "#1976D2", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", marginBottom: 24, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: "#1976D2",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 20, alignSelf: "center" },
  linkText: { color: "#1976D2", fontSize: 14 },
});