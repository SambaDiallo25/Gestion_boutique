export default function Logo({ taille }: { taille: number }) {
  const s = taille;
  return (
    <div
      style={{
        width: s,
        height: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#059669",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: s * 0.5,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: s * 0.16,
            background: "#ffffff",
            borderTopLeftRadius: s * 0.06,
            borderTopRightRadius: s * 0.06,
          }}
        />
        <div
          style={{
            display: "flex",
            width: "90%",
            height: s * 0.28,
            marginTop: s * 0.02,
            background: "#ffffff",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: s * 0.12,
              height: s * 0.18,
              background: "#059669",
              borderTopLeftRadius: s * 0.03,
              borderTopRightRadius: s * 0.03,
            }}
          />
        </div>
      </div>
    </div>
  );
}
