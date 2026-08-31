import { NextResponse } from "next/server";
import { getOrderBook } from "@/lib/server/dreamdex";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const orderBook = await getOrderBook(id);
    return NextResponse.json({ orderBook });
  } catch {
    return NextResponse.json(
      { error: "Failed to load order book" },
      { status: 502 }
    );
  }
}
