import { NextResponse } from "next/server";
import { publicPaymentsConfig } from "@/lib/payments/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(publicPaymentsConfig());
}
