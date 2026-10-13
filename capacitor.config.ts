import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.polygonface.ambient",
  appName: "Ambiance",
  webDir: "dist-android",
  backgroundColor: "#101714",
  plugins: { SystemBars: { hidden: true, insetsHandling: "disable" } },
};
export default config;
