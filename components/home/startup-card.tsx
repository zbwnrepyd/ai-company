import type { StartupCardState } from "./types";

interface StartupCardProps {
  title: string;
  state?: StartupCardState;
  className?: string;
}

export function StartupCard({ title, state, className }: StartupCardProps) {
  return (
    <aside
      className={["startup-card", className].filter(Boolean).join(" ")}
      aria-label={`${title} 信息卡`}
    >
      <h3>{title}</h3>
      {state?.status === "loading" ? (
        <p className="startup-card-status">加载中</p>
      ) : null}
      {state?.status === "error" ? (
        <p className="startup-card-status">信息暂不可用</p>
      ) : null}
      {state?.status === "ready" ? (
        <dl>
          {state.rows?.map((row) => (
            <div key={`${row.label}-${row.value}`} className="startup-card-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </aside>
  );
}
