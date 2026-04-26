import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".jsx": "text/babel; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ts": "text/plain; charset=utf-8",
};

export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const baseDir = path.join(process.cwd(), "src", "app", "engine-mock", "bitsy");
  const requestedPath = path.resolve(baseDir, ...params.path);
  const relativePath = path.relative(baseDir, requestedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(requestedPath);
    const contentType = CONTENT_TYPES[path.extname(requestedPath).toLowerCase()] ?? "application/octet-stream";

    return new Response(file, {
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
