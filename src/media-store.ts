import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FilePicker } from "@capawesome/capacitor-file-picker";
const urls = new Map<string, string>();
async function database() {
  // Keep the original database name so installed imports survive the rename.
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("ambiance-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function blobStore(id: string, blob?: Blob): Promise<Blob> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      "files",
      blob ? "readwrite" : "readonly",
    );
    const request = blob
      ? transaction.objectStore("files").put(blob, id)
      : transaction.objectStore("files").get(id);
    let result: Blob;
    request.onsuccess = () => {
      result = blob ?? request.result;
    };
    transaction.oncomplete = () => {
      db.close();
      result
        ? resolve(result)
        : reject(Error("Imported file is missing. Import it again."));
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
export async function importMedia(kind: "audio" | "image" | "video") {
  const result = await FilePicker.pickFiles({
    types: [`${kind}/*`],
    limit: kind === "audio" ? 0 : 1,
    readData: false,
  });
  const imported: { name: string; uri: string }[] = [];
  for (const file of result.files) {
    const id = crypto.randomUUID();
    if (Capacitor.isNativePlatform()) {
      await Filesystem.mkdir({
        directory: Directory.Data,
        path: "imports",
        recursive: true,
      }).catch(() => {});
      const extension =
        file.name
          .split(".")
          .pop()
          ?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
      const relative = `imports/${id}.${extension}`;
      const { uri } = await Filesystem.getUri({
        directory: Directory.Data,
        path: relative,
      });
      if (!file.path) throw Error("The selected file is unavailable.");
      await FilePicker.copyFile({ from: file.path, to: uri });
      imported.push({ name: file.name, uri: `asset:native/${relative}` });
    } else {
      if (!file.blob) throw Error("The selected file is unavailable.");
      await blobStore(id, file.blob);
      imported.push({ name: file.name, uri: `asset:web/${id}` });
    }
  }
  return imported;
}
export async function resolveMedia(uri: string): Promise<string> {
  // Saved settings from versions before Hushilume use the old artwork path.
  if (uri.startsWith("/ambiance/")) uri = uri.replace("/ambiance/", "/hushilume/");
  if (!uri.startsWith("asset:")) return uri;
  if (urls.has(uri)) return urls.get(uri)!;
  let resolved: string;
  if (uri.startsWith("asset:native/")) {
    const file = await Filesystem.getUri({
      directory: Directory.Data,
      path: uri.slice(13),
    });
    resolved = Capacitor.convertFileSrc(file.uri);
  } else resolved = URL.createObjectURL(await blobStore(uri.slice(10)));
  urls.set(uri, resolved);
  return resolved;
}
