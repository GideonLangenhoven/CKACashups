"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { csrfFetch } from "@/lib/client/csrfFetch";

export default function SignIn() {
  const router = useRouter();
  const { user, loading: sessionLoading, refreshSession } = useSession();
  const redirectAfterLogin = "/trips"; // Send users to My Trips (guides will auto-redirect to earnings)

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      setSubmitting(false);
      return;
    }

    try {
      const res = await csrfFetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (res.ok) {
        await refreshSession();
        router.push(redirectAfterLogin);
        router.refresh();
      } else {
        setError(data.error || "Sign-in failed");
        setSubmitting(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  // If already signed in, bounce to new cash up directly
  if (!sessionLoading && user) {
    // Render nothing and redirect
    if (typeof window !== "undefined") {
      router.replace(redirectAfterLogin);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "2rem auto" }}>
      <h2>Sign in</h2>
      <p>Enter your email address and name to sign in.</p>
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
            disabled={submitting}
            placeholder="your.email@example.com"
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem" }}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            placeholder="Your Name"
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
          />
        </div>
        {error && (
          <div style={{ color: "red", marginBottom: "1rem", padding: "0.5rem", background: "#fee", borderRadius: 4 }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
          <img src="/CKAlogo.png" alt="CKA Logo" style={{ height: "60px", width: "auto" }} />
        </div>
      </form>
    </div>
  );
}
