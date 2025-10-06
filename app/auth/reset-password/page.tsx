"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        // Redirect to sign in after 2 seconds
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      } else {
        setError(data.error || "Failed to reset name");
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
        <h2>Name reset successful!</h2>
        <p>Your name has been updated. Redirecting to sign in...</p>
      </div>
    );
  }

  if (!token || error === "Invalid or missing reset token") {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>
        <h2>Invalid Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/auth/forgot-password" className="btn" style={{ width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}>
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>
      <h2>Reset your name</h2>
      <p>Enter a new name for your account.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem" }}>
            New Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            placeholder="Your Name"
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
          />
        </div>
        {error && error !== "Invalid or missing reset token" && (
          <div style={{ color: "red", marginBottom: "1rem", padding: "0.5rem", background: "#fee", borderRadius: 4 }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Updating..." : "Update Name"}
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

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
