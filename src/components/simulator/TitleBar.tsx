export function TitleBar() {
  return (
    <div className="fred-titlebar">
      <div className="fred-titlebar-left">
        <div className="fred-titlebar-icon" />
        <span>Fred Dispense</span>
      </div>
      <div className="fred-titlebar-btns">
        <div className="fred-titlebar-btn">_</div>
        <div className="fred-titlebar-btn">□</div>
        <div className="fred-titlebar-btn close">✕</div>
      </div>
    </div>
  );
}
