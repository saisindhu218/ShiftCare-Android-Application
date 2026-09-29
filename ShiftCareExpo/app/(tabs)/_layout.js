import { useEffect, useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../lib/theme";
import { supabase } from "../../lib/supabase";

export default function TabsLayout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      setIsAdmin(!!data?.is_admin);
    })();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primaryEnd,
        tabBarInactiveTintColor: "#B0B8C4",
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 18,
          height: 64,
          borderRadius: 32,
          backgroundColor: "#fff",
          borderTopWidth: 0,
          shadowColor: "#1E3A8A",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarItemStyle: { height: 64, paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabDot focused={focused}><Ionicons name={focused ? "home" : "home-outline"} color={color} size={22} /></TabDot>
          ),
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabDot focused={focused}><Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={22} /></TabDot>
          ),
        }}
      />
      <Tabs.Screen
        name="swap"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabDot focused={focused}><Ionicons name="swap-horizontal" color={color} size={22} /></TabDot>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabDot focused={focused}><Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} color={color} size={22} /></TabDot>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabDot focused={focused}><Ionicons name={focused ? "notifications" : "notifications-outline"} color={color} size={22} /></TabDot>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabDot focused={focused}><Ionicons name={focused ? "shield-checkmark" : "shield-checkmark-outline"} color={color} size={22} /></TabDot>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabDot focused={focused}><Ionicons name={focused ? "person" : "person-outline"} color={color} size={22} /></TabDot>
          ),
        }}
      />
    </Tabs>
  );
}

function TabDot({ focused, children }) {
  return (
    <View
      style={{
        width: 44, height: 44, borderRadius: 22,
        alignItems: "center", justifyContent: "center",
        backgroundColor: focused ? "#EAF3FE" : "transparent",
      }}
    >
      {children}
    </View>
  );
}
