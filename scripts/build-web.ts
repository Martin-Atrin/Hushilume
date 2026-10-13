import { execFileSync } from "node:child_process";
import { cp, mkdir, writeFile } from "node:fs/promises";
const privateBuild = process.argv.includes("--private");
execFileSync("npx", ["tsc", "--noEmit"], { stdio: "inherit" });
execFileSync("npx", ["vite", "build", "--mode", "android"], {
  stdio: "inherit",
});
for (const entry of ["hushilume", "fonts"])
  await cp(`public/${entry}`, `dist-android/${entry}`, { recursive: true });
if (privateBuild) {
  for (const entry of [
    "scenes",
    "videos",
    "library.json",
    "profile.json",
    "licenses",
  ])
    await cp(`public/${entry}`, `dist-android/${entry}`, { recursive: true });
} else {
  await writeFile(
    "dist-android/library.json",
    JSON.stringify({ version: 3, tracks: [] }),
  );
}
console.log(
  privateBuild
    ? "Private library profile bundled; audio remains on the device."
    : "Public build: no private audio, metadata, photos, or videos included.",
);
