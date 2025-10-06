"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
};

export default function DatePicker({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const isDateSupported = useMemo(() => {
    if (typeof document === "undefined") return true;
    const i = document.createElement("input");
    i.setAttribute("type", "date");
    return i.type === "date";
  }, []);

  const selectedDate: Date | null = useMemo(() => {
    if (!value) return null;
    // Value is YYYY-MM-DD; new Date(value) parses as UTC. For display only, okay.
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [cursor, setCursor] = useState<Date>(selectedDate || new Date());
  useEffect(() => {
    if (selectedDate) setCursor(selectedDate);
  }, [selectedDate]);

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

  function pick(d: Date) {
    const v = format(d, "yyyy-MM-dd");
    onChange(v);
    setOpen(false);
    // Also set value on the native input for consistency
    if (inputRef.current) inputRef.current.value = v;
  }

  function handleInputClick() {
    // Always show custom calendar picker when clicking the field
    setOpen(true);
  }

  // Build calendar grid for current cursor month
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }); // Sun
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

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
        placeholder="YYYY-MM-DD"
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
            width: 260,
          }}
        >
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCursor((c) => addMonths(c, -1))}
            >
              ◀
            </button>
            <div style={{ fontWeight: 600 }}>{format(cursor, "MMMM yyyy")}</div>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              ▶
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 12, color: "#475569", marginBottom: 4 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} style={{ textAlign: "center" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {days.map((d) => {
              const inMonth = isSameMonth(d, cursor);
              const sel = selectedDate && isSameDay(d, selectedDate);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => pick(d)}
                  style={{
                    padding: "6px 0",
                    borderRadius: 6,
                    border: "1px solid #e5eaf0",
                    background: sel ? "var(--brand)" : "#fff",
                    color: sel ? "#fff" : inMonth ? "#0b2b50" : "#94a3b8",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
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
              onClick={() => pick(new Date())}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

