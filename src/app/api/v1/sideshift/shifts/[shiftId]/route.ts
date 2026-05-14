import { SideShiftProvider } from "@/services/swap/providers/sideshift";
import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, { params }: any) {
  try {
    const sideshift = new SideShiftProvider();
    const shift = await sideshift.getShift(params.shiftId);
    return NextResponse.json(shift);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
