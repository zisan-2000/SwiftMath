"use client";

// Root error boundary. This only triggers when the root layout itself throws,
// so it must render its own <html>/<body> (it replaces the root layout). Kept
// minimal and dependency-free for maximum resilience.
//
// Next.js 16 note: the recovery prop is `unstable_retry` (it replaced `reset`).

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#52525b", margin: 0 }}>
          The application hit an unexpected error.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            border: "none",
            borderRadius: "0.5rem",
            background: "#4f46e5",
            color: "#fff",
            padding: "0.625rem 1.25rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
