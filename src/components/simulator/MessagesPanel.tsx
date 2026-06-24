import type { MessageRow } from "@/lib/types/case";

interface MessagesPanelProps {
  messages: MessageRow[];
}

const SEVERITY_COLOR: Record<MessageRow["severity"], string> = {
  error: "#cc0000",
  warning: "#cc6600",
  info: "#00008b",
};

export function MessagesPanel({ messages }: MessagesPanelProps) {
  return (
    <div className="fred-msg-area">
      <div className="fred-msg-header">
        <div className="fred-msg-header-cell">Message Id</div>
        <div className="fred-msg-header-cell">Patient Name</div>
        <div className="fred-msg-header-cell">Item</div>
        <div className="fred-msg-header-cell">Message Summary</div>
        <div className="fred-msg-header-cell">Code</div>
      </div>
      <div className="fred-msg-rows">
        {messages.length === 0 ? (
          <div className="fred-msg-empty">No messages</div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className="fred-msg-row"
              style={{
                display: "grid",
                gridTemplateColumns: "80px 120px 1fr 1fr 80px",
                color: SEVERITY_COLOR[m.severity],
                fontSize: "10px",
                borderBottom: "1px solid #ddd",
                padding: "2px 0",
              }}
            >
              <div style={{ padding: "2px 4px", borderRight: "1px solid #ddd" }}>
                {m.id}
              </div>
              <div style={{ padding: "2px 4px", borderRight: "1px solid #ddd" }}>
                {m.patient}
              </div>
              <div
                style={{
                  padding: "2px 4px",
                  borderRight: "1px solid #ddd",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.item}
              </div>
              <div style={{ padding: "2px 4px", borderRight: "1px solid #ddd" }}>
                {m.summary}
              </div>
              <div style={{ padding: "2px 4px" }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
