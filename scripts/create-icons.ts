import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const svg = "public/hushilume/logo.svg";
const ios = "ios/App/App/Assets.xcassets/AppIcon.appiconset";
await mkdir(ios, { recursive: true });
await sharp(svg).resize(1024, 1024).png().toFile(`${ios}/AppIcon-512@2x.png`);
await writeFile(
  `${ios}/Contents.json`,
  JSON.stringify(
    {
      images: [
        {
          filename: "AppIcon-512@2x.png",
          idiom: "universal",
          platform: "ios",
          size: "1024x1024",
        },
      ],
      info: { author: "xcode", version: 1 },
    },
    null,
    2,
  ),
);
for (const [density, size] of [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
] as const) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  await mkdir(dir, { recursive: true });
  await sharp(svg).resize(size, size).png().toFile(`${dir}/ic_launcher.png`);
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`${dir}/ic_launcher_round.png`);
}
import { readFile } from "node:fs/promises";
const content = await readFile(svg, "utf8");
const paths = [...content.matchAll(/<path d="([^"]+)" fill="([^"]+)"\/>/g)]
  .map(
    ([, d, color]) =>
      `<path android:pathData="${d}" android:fillColor="${color}"/>`,
  )
  .join("");
await writeFile(
  "android/app/src/main/res/drawable/ic_launcher_foreground.xml",
  `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="256" android:viewportHeight="256"><group android:scaleX="0.8" android:scaleY="0.8" android:translateX="25.6" android:translateY="25.6">${paths}<path android:pathData="M105,128a23,23 0,1 0,46 0a23,23 0,1 0,-46 0" android:fillColor="#f2efde"/></group></vector>`,
);
await writeFile(
  "android/app/src/main/res/values/ic_launcher_background.xml",
  '<resources><color name="ic_launcher_background">#101714</color></resources>',
);
for (const file of ["ic_launcher.xml", "ic_launcher_round.xml"])
  await writeFile(
    `android/app/src/main/res/mipmap-anydpi-v26/${file}`,
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>',
  );
await writeFile(
  "android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml",
  await readFile(
    "android/app/src/main/res/drawable/ic_launcher_foreground.xml",
  ),
);
await sharp(svg)
  .resize(1024, 1024)
  .flatten({ background: "#101714" })
  .png()
  .toFile(`${ios}/AppIcon-512@2x.png`);
const logo = await sharp(svg).resize(680, 680).png().toBuffer();
const splash = await sharp({
  create: { width: 2732, height: 2732, channels: 3, background: "#101714" },
})
  .composite([{ input: logo, gravity: "center" }])
  .png()
  .toBuffer();
for (const name of [
  "splash-2732x2732.png",
  "splash-2732x2732-1.png",
  "splash-2732x2732-2.png",
])
  await writeFile(
    `ios/App/App/Assets.xcassets/Splash.imageset/${name}`,
    splash,
  );
