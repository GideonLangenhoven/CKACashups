"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password || null }),
      });

      if (res.ok) {
        router.push("/trips");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to set password");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: null }),
      });

      if (res.ok) {
        router.push("/trips");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 400, margin: "0 auto", paddingTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Choose a Password</h2>
        <p style={{ marginBottom: 20, color: "#64748b", fontSize: "0.9rem" }}>
          Set a password for your account, or skip this step to continue using email sign-in only.
        </p>

        <form onSubmit={handleSetPassword} className="stack">
          <div>
            <label className="label">Password (optional)</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to skip"
            />
          </div>

          {password && (
            <div>
              <label className="label">Confirm Password</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </div>
          )}

          {error && <div style={{ color: "red", fontSize: "0.9rem" }}>{error}</div>}

          <div className="row" style={{ gap: 8 }}>
            <button
              type="submit"
              className="btn"
              disabled={loading}
            >
              {password ? "Set Password" : "Continue without Password"}
            </button>
            {password && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setPassword("");
                  setConfirmPassword("");
                }}
                disabled={loading}
              >
                Clear
              </button>
            )}
          </div>

          {!password && (
            <button
              type="button"
              className="btn ghost"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip this step
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
