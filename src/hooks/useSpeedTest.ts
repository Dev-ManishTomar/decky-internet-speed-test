import { useEffect, useState, useCallback, useRef } from "react";
import { callable } from "@decky/api";
import { SpeedTestEngine, SpeedTestResult, ProgressUpdate, fetchServerLocation } from "../speedtest";

const getHistoryBackend = callable<[], SpeedTestResult[]>("get_history");
const clearHistoryBackend = callable<[], SpeedTestResult[]>("clear_history");
const saveResultBackend = callable<[result: SpeedTestResult], void>("save_result");

export function useSpeedTest() {
  const [phase, setPhase] = useState<string>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [history, setHistory] = useState<SpeedTestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<string | null>(null);

  // Live speed values
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [downloadSamples, setDownloadSamples] = useState<number[]>([]);
  const [uploadSamples, setUploadSamples] = useState<number[]>([]);
  const [downloadP90, setDownloadP90] = useState(0);
  const [uploadP90, setUploadP90] = useState(0);

  // Completed phase values
  const [completedDownload, setCompletedDownload] = useState<number | null>(null);
  const [pingResult, setPingResult] = useState<{ ping: number; jitter: number } | null>(null);

  const engineRef = useRef<SpeedTestEngine | null>(null);

  useEffect(() => {
    getHistoryBackend().then(setHistory).catch(() => {});
    fetchServerLocation().then(setServer);
  }, []);

  const startTest = useCallback(() => {
    if (isRunning) return;

    // Reset everything
    setIsRunning(true);
    setResult(null);
    setError(null);
    setDownloadSpeed(0);
    setUploadSpeed(0);
    setDownloadSamples([]);
    setUploadSamples([]);
    setDownloadP90(0);
    setUploadP90(0);
    setCompletedDownload(null);
    setPingResult(null);

    if (engineRef.current) engineRef.current.stop();

    const engine = new SpeedTestEngine();
    engineRef.current = engine;

    let lastPhase = "idle";

    engine.onProgress = (update: ProgressUpdate) => {
      setPhase(update.phase);

      // When transitioning from download to upload, save download result
      if (lastPhase === "download" && update.phase === "upload") {
        setCompletedDownload(downloadP90Ref.current);
      }

      if (update.phase === "download") {
        setDownloadSpeed(update.speed);
        setDownloadSamples([...update.samples]);
        setDownloadP90(update.p90);
        downloadP90Ref.current = update.p90;
      }

      if (update.phase === "upload") {
        setUploadSpeed(update.speed);
        setUploadSamples([...update.samples]);
        setUploadP90(update.p90);
      }

      lastPhase = update.phase;
    };

    engine.onComplete = (res: SpeedTestResult) => {
      setPingResult({ ping: res.ping, jitter: res.jitter });
      setCompletedDownload(res.download);
      setResult(res);
      setIsRunning(false);
      setPhase("complete");
      saveResultBackend(res).catch(() => {});
      getHistoryBackend().then(setHistory).catch(() => {});
    };

    engine.onError = (msg: string) => {
      setError(msg);
      setIsRunning(false);
      setPhase("error");
    };

    engine.start();
  }, [isRunning]);

  // Ref to capture latest downloadP90 for phase transition
  const downloadP90Ref = useRef(0);

  const cancelTest = useCallback(() => {
    engineRef.current?.stop();
    setIsRunning(false);
    setPhase("idle");
  }, []);

  const clearHistory = useCallback(async () => {
    const h = await clearHistoryBackend();
    setHistory(h);
  }, []);

  return {
    phase,
    isRunning,
    result,
    history,
    error,
    server,
    downloadSpeed,
    uploadSpeed,
    downloadSamples,
    uploadSamples,
    downloadP90,
    uploadP90,
    completedDownload,
    pingResult,
    startTest,
    cancelTest,
    clearHistory,
  };
}
