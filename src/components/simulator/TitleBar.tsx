import Link from "next/link";
import type { ReactNode } from "react";

export function TitleBar({ action }: { action?: ReactNode }) {
  return (
    <div className="fred-titlebar">
      <div className="fred-titlebar-left">
        <div className="fred-titlebar-icon" />
        <span>DispenseRx Practice — dispensing simulator</span>
      </div>
      <div className="fred-titlebar-btns">
        {action}
        <Link className="fred-titlebar-exit" href="/dashboard">
          Exit to dashboard
        </Link>
      </div>
    </div>
  );
}
