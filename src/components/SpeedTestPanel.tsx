import {
  ButtonItem,
  DialogButton,
  PanelSection,
  PanelSectionRow,
  Field,
  Spinner,
  Focusable,
} from "@decky/ui";
import { useSpeedTest } from "../hooks/useSpeedTest";
import { SpeedTestResult } from "../speedtest";
import { FC, CSSProperties, useState } from "react";
import { SpeedChart } from "./SpeedChart";
import {
  FaArrowDown, FaArrowUp, FaClock, FaRandom,
  FaServer, FaTrash, FaPlay, FaHistory, FaChevronDown, FaChevronUp,
} from "react-icons/fa";

// ---------------------------------------------------------------------------
// Formatters (speeds come in as bps from frontend engine)
// ---------------------------------------------------------------------------

const bpsToMbps = (bps: number): number => bps / 1_000_000;

const fmtSpeed = (bps: number): string => {
  const mbps = bpsToMbps(bps);
  if (mbps < 0) return "N/A";
  if (mbps === 0) return "0";
  return mbps >= 1000 ? `${(mbps / 1000).toFixed(1)}` : `${mbps.toFixed(1)}`;
};

const fmtUnit = (bps: number): string => bpsToMbps(bps) >= 1000 ? "Gbps" : "Mbps";

const fmtMs = (ms: number): string => {
  if (ms < 0) return "N/A";
  return `${ms.toFixed(1)} ms`;
};

const fmtTimestamp = (ts: number): string => {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const DL_COLOR = "#1a9fff";
const UL_COLOR = "#ff9800";
const PING_GOOD = "#4caf50";
const PING_MED = "#ff9800";
const PING_BAD = "#f44336";

const pingColor = (ms: number): string => {
  if (ms < 0) return "#888";
  if (ms < 30) return PING_GOOD;
  if (ms < 80) return PING_MED;
  return PING_BAD;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const card: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  borderRadius: "8px",
  padding: "8px 10px",
  marginTop: "6px",
  marginBottom: "6px",
};

const labelRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11px",
  opacity: 0.6,
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

const bigNum: CSSProperties = {
  fontSize: "26px",
  fontWeight: 800,
  lineHeight: 1.1,
};

const unitText: CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  opacity: 0.5,
  marginLeft: "4px",
};

// ---------------------------------------------------------------------------
// Live speed card with chart (for active phase)
// ---------------------------------------------------------------------------

const LivePhaseCard: FC<{
  phase: "download" | "upload";
  speed: number;       // bps
  samples: number[];   // bps array
}> = ({ phase, speed, samples }) => {
  const isDl = phase === "download";
  const color = isDl ? DL_COLOR : UL_COLOR;
  const icon = isDl ? <FaArrowDown /> : <FaArrowUp />;
  const label = isDl ? "Download" : "Upload";

  // Convert bps samples to Mbps for chart
  const mbpsSamples = samples.map(bpsToMbps);

  return (
    <div style={{ ...card, border: `1px solid ${color}33` }}>
      <div style={labelRow}>{icon} {label}</div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ ...bigNum, color }}>{fmtSpeed(speed)}</span>
        <span style={unitText}>{fmtUnit(speed)}</span>
      </div>
      <div style={{ marginTop: "6px" }}>
        <SpeedChart
          samples={mbpsSamples}
          color={color}
          gradientId={`${phase}Grad`}
          height={55}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Completed speed badge with mini chart
// ---------------------------------------------------------------------------

const CompletedBadge: FC<{
  phase: "download" | "upload";
  speed: number;       // bps
  samples: number[];   // bps array
}> = ({ phase, speed, samples }) => {
  const isDl = phase === "download";
  const color = isDl ? DL_COLOR : UL_COLOR;
  const icon = isDl ? <FaArrowDown /> : <FaArrowUp />;
  const label = isDl ? "Download" : "Upload";
  const mbpsSamples = samples.map(bpsToMbps);

  return (
    <div style={{ ...card, border: `1px solid ${color}22` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={labelRow}>{icon} {label}</div>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: "20px", fontWeight: 800, color }}>{fmtSpeed(speed)}</span>
          <span style={{ ...unitText, fontSize: "10px" }}>{fmtUnit(speed)}</span>
        </div>
      </div>
      <SpeedChart
        samples={mbpsSamples}
        color={color}
        gradientId={`${phase}ResultGrad`}
        height={40}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Ping/Jitter bar
// ---------------------------------------------------------------------------

const PingJitterBar: FC<{ ping: number; jitter: number }> = ({ ping, jitter }) => (
  <div style={{ ...card, display: "flex", gap: "12px" }}>
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ ...labelRow, justifyContent: "center" }}><FaClock /> Ping</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: pingColor(ping) }}>{fmtMs(ping)}</div>
    </div>
    <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }} />
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ ...labelRow, justifyContent: "center" }}><FaRandom /> Jitter</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: pingColor(jitter) }}>{fmtMs(jitter)}</div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Results screen
// ---------------------------------------------------------------------------

const ResultsScreen: FC<{
  result: SpeedTestResult;
  dlSamples: number[];
  ulSamples: number[];
}> = ({ result, dlSamples, ulSamples }) => (
  <PanelSection title="Results">
    <CompletedBadge phase="download" speed={result.download} samples={dlSamples} />
    <CompletedBadge phase="upload" speed={result.upload} samples={ulSamples} />
    <PingJitterBar ping={result.ping} jitter={result.jitter} />
    <PanelSectionRow>
      <Field label="Server" icon={<FaServer />} bottomSeparator="none">
        <span style={{ fontSize: "12px" }}>{result.server}</span>
      </Field>
    </PanelSectionRow>
  </PanelSection>
);

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

const MAX_VISIBLE_HISTORY = 5;

const historyHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  height: "40px",
  padding: "0 12px",
};

const historyBadge: CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  background: "rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "2px 8px",
  marginLeft: "6px",
};

const historyEntry: CSSProperties = {
  ...card,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 12px",
  marginTop: "4px",
  marginBottom: "4px",
  marginLeft: "4px",
  marginRight: "4px",
};

const HistorySection: FC<{ history: SpeedTestResult[]; onClear: () => void }> = ({ history, onClear }) => {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) return null;

  const visible = history.slice(0, MAX_VISIBLE_HISTORY);

  return (
    <PanelSection>
      <PanelSectionRow>
        <DialogButton
          onClick={() => setExpanded(!expanded)}
          style={historyHeaderStyle}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaHistory style={{ opacity: 0.6 }} />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>History</span>
            <span style={historyBadge}>{visible.length}</span>
          </div>
          {expanded ? <FaChevronUp style={{ opacity: 0.4 }} /> : <FaChevronDown style={{ opacity: 0.4 }} />}
        </DialogButton>
      </PanelSectionRow>

      {expanded && (
        <>
          {visible.map((entry, i) => (
            <div key={entry.timestamp || i} style={historyEntry}>
              <div>
                <div style={{ fontSize: "11px", opacity: 0.5, marginBottom: "3px" }}>
                  {fmtTimestamp(entry.timestamp)}
                </div>
                <div style={{ fontSize: "12px", display: "flex", gap: "8px" }}>
                  <span style={{ color: DL_COLOR }}>
                    <FaArrowDown style={{ fontSize: "9px", marginRight: "2px" }} />
                    {fmtSpeed(entry.download)}
                  </span>
                  <span style={{ color: UL_COLOR }}>
                    <FaArrowUp style={{ fontSize: "9px", marginRight: "2px" }} />
                    {fmtSpeed(entry.upload)}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: pingColor(entry.ping) }}>
                  {fmtMs(entry.ping)}
                </div>
                <div style={{ fontSize: "10px", opacity: 0.4 }}>ping</div>
              </div>
            </div>
          ))}
          <PanelSectionRow>
            <DialogButton
              onClick={onClear}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", width: "100%" }}
            >
              <FaTrash style={{ fontSize: "10px" }} /> Clear
            </DialogButton>
          </PanelSectionRow>
        </>
      )}
    </PanelSection>
  );
};

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const SpeedTestPanel: FC = () => {
  const {
    phase, isRunning, result, history, error,
    downloadSpeed, uploadSpeed, downloadSamples, uploadSamples,
    completedDownload,
    startTest, cancelTest, clearHistory,
  } = useSpeedTest();

  const isIdle = phase === "idle";
  const isComplete = phase === "complete";
  const isError = phase === "error";

  return (
    <div>
      <PanelSection>
        {/* Start / Cancel button */}
        <PanelSectionRow>
          <DialogButton
            onClick={isRunning ? cancelTest : startTest}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "40px" }}
          >
            {isRunning ? <Spinner width={16} height={16} /> : <FaPlay />}
            {isRunning ? "Cancel Test" : "Run Speed Test"}
          </DialogButton>
        </PanelSectionRow>

        {/* Ping phase */}
        {isRunning && phase === "ping" && (
          <div style={{ ...card, textAlign: "center", marginTop: "8px" }}>
            <Spinner width={24} height={24} />
            <div style={{ fontSize: "12px", marginTop: "8px", opacity: 0.5 }}>
              Measuring latency...
            </div>
          </div>
        )}

        {/* Download phase — full width live chart */}
        {isRunning && phase === "download" && (
          <LivePhaseCard phase="download" speed={downloadSpeed} samples={downloadSamples} />
        )}

        {/* Upload phase — completed download badge + live upload chart */}
        {isRunning && phase === "upload" && (
          <>
            {completedDownload !== null && (
              <CompletedBadge phase="download" speed={completedDownload} samples={downloadSamples} />
            )}
            <LivePhaseCard phase="upload" speed={uploadSpeed} samples={uploadSamples} />
          </>
        )}

        {/* Error */}
        {isError && !isRunning && (
          <PanelSectionRow>
            <Field label="Error" bottomSeparator="none">
              <span style={{ color: "#f44336" }}>{error || "Unknown error"}</span>
            </Field>
          </PanelSectionRow>
        )}
      </PanelSection>

      {/* Final results with charts */}
      {(isComplete || (isIdle && result)) && result && (
        <ResultsScreen result={result} dlSamples={downloadSamples} ulSamples={uploadSamples} />
      )}

      {/* History */}
      <HistorySection history={history} onClear={clearHistory} />
    </div>
  );
};
