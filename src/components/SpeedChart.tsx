import { FC, CSSProperties } from "react";

interface SpeedChartProps {
  samples: number[];
  color: string;
  gradientId: string;
  height?: number;
}

const CHART_WIDTH = 280;
const PADDING_X = 4;
const PADDING_TOP = 4;
const PADDING_BOTTOM = 2;

function buildPath(samples: number[], width: number, height: number): { line: string; area: string; maxVal: number } {
  if (samples.length === 0) return { line: "", area: "", maxVal: 0 };

  const maxVal = Math.max(...samples, 1);
  const drawW = width - PADDING_X * 2;
  const drawH = height - PADDING_TOP - PADDING_BOTTOM;

  const points = samples.map((val, i) => {
    const x = PADDING_X + (i / Math.max(samples.length - 1, 1)) * drawW;
    const y = PADDING_TOP + drawH - (val / maxVal) * drawH;
    return { x, y };
  });

  if (points.length === 1) {
    const p = points[0];
    return {
      line: `M ${p.x} ${p.y} L ${p.x + 1} ${p.y}`,
      area: `M ${p.x} ${height} L ${p.x} ${p.y} L ${p.x + 1} ${p.y} L ${p.x + 1} ${height} Z`,
      maxVal,
    };
  }

  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const area = `${line} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`;

  return { line, area, maxVal };
}

const containerStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.1) 100%)",
  borderRadius: "6px",
  overflow: "hidden",
};

export const SpeedChart: FC<SpeedChartProps> = ({
  samples,
  color,
  gradientId,
  height = 55,
}) => {
  const { line, area, maxVal } = buildPath(samples, CHART_WIDTH, height);
  const drawH = height - PADDING_TOP - PADDING_BOTTOM;

  if (samples.length === 0) {
    return (
      <div style={{ ...containerStyle, height: `${height}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", opacity: 0.4 }}>Waiting for data...</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {samples.length > 0 && (() => {
          const lastIdx = samples.length - 1;
          const lx = PADDING_X + (lastIdx / Math.max(samples.length - 1, 1)) * (CHART_WIDTH - PADDING_X * 2);
          const ly = PADDING_TOP + drawH - (samples[lastIdx] / maxVal) * drawH;
          return (
            <>
              <circle cx={lx} cy={ly} r="4" fill={color} opacity="0.3" />
              <circle cx={lx} cy={ly} r="2.5" fill={color} />
            </>
          );
        })()}
      </svg>
    </div>
  );
};
