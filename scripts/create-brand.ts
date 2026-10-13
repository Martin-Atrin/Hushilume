import { writeFile, mkdir } from "node:fs/promises";
await mkdir("public/hushilume", { recursive: true });
const mark = `<path d="M120 40H76C56 40 40 56 40 76V120H76A44 44 0 0 1 120 76Z" fill="#b9dc9c"/><path d="M136 40H180C200 40 216 56 216 76V120H180A44 44 0 0 0 136 76Z" fill="#e8b8c5"/><path d="M40 136V180C40 200 56 216 76 216H120V180A44 44 0 0 0 76 136Z" fill="#ecc187"/><path d="M216 136V180C216 200 200 216 180 216H136V180A44 44 0 0 1 180 136Z" fill="#9acbdc"/><circle cx="128" cy="128" r="23" fill="#f2efde"/>`;
await writeFile(
  "public/hushilume/logo.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="58" fill="#101714"/>${mark}</svg>`,
);
for (const [name, color, second] of [
  ["nature", "#75966a", "#d3dca8"],
  ["lofi", "#986f88", "#e3b2a9"],
  ["lounge", "#987442", "#efc889"],
  ["focus", "#47718e", "#9ed5d2"],
]) {
  await writeFile(
    `public/hushilume/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><defs><radialGradient id="g"><stop stop-color="${color}"/><stop offset="1" stop-color="#101714"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="65"/></filter></defs><rect width="1600" height="1000" fill="url(#g)"/><g filter="url(#b)" fill="none" stroke="${second}" stroke-width="75" opacity=".35"><ellipse cx="950" cy="470" rx="600" ry="170" transform="rotate(-25 950 470)"/><ellipse cx="850" cy="520" rx="520" ry="210" transform="rotate(20 850 520)"/></g><path d="M-100 870Q350 550 850 850T1700 650V1100H-100" fill="#101714" opacity=".5"/></svg>`,
  );
}
await writeFile(
  "public/hushilume/banner.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><rect width="1200" height="400" rx="24" fill="#101714"/><g transform="translate(120 72)">${mark}</g><text x="445" y="203" fill="#f2efde" font-family="sans-serif" font-size="78" letter-spacing="-4">Hushilume</text><text x="450" y="252" fill="#a9bba8" font-family="sans-serif" font-size="22" letter-spacing="2">YOUR SPACE. YOUR SOUND.</text><text x="450" y="316" fill="#718779" font-family="sans-serif" font-size="14" letter-spacing="2">ANDROID · iPAD · OPEN SOURCE</text></svg>`,
);
