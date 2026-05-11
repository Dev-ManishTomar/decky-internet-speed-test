/**
 * Frontend-based speed test engine using browser fetch().
 *
 * Runs entirely in the browser (Chromium on Steam Deck) so SSL works natively.
 * Uses Cloudflare's methodology: progressive request sizes, 90th percentile,
 * sequential requests to avoid rate limiting.
 */

export interface SpeedTestResult {
  download: number;   // bps
  upload: number;     // bps
  ping: number;       // ms
  jitter: number;     // ms
  server: string;
  timestamp: number;
}

export type TestPhase = "idle" | "ping" | "download" | "upload" | "complete" | "error";

export interface ProgressUpdate {
  phase: TestPhase;
  speed: number;      // current bps
  samples: number[];  // all bps samples for chart
  p90: number;        // 90th percentile bps
}

interface BandwidthPoint {
  bytes: number;
  bps: number;
  duration: number;
}

const MIN_DURATION_MS = 10;
const MAX_DURATION_MS = 3000;
const P90 = 0.9;
const P50 = 0.5;

const DOWNLOAD_CONFIG = [
  { bytes: 100_000, count: 4 },
  { bytes: 1_000_000, count: 6 },
  { bytes: 5_000_000, count: 5 },
  { bytes: 10_000_000, count: 4 },
  { bytes: 25_000_000, count: 3 },
];

const UPLOAD_CONFIG = [
  { bytes: 100_000, count: 4 },
  { bytes: 500_000, count: 5 },
  { bytes: 1_000_000, count: 5 },
  { bytes: 5_000_000, count: 4 },
  { bytes: 10_000_000, count: 3 },
];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function calcBandwidth(points: BandwidthPoint[]): number {
  const valid = points.filter((p) => p.duration >= MIN_DURATION_MS);
  if (valid.length === 0) return 0;
  const speeds = valid.map((p) => p.bps).sort((a, b) => a - b);
  return percentile(speeds, P90);
}

export async function fetchServerLocation(): Promise<string> {
  try {
    const resp = await fetch("https://speed.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
    const text = await resp.text();
    const colo = text.match(/colo=(\w+)/);
    return colo ? colo[1] : "Unknown";
  } catch {
    return "Unknown";
  }
}

export class SpeedTestEngine {
  private ac: AbortController | null = null;
  private running = false;

  onProgress: (update: ProgressUpdate) => void = () => {};
  onComplete: (result: SpeedTestResult) => void = () => {};
  onError: (msg: string) => void = () => {};

  get isRunning(): boolean {
    return this.running;
  }

  stop(): void {
    this.running = false;
    this.ac?.abort();
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.ac = new AbortController();

    try {
      // Ping
      this.onProgress({ phase: "ping", speed: 0, samples: [], p90: 0 });
      const { latency, jitter } = await this.measurePing();

      if (!this.running) return;

      // Download
      this.onProgress({ phase: "download", speed: 0, samples: [], p90: 0 });
      const dl = await this.measureTransfer("download", DOWNLOAD_CONFIG);

      if (!this.running) return;

      // Upload
      this.onProgress({ phase: "upload", speed: 0, samples: [], p90: 0 });
      const ul = await this.measureTransfer("upload", UPLOAD_CONFIG);

      const server = await fetchServerLocation();

      const result: SpeedTestResult = {
        download: dl,
        upload: ul,
        ping: latency,
        jitter,
        server,
        timestamp: Date.now() / 1000,
      };

      this.onProgress({ phase: "complete", speed: 0, samples: [], p90: 0 });
      this.onComplete(result);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      this.onError(err instanceof Error ? err.message : String(err));
    } finally {
      this.running = false;
    }
  }

  private async measurePing(): Promise<{ latency: number; jitter: number }> {
    const pings: number[] = [];

    for (let i = 0; i < 20; i++) {
      if (!this.running) break;
      try {
        const start = performance.now();
        await fetch(`https://speed.cloudflare.com/__down?bytes=0&r=${Math.random()}`, {
          signal: this.ac!.signal,
          cache: "no-store",
        });
        pings.push(performance.now() - start);
      } catch { /* ignore */ }
      await this.sleep(50);
    }

    if (pings.length === 0) return { latency: 0, jitter: 0 };

    const sorted = [...pings].sort((a, b) => a - b);
    const latency = percentile(sorted, P50);
    const jitter = pings.reduce((s, p) => s + Math.abs(p - latency), 0) / pings.length;
    return { latency, jitter };
  }

  private async measureTransfer(
    type: "download" | "upload",
    config: { bytes: number; count: number }[],
  ): Promise<number> {
    const all: BandwidthPoint[] = [];
    let shouldStop = false;

    let uploadData: Uint8Array | null = null;
    if (type === "upload") {
      const maxBytes = Math.max(...config.map((c) => c.bytes));
      uploadData = new Uint8Array(maxBytes);
      crypto.getRandomValues(new Uint8Array(uploadData.buffer, 0, Math.min(65536, maxBytes)));
      for (let off = 65536; off < maxBytes; off += 65536) {
        uploadData.set(uploadData.subarray(0, Math.min(65536, maxBytes - off)), off);
      }
    }

    for (const { bytes, count } of config) {
      if (!this.running || shouldStop) break;

      for (let i = 0; i < count; i++) {
        if (!this.running || shouldStop) break;

        try {
          const start = performance.now();
          let transferBytes: number;

          if (type === "download") {
            const resp = await fetch(
              `https://speed.cloudflare.com/__down?bytes=${bytes}&r=${Math.random()}`,
              { signal: this.ac!.signal, cache: "no-store" },
            );
            const blob = await resp.blob();
            transferBytes = blob.size;
          } else {
            const data = uploadData!.slice(0, bytes);
            const resp = await fetch("https://speed.cloudflare.com/__up", {
              method: "POST",
              body: new Blob([data]),
              signal: this.ac!.signal,
            });
            if (!resp.ok) continue;
            transferBytes = bytes;
          }

          const duration = performance.now() - start;
          const bps = (transferBytes * 8) / (duration / 1000);

          all.push({ bytes, bps, duration });

          const currentSpeed = calcBandwidth(all);
          this.onProgress({
            phase: type,
            speed: currentSpeed,
            samples: all.map((m) => m.bps),
            p90: currentSpeed,
          });

          if (duration > MAX_DURATION_MS) {
            shouldStop = true;
            break;
          }
        } catch { /* ignore individual failures */ }
      }
    }

    return calcBandwidth(all);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
