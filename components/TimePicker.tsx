"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string; // HH:mm
  onChange: (value: string) => void;
  minuteStep?: number; // default 5
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function TimePicker({ value, onChange, minuteStep = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [selHour, setSelHour] = useState<number>(0);
  const [selMinute, setSelMinute] = useState<number>(0);

  const isTimeSupported = useMemo(() => {
    if (typeof document === "undefined") return true;
    const i = document.createElement("input");
    i.setAttribute("type", "time");
    return i.type === "time";
  }, []);

  useEffect(() => {
    // Parse incoming value when it changes
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(":").map((v) => parseInt(v, 10));
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        setSelHour(Math.min(23, Math.max(0, h)));
        setSelMinute(Math.min(59, Math.max(0, m)));
      }
    }
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function handleInputClick() {
    // Always show custom time picker when clicking the field
    // Initialize from current value or now
    if (!value || !/^\d{2}:\d{2}$/.test(value)) {
      const now = new Date();
      setSelHour(now.getHours());
      setSelMinute(now.getMinutes());
    }
    setOpen(true);
  }

  function pick(h: number, m: number) {
    const v = `${pad(h)}:${pad(m)}`;
    onChange(v);
    setOpen(false);
    if (inputRef.current) inputRef.current.value = v;
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = useMemo(() => {
    const step = Math.max(1, Math.min(30, minuteStep));
    const arr: number[] = [];
    for (let i = 0; i < 60; i += step) arr.push(i);
    // Ensure selected minute appears even if not on step
    if (!arr.includes(selMinute)) arr.push(selMinute);
    return arr.sort((a, b) => a - b);
  }, [minuteStep, selMinute]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        className="input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={handleInputClick}
        onFocus={handleInputClick}
        readOnly
        placeholder="HH:MM"
      />

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            background: "#fff",
            border: "1px solid #e5eaf0",
            borderRadius: 8,
            padding: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 20,
            width: 280,
          }}
        >
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>Select time</div>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  const now = new Date();
                  pick(now.getHours(), now.getMinutes());
                }}
              >
                Now
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Hour</div>
              <div style={{
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid #e5eaf0",
                borderRadius: 6,
                padding: 4,
              }}>
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelHour(h)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid transparent",
                      background: selHour === h ? "var(--brand)" : "transparent",
                      color: selHour === h ? "#fff" : "#0b2b50",
                      cursor: "pointer",
                    }}
                  >
                    {pad(h)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Minute</div>
              <div style={{
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid #e5eaf0",
                borderRadius: 6,
                padding: 4,
              }}>
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pick(selHour, m)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid transparent",
                      background: selMinute === m ? "var(--brand)" : "transparent",
                      color: selMinute === m ? "#fff" : "#0b2b50",
                      cursor: "pointer",
                    }}
                  >
                    {pad(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

