import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Self-heal: if this account has no profile row (e.g. the signup trigger was
  // missing when it was created), create one so name/role/admin features work.
  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (error || data) return;
      const meta = user.user_metadata || {};
      await supabase.from("profiles").insert({
        id: user.id,
        name: (meta.name || "").trim() || (user.email || "user").split("@")[0],
        email: user.email,
        hospital_unit: meta.hospital_unit || "",
      });
    })();
  }, [session]);

  useEffect(() => {
    if (session === undefined) return; // still loading
    const inTabs = segments[0] === "(tabs)";
    if (!session && inTabs) {
      router.replace("/login");
    } else if (session && !inTabs) {
      router.replace("/(tabs)");
    }
  }, [session, segments]);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
