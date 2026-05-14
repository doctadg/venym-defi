import { SideShiftProvider } from "@/services/swap/providers/sideshift";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      depositCoin,
      settleCoin,
      depositAmount,
      settleAmount,
      depositNetwork,
      settleNetwork,
    } = await req.json();

    if (!depositCoin || !settleCoin) {
      return NextResponse.json(
        { message: "depositCoin and settleCoin are required" },
        { status: 400 }
      );
    }

    if (!depositAmount && !settleAmount) {
      return NextResponse.json(
        { message: "Either depositAmount or settleAmount is required" },
        { status: 400 }
      );
    }

    // Get client IP from headers
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const sideshift = new SideShiftProvider();
    const quote = await sideshift.createQuote(
      depositCoin,
      settleCoin,
      depositAmount,
      settleAmount,
      depositNetwork,
      settleNetwork,
      ip || undefined
    );

    return NextResponse.json(quote);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
