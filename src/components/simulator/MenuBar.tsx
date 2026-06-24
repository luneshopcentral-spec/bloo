const MENU_ITEMS = [
  "Fred Dispense",
  "Dispense",
  "Activities",
  "Reports",
  "Lists",
  "Setup",
  "Help",
];

export function MenuBar() {
  return (
    <div className="fred-menubar">
      {MENU_ITEMS.map((item) => (
        <span key={item} className="fred-menubar-item">
          {item}
        </span>
      ))}
    </div>
  );
}
