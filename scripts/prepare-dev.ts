import { access, writeFile } from "node:fs/promises";
try {
  await access("public/library.json");
} catch {
  await writeFile(
    "public/library.json",
    JSON.stringify({ version: 3, tracks: [] }),
  );
}
