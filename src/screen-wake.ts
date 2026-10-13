import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";

/** Keep the visible player awake without changing the device's sleep settings. */
export class ScreenWake {
  private lock?: WakeLockSentinel;
  private wanted = false;
  private busy = false;
  private revision = 0;
  private nativeActive = false;

  get active() {
    return this.nativeActive || (!!this.lock && !this.lock.released);
  }

  setPlaying(playing: boolean) {
    this.wanted = playing && document.visibilityState === "visible";
    this.revision++;
    void this.sync();
  }

  private async sync() {
    const native = Capacitor.isNativePlatform();
    if (this.busy || (!native && !("wakeLock" in navigator))) return;
    this.busy = true;
    const revision = this.revision;
    try {
      if (native) {
        if (this.wanted) await KeepAwake.keepAwake();
        else await KeepAwake.allowSleep();
        this.nativeActive = this.wanted;
      } else if (!this.wanted && this.lock) {
        await this.lock.release();
        this.lock = undefined;
      } else if (this.wanted && !this.active) {
        const lock = await navigator.wakeLock.request("screen");
        this.lock = lock;
        lock.addEventListener(
          "release",
          () => {
            if (this.lock === lock) this.lock = undefined;
          },
          { once: true },
        );
        // Pause or page hiding can occur while the request is pending.
        if (!this.wanted) {
          await lock.release();
          if (this.lock === lock) this.lock = undefined;
        }
      }
    } catch (error) {
      // A denied wake lock must never stop audio or trigger a retry loop.
      console.warn("Screen wake lock unavailable:", error);
    } finally {
      this.busy = false;
      if (revision !== this.revision) void this.sync();
    }
  }
}
