"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to send reset email");
        setLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>
        <h2>Check your email</h2>
        <p>We've sent a password reset link to <strong>{email}</strong>.</p>
        <p>Click the link in the email to set a new name for your account.</p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/auth/signin" className="btn" style={{ width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>
      <h2>Forgot your name?</h2>
      <p>Enter your email address and we'll send you a link to reset your name.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem" }}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="your.email@example.com"
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
          />
        </div>
        {error && (
          <div style={{ color: "red", marginBottom: "1rem", padding: "0.5rem", background: "#fee", borderRadius: 4 }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link href="/auth/signin" style={{ color: "#0066cc", textDecoration: "none", fontSize: "0.9rem" }}>
            Back to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
