import path from "node:path";

const root = path.resolve(import.meta.dir, "../dist");
const port = Number(process.env.MINING_PREVIEW_PORT || 5183);

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const target = path.resolve(root, `.${pathname}`);
    if (!target.startsWith(`${root}${path.sep}`)) return new Response("Not found", { status: 404 });
    for (const candidate of [target, path.join(target, "index.html")]) {
      const file = Bun.file(candidate);
      if (await file.exists()) return new Response(file);
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Mining static preview: http://127.0.0.1:${port}/mining/company/bhp`);
