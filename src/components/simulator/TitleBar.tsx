import Link from "next/link";

export function TitleBar() {
  return (
    <div className="fred-titlebar">
      <div className="fred-titlebar-left">
        <div className="fred-titlebar-icon" />
        <span>Fred-style dispensing training simulator</span>
      </div>
      <div className="fred-titlebar-btns">
        <Link className="fred-titlebar-exit" href="/dashboard">
          Exit to dashboard
        </Link>
      </div>
    </div>
  );
}
