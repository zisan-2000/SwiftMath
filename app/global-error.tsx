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
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          :root {
            color-scheme: light dark;
            --background: #fafafa;
            --foreground: #18181b;
            --muted: #52525b;
            --primary: #4f46e5;
            --primary-foreground: #ffffff;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --background: #18181b;
              --foreground: #fafafa;
              --muted: #a1a1aa;
              --primary: #6366f1;
            }
          }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 1.5rem;
            text-align: center;
            font-family: system-ui, sans-serif;
            background: var(--background);
            color: var(--foreground);
          }
          p {
            color: var(--muted);
            margin: 0;
          }
          button {
            border: none;
            border-radius: 0.5rem;
            background: var(--primary);
            color: var(--primary-foreground);
            padding: 0.625rem 1.25rem;
            font-weight: 500;
            cursor: pointer;
          }
          button:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
          }
        `}</style>
      </head>
      <body>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p>The application hit an unexpected error.</p>
        <button type="button" onClick={() => unstable_retry()}>
          Try again
        </button>
      </body>
    </html>
  );
}
