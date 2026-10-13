import { Capacitor, SystemBars } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

let audioRoot: Promise<string> | undefined;

export async function localAudioUrl(path: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) return path;
  audioRoot ??= Filesystem.getUri({
    directory:
      Capacitor.getPlatform() === "ios"
        ? Directory.Documents
        : Directory.External,
    path: "audio",
  }).then(({ uri }) => Capacitor.convertFileSrc(uri).replace(/\/$/, ""));
  return `${await audioRoot}/${encodeURIComponent(path.split("/").pop()!)}`;
}

export function configureNativeScreen() {
  if (!Capacitor.isNativePlatform()) return;
  const hideBars = () => {
    void SystemBars.hide().catch(console.warn);
  };
  hideBars();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) hideBars();
  });
}
