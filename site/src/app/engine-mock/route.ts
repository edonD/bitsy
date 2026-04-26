import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "src", "app", "engine-mock", "bitsy", "Bitsy.html");
  const file = await readFile(filePath);

  return new Response(file, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
