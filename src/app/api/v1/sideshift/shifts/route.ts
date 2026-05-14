import { SideShiftProvider } from "@/services/swap/providers/sideshift";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      quoteId,
      settleAddress,
      refundAddress,
      settleMemo,
      refundMemo,
      externalId,
    } = await req.json();

    if (!quoteId || !settleAddress) {
      return NextResponse.json(
        { message: "quoteId and settleAddress are required" },
        { status: 400 }
      );
    }

    const sideshift = new SideShiftProvider();
    const shift = await sideshift.createFixedShift(
      quoteId,
      settleAddress,
      refundAddress,
      settleMemo,
      refundMemo,
      externalId
      // No userIp parameter - using server IP instead
    );

    return NextResponse.json(shift);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
