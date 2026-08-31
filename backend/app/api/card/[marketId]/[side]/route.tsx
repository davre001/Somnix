import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ marketId: string; side: string }> }
) {
  const { marketId, side } = await params;
  const label = side === "green" ? "Green" : "Red";
  const background = side === "green" ? "#0f2e1a" : "#2e0f0f";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background,
          color: "white",
          fontSize: 64,
        }}
      >
        <div style={{ display: "flex" }}>{`I locked ${label}`}</div>
        <div style={{ display: "flex", fontSize: 32, opacity: 0.7 }}>
          {marketId}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
