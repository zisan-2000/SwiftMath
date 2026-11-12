import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("dashboard-section", className)}>
      <div className="dashboard-section-heading">
        <div className="min-w-0">
          {eyebrow && <p className="dashboard-eyebrow">{eyebrow}</p>}
          <h2 className="dashboard-section-title">{title}</h2>
          {description && (
            <p className="dashboard-description">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="dashboard-text-link" href={href}>
      {children}
      <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
    </Link>
  );
}

export function DashboardMetric({
  label,
  value,
  detail,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dashboard-metric", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="dashboard-label">{label}</p>
        {Icon && (
          <Icon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="dashboard-metric-value">{value}</div>
      {detail && <p className="dashboard-caption">{detail}</p>}
      {children}
    </div>
  );
}

/** A real series only: no decorative/random trends or invented comparisons. */
export function DashboardSparkline({
  values,
  label,
}: {
  values: number[];
  label: string;
}) {
  const max = Math.max(1, ...values);
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(1, values.length - 1)) * 160},${44 - (value / max) * 36}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 160 48"
      className="dashboard-sparkline"
      role="img"
      aria-label={label}
    >
      <path d="M0 44H160" stroke="currentColor" opacity=".12" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DashboardProgress({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const percentage = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      className="dashboard-progress-track"
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function DashboardRing({
  value,
  label,
  caption,
}: {
  value: number | null;
  label: string;
  caption?: string;
}) {
  const percentage = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div
      className="dashboard-ring"
      role="img"
      aria-label={`${label}: ${value == null ? "no data yet" : `${value}%`}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" className="dashboard-ring-track" />
        <circle
          cx="60"
          cy="60"
          r="50"
          className="dashboard-ring-fill"
          strokeDasharray={`${percentage * Math.PI} ${100 * Math.PI}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div>
        <strong>{value == null ? "—" : `${value}%`}</strong>
        <span>{caption ?? label}</span>
      </div>
    </div>
  );
}

export interface WorkspaceAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  value?: number;
}
export function ActionWorkspace({
  actions,
  compact = false,
}: {
  actions: WorkspaceAction[];
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "dashboard-actions",
        !compact && actions.length === 2 && "dashboard-actions-pair",
        compact && "dashboard-actions-compact",
      )}
    >
      {actions.map(({ href, label, description, icon: Icon, value }) => (
        <Link key={`${href}:${label}`} href={href} className="dashboard-action">
          <span className="dashboard-action-icon">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="dashboard-action-title">
              {label}
              {value != null && (
                <span className="dashboard-action-count">{value}</span>
              )}
            </span>
            <span className="dashboard-caption">{description}</span>
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}

/** Small native vector, purely decorative; it never represents student data. */
export function LearningGeometry() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="learning-geometry"
      fill="none"
      aria-hidden="true"
    >
      <path d="M25 132h155M40 138V22" stroke="currentColor" opacity=".2" />
      <path
        d="m50 112 36-30 30 8 44-52"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 5"
        opacity=".5"
      />
      <rect
        x="49"
        y="88"
        width="31"
        height="39"
        rx="7"
        fill="currentColor"
        opacity=".18"
      />
      <rect
        x="88"
        y="64"
        width="31"
        height="63"
        rx="7"
        fill="currentColor"
        opacity=".4"
      />
      <rect
        x="127"
        y="35"
        width="31"
        height="92"
        rx="7"
        fill="currentColor"
        opacity=".85"
      />
      <circle
        cx="157"
        cy="28"
        r="16"
        fill="var(--card)"
        stroke="currentColor"
      />
      <path
        d="m150 28 5 5 9-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M61 37v12m-6-6h12M174 90v10m-5-5h10"
        stroke="currentColor"
        opacity=".7"
        strokeWidth="2"
      />
    </svg>
  );
}

export function DashboardNotice({
  title,
  children,
  icon: Icon = ArrowDownRight,
}: {
  title: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="dashboard-notice">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
