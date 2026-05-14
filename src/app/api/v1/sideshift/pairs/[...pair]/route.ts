import { SideShiftProvider } from "@/services/swap/providers/sideshift";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, { params }: any) {
  try {
    const [from, to] = params.pair;
    const amount = req.nextUrl.searchParams.get("amount");
    const sideshift = new SideShiftProvider();
    const pairData = await sideshift.getPair(
      from,
      to,
      amount ? Number(amount) : undefined
    );
    return NextResponse.json(pairData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
