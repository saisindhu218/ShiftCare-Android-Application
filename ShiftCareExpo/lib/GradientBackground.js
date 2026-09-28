import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "./theme";

export default function GradientBackground({ children, style }) {
  return (
    <LinearGradient colors={[COLORS.bgTop, COLORS.bgBottom]} style={{ flex: 1 }}>
      <SafeAreaView style={[{ flex: 1 }, style]} edges={["top", "left", "right"]}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}
