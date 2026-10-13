import {
  defaultConfig,
  saveConfig,
  providerUrl,
  type AppConfig,
} from "./config";
import { importMedia } from "./media-store";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function createSettings(
  getConfig: () => AppConfig,
  onSave: (config: AppConfig) => void,
  onOpen: () => void,
  onClose: () => void,
) {
  const dialog = document.createElement("dialog");
  dialog.className = "settings";
  dialog.setAttribute("aria-label", "Ambiance settings");
  document.body.append(dialog);
  let draft: AppConfig,
    cardIndex = 0,
    sceneIndex = 0,
    busy = false;
  const message = (text: string) => {
    dialog.querySelector<HTMLElement>(".settings-status")!.textContent = text;
  };
  function collect() {
    const card = draft.cards[cardIndex],
      scene = card.scenes[sceneIndex];
    const val = (name: string) =>
      (dialog.querySelector(`[name="${name}"]`) as HTMLInputElement).value;
    card.name = val("card-name");
    card.color = val("card-color");
    scene.name = val("scene-name");
    scene.source.kind = val("source") as typeof scene.source.kind;
    scene.source.url = val("source-url");
    scene.poster = val("cover");
    scene.video = val("video") || undefined;
    draft.notch = {
      preset: val("notch") as AppConfig["notch"]["preset"],
      side: val("side") as AppConfig["notch"]["side"],
      width: +val("width"),
      depth: +val("depth"),
      offset: +val("offset"),
    };
  }
  function render() {
    const card = draft.cards[cardIndex],
      scene = card.scenes[sceneIndex];
    dialog.innerHTML = `<header class="settings-head"><img src="/ambiance/logo.svg" alt=""><div><h1>Ambiance</h1><p>Your space. Your sound.</p></div><button type="submit" form="settings-form" class="save-settings header-save">Save</button><button type="button" class="close-settings" aria-label="Close settings">×</button></header>
    <div class="settings-body"><aside><p class="eyebrow">YOUR CARDS</p>${draft.cards.map((c, i) => `<button type="button" class="card-tab ${i === cardIndex ? "chosen" : ""}" data-card="${i}"><i style="background:${c.color}"></i>${escape(c.name)}</button>`).join("")}<p class="settings-note">Hold the center button to return here.</p></aside>
    <form id="settings-form"><div class="section-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h2>${escape(card.name)}</h2></div><label class="color-field">Color<input name="card-color" type="color" value="${card.color}"></label></div>
    <label>Card name / genre<input name="card-name" maxlength="40" required value="${escape(card.name)}"></label>
    <div class="scene-tabs" aria-label="Scene">${card.scenes.map((_, i) => `<button type="button" data-scene="${i}" class="${i === sceneIndex ? "chosen" : ""}">Scene ${i + 1}</button>`).join("")}</div>
    <label>Scene name<input name="scene-name" maxlength="60" required value="${escape(scene.name)}"></label>
    <label>Audio source<select name="source">${[
      ["library", "Installed library"],
      ["files", "Files on this device"],
      ["youtube", "YouTube"],
      ["spotify", "Spotify"],
      ["soundcloud", "SoundCloud"],
    ]
      .map(
        ([value, name]) =>
          `<option value="${value}" ${scene.source.kind === value ? "selected" : ""}>${name}</option>`,
      )
      .join("")}</select></label>
    <label class="provider-field">Provider link<input name="source-url" type="url" placeholder="https://…" value="${escape(scene.source.url)}"></label>
    <div class="files-field"><button type="button" data-import="audio">Choose audio files</button><p class="file-list">${scene.source.files.length ? scene.source.files.map((f) => escape(f.name)).join(" · ") : "No imported audio files"}</p></div>
    <p class="source-help"></p>
    <div class="asset-row"><label>Cover image<input name="cover" value="${escape(scene.poster)}" placeholder="HTTPS image URL"></label><button type="button" data-import="image">Choose image</button></div>
    <div class="asset-row"><label>Looping video<input name="video" value="${escape(scene.video ?? "")}" placeholder="Optional HTTPS MP4 URL"></label><button type="button" data-import="video">Choose video</button></div>
    <p class="settings-note">Without a video, Ambiance uses a moving light background over your cover. Videos play without sound.</p>
    <details><summary>Screen shape & notch</summary><p class="settings-note">Auto fits Mi A3. Use None for iPad, or tune a shape for another device. Sizes use screen pixels.</p>
    <div class="form-grid"><label>Device / shape<select name="notch">${[
      ["auto", "Automatic"],
      ["none", "iPad / no cutout"],
      ["teardrop", "Mi A3 / teardrop"],
      ["wide", "Wide notch"],
      ["pill", "Pill cutout"],
      ["hole", "Camera hole"],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${draft.notch.preset === v ? "selected" : ""}>${n}</option>`,
      )
      .join("")}</select></label>
    <label>Edge<select name="side">${["auto", "left", "right", "top"].map((v) => `<option ${draft.notch.side === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    ${(["width", "depth", "offset"] as const).map((n) => `<label>${n === "offset" ? "Position (%)" : n}<input name="${n}" type="number" min="${n === "width" ? 20 : n === "depth" ? 5 : 10}" max="${n === "width" ? 300 : 90}" value="${draft.notch[n]}"></label>`).join("")}</div></details>
    <p class="settings-status" role="status" aria-live="polite"></p>
    <footer><button type="button" class="reset-settings">Reset cards</button><button type="submit" class="save-settings">Save changes</button></footer>
    <p class="about">Ambiance · MIT open source · 0.2.0<br>Your files stay on this device. Provider players connect only when opened.</p></form></div>`;
    const sourceSelect =
      dialog.querySelector<HTMLSelectElement>('[name="source"]')!;
    const sourceFields = () => {
      const kind = sourceSelect.value,
        provider = !["files", "library"].includes(kind);
      dialog.querySelector<HTMLElement>(".provider-field")!.hidden = !provider;
      dialog.querySelector<HTMLInputElement>("[name=source-url]")!.disabled =
        !provider;
      dialog.querySelector<HTMLElement>(".files-field")!.hidden =
        kind !== "files";
      dialog.querySelector(".source-help")!.textContent = provider
        ? "Opens the provider’s visible player. Internet and sign-in may be required. Provider playback does not use ambient mode or crossfades."
        : kind === "files"
          ? "Files are copied into Ambiance for reliable offline playback."
          : "Plays local recordings assigned to this scene. If none are installed, choose files on this device.";
    };
    sourceFields();
    sourceSelect.onchange = sourceFields;
    dialog.querySelectorAll<HTMLButtonElement>("[data-card]").forEach(
      (button) =>
        (button.onclick = () => {
          collect();
          cardIndex = +button.dataset.card!;
          sceneIndex = 0;
          render();
        }),
    );
    dialog.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach(
      (button) =>
        (button.onclick = () => {
          collect();
          sceneIndex = +button.dataset.scene!;
          render();
        }),
    );
    dialog.querySelector<HTMLButtonElement>(".close-settings")!.onclick = () =>
      dialog.close();
    dialog.querySelector<HTMLButtonElement>(".reset-settings")!.onclick =
      () => {
        draft = defaultConfig();
        cardIndex = 0;
        sceneIndex = 0;
        render();
        message("Default cards restored. Save to apply.");
      };
    dialog.querySelectorAll<HTMLButtonElement>("[data-import]").forEach(
      (button) =>
        (button.onclick = async () => {
          collect();
          busy = true;
          dialog
            .querySelectorAll<HTMLButtonElement>("button")
            .forEach((b) => (b.disabled = true));
          message("Copying selected files…");
          try {
            const kind = button.dataset.import as "audio" | "image" | "video";
            const files = await importMedia(kind);
            if (files.length) {
              const target = draft.cards[cardIndex].scenes[sceneIndex];
              if (kind === "audio") {
                target.source = { kind: "files", url: "", files };
              } else if (kind === "image") target.poster = files[0].uri;
              else target.video = files[0].uri;
            }
            render();
            message(
              files.length
                ? "Files copied. Save to apply."
                : "No files selected.",
            );
          } catch (error) {
            render();
            message(
              error instanceof Error ? error.message : "File import failed.",
            );
          } finally {
            busy = false;
          }
        }),
    );
    dialog.querySelector<HTMLFormElement>("form")!.onsubmit = (event) => {
      event.preventDefault();
      if (busy) return;
      try {
        collect();
        saveConfig(draft);
        onSave(structuredClone(draft));
        dialog.close();
      } catch (error) {
        message((error as Error).message);
      }
    };
  }
  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });
  dialog.addEventListener("close", onClose);
  return {
    open() {
      draft = structuredClone(getConfig());
      render();
      dialog.showModal();
      onOpen();
    },
    get openNow() {
      return dialog.open;
    },
  };
}
export function openProvider(kind: string, url: string, onClose: () => void) {
  const dialog = document.createElement("dialog");
  dialog.className = "provider-dialog";
  const close = document.createElement("button");
  close.textContent = "Return to Ambiance";
  const note = document.createElement("p");
  note.textContent =
    "Use the provider controls to play. Closing this player stops its audio.";
  const frame = document.createElement("iframe");
  frame.src = providerUrl(kind, url);
  frame.title = `${kind} player`;
  frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allowFullscreen = true;
  dialog.append(close, note, frame);
  document.body.append(dialog);
  close.onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    frame.src = "about:blank";
    dialog.remove();
    onClose();
  });
  dialog.showModal();
}
