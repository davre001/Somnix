import { NextResponse } from "next/server";
import { getLiveMarkets } from "@/lib/server/dreamdex";

export async function GET() {
  try {
    const markets = await getLiveMarkets();
    return NextResponse.json({ markets });
  } catch {
    return NextResponse.json(
      { error: "Failed to load live markets" },
      { status: 502 }
    );
  }
}
