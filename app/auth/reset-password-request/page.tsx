"use client";
import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim() || !name.trim()) {
      setError("Email and name are required");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          newPassword: newPassword || null
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setEmail("");
        setName("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>
      <h2>Reset Password</h2>
      <p style={{ marginBottom: 20, color: "#64748b", fontSize: "0.9rem" }}>
        Enter your email and name to reset your password. You can also clear your password to use email-only sign-in.
      </p>

      {success ? (
        <div style={{ padding: 16, background: "#d1fae5", color: "#065f46", borderRadius: 6, marginBottom: 16 }}>
          <strong>✓ Password updated successfully!</strong>
          <p style={{ margin: "8px 0 0 0", fontSize: "0.9rem" }}>
            You can now <Link href="/auth/signin" style={{ color: "#059669", textDecoration: "underline" }}>sign in</Link> with your new password.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email" className="label">Email Address</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="your.email@example.com"
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="name" className="label">Name</label>
          <input
            id="name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            placeholder="Your Name"
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="newPassword" className="label">
            New Password (optional - leave blank to remove password)
          </label>
          <input
            id="newPassword"
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            placeholder="Enter new password or leave blank"
          />
        </div>

        {newPassword && (
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Confirm your password"
            />
          </div>
        )}

        {error && (
          <div style={{ color: "red", marginBottom: "1rem", padding: "0.5rem", background: "#fee", borderRadius: 4 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Updating..." : "Reset Password"}
        </button>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link href="/auth/signin" style={{ color: "#0066cc", textDecoration: "none", fontSize: "0.9rem" }}>
            ← Back to Sign In
          </Link>
        </div>

        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
          <img src="/CKAlogo.png" alt="CKA Logo" style={{ height: "60px", width: "auto" }} />
        </div>
      </form>
    </div>
  );
}
