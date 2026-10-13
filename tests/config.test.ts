import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultConfig, validateConfig, providerUrl } from "../src/config.ts";
test("provider URLs are normalized and reject lookalike hosts and unsafe schemes", () => {
  assert.match(
    providerUrl("youtube", "https://youtu.be/abcdefghijk?t=42"),
    /youtube.com\/embed\/abcdefghijk/,
  );
  assert.equal(
    providerUrl(
      "spotify",
      "https://open.spotify.com/intl-en/track/abc123?si=x",
    ),
    "https://open.spotify.com/embed/track/abc123",
  );
  assert.match(
    providerUrl("soundcloud", "https://soundcloud.com/artist/track"),
    /^https:\/\/w.soundcloud.com\/player/,
  );
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=abcdefghijk",
    "https://youtu.be/nope",
  ])
    assert.throws(() => providerUrl("youtube", url));
});
test("invalid imported settings cannot save dangerous assets or unusable sources", () => {
  const config = defaultConfig();
  assert.equal(validateConfig(config).cards.length, 4);
  config.cards[0].scenes[0].poster = "javascript:alert(1)";
  assert.throws(() => validateConfig(config));
  config.cards[0].scenes[0].poster = "/ambiance/nature.svg";
  config.cards[0].scenes[0].source.kind = "files";
  assert.throws(() => validateConfig(config));
});
test("notch dimensions reject invalid values", () => {
  const config = defaultConfig();
  config.notch.width = NaN;
  assert.throws(() => validateConfig(config));
});
