import { ImageResponse } from "next/og";
import Logo from "../../lib/logo";

export async function GET(request: Request) {
  const demande = new URL(request.url).searchParams.get("size");
  const taille = demande === "192" ? 192 : 512;

  return new ImageResponse(Logo({ taille }), { width: taille, height: taille });
}
