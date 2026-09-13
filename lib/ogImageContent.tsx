export function OgImageContent() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        fontFamily: "sans-serif",
        padding: "60px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 28,
          fontWeight: 700,
          color: "#4338ca",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 28,
        }}
      >
        AI Career Simulator
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 56,
          fontWeight: 800,
          color: "#0f172a",
          textAlign: "center",
          maxWidth: 940,
          lineHeight: 1.15,
        }}
      >
        Interactive Career Trials for Counselors &amp; Schools
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: "#475569",
          marginTop: 28,
          textAlign: "center",
          maxWidth: 820,
        }}
      >
        Let students test-drive real careers before picking a major
      </div>
    </div>
  );
}
