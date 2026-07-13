"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

import {
  DEFAULT_OVERRIDE,
  INITIAL_OVERRIDES,
  type Override,
} from "./main-screen-overlay";

type Props = {
  regionCount: number;
  overrides: Record<number, Override>;
  setOverrides: Dispatch<SetStateAction<Record<number, Override>>>;
};

export function MainScreenOverlayDebugPanel({
  regionCount,
  overrides,
  setOverrides,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const adjustmentFor = (i: number): Override =>
    overrides[i] ?? INITIAL_OVERRIDES[i] ?? DEFAULT_OVERRIDE;
  const selectedAdj =
    selected !== null ? adjustmentFor(selected) : DEFAULT_OVERRIDE;

  const updateSelected = (patch: Partial<Override>) => {
    if (selected === null) return;
    setOverrides((prev) => ({
      ...prev,
      [selected]: { ...adjustmentFor(selected), ...patch },
    }));
  };

  const resetSelected = () => {
    if (selected === null) return;
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[selected];
      return next;
    });
  };

  const copyConfig = () => {
    const json = JSON.stringify(overrides, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).catch(() => {});
    }
    console.log("number overrides:", json);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 50,
        background: "rgba(0,0,0,0.78)",
        color: "#fff",
        padding: "10px 12px",
        borderRadius: 8,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.4,
        minWidth: 240,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        userSelect: "none",
      }}
    >
      <div
        style={{ marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap" }}
      >
        <span style={{ alignSelf: "center", opacity: 0.7 }}>Сегмент:</span>
        {Array.from({ length: regionCount }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.2)",
              background:
                selected === i ? "rgba(255,255,255,0.85)" : "transparent",
              color: selected === i ? "#000" : "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {selected === null ? (
        <div style={{ opacity: 0.65 }}>
          Кликни по цифре выше, чтобы редактировать сегмент.
        </div>
      ) : (
        <>
          {(["dx", "dy", "scale"] as const).map((field) => {
            const isScale = field === "scale";
            const min = isScale ? 0.1 : -3000;
            const max = isScale ? 3 : 3000;
            const step = isScale ? 0.01 : 5;
            const val = selectedAdj[field];
            return (
              <div
                key={field}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 70px",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span>{field}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={val}
                  onChange={(e) =>
                    updateSelected({ [field]: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  step={step}
                  value={val}
                  onChange={(e) =>
                    updateSelected({ [field]: Number(e.target.value) })
                  }
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 4,
                    padding: "2px 4px",
                    fontFamily: "inherit",
                    fontSize: 12,
                    width: "100%",
                  }}
                />
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              type="button"
              onClick={resetSelected}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Сброс
            </button>
            <button
              type="button"
              onClick={copyConfig}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.85)",
                color: "#000",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Скопировать JSON
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                marginLeft: "auto",
              }}
            >
              ×
            </button>
          </div>
        </>
      )}
    </div>
  );
}
