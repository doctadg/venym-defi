import { SideShiftProvider } from "@/services/swap/providers/sideshift";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      depositCoin,
      settleCoin,
      settleAddress,
      depositNetwork,
      settleNetwork,
      refundAddress,
      settleMemo,
      refundMemo,
      externalId,
    } = await req.json();

    if (!depositCoin || !settleCoin || !settleAddress) {
      return NextResponse.json(
        { message: "depositCoin, settleCoin, and settleAddress are required" },
        { status: 400 }
      );
    }

    // Get client IP from headers
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const sideshift = new SideShiftProvider();
    const shift = await sideshift.createVariableShift(
      depositCoin,
      settleCoin,
      settleAddress,
      depositNetwork,
      settleNetwork,
      refundAddress,
      settleMemo,
      refundMemo,
      externalId,
      ip || undefined
    );

    return NextResponse.json(shift);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
