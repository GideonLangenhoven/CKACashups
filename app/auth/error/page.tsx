"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="card" style={{ maxWidth: 520, margin: "2rem auto" }}>
      <h2>Authentication Error</h2>
      {error === "AccessDenied" && (
        <div>
          <p>You are not authorized to access this application.</p>
          <p>Please contact an administrator to request access.</p>
        </div>
      )}
      {error && error !== "AccessDenied" && (
        <div>
          <p>An error occurred during authentication:</p>
          <pre style={{ background: "#f5f5f5", padding: "1rem", borderRadius: 4 }}>
            {error}
          </pre>
        </div>
      )}
      <a href="/auth/signin" className="btn" style={{ marginTop: "1rem", display: "inline-block" }}>
        Back to Sign In
      </a>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
