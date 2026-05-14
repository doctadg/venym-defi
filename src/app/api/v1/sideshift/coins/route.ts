import { SideShiftProvider } from "@/services/swap/providers/sideshift";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sideshift = new SideShiftProvider();
    const coins = await sideshift.getCoins();
    return NextResponse.json(coins);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
