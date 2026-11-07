import { createServer } from "node:http";
import { createHash, createHmac } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

export async function privateBlobMock(directory) {
  await mkdir(directory, { recursive: true });
  const token = "vercel_blob_rw_sharptest_SYNTHETIC_ONLY";
  const fileFor = (name) =>
    path.join(directory, createHash("sha256").update(name).digest("hex"));
  const server = createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://127.0.0.1"),
        pathname =
          url.searchParams.get("pathname") || url.searchParams.get("url"),
        file = fileFor(pathname || "");
      if (req.method === "GET") {
        if (req.headers.authorization !== `Bearer ${token}`)
          return send(403, { error: { code: "forbidden" } });
        try {
          return send(200, JSON.parse(await readFile(file + ".json", "utf8")));
        } catch {
          return send(404, { error: { code: "not_found" } });
        }
      }
      if (req.method !== "PUT") return send(404, {});
      const client = (req.headers.authorization || "").replace(/^Bearer /, "");
      if (!client.startsWith("vercel_blob_client_sharptest_"))
        return send(403, { error: { code: "forbidden" } });
      const [signature, payload] = Buffer.from(
        client.slice("vercel_blob_client_sharptest_".length),
        "base64",
      )
        .toString()
        .split(".");
      if (
        signature !== createHmac("sha256", token).update(payload).digest("hex")
      )
        return send(403, { error: { code: "forbidden" } });
      const scope = JSON.parse(Buffer.from(payload, "base64").toString());
      if (
        scope.pathname !== pathname ||
        scope.validUntil <= Date.now() ||
        scope.allowOverwrite !== false
      )
        return send(403, { error: { code: "forbidden" } });
      try {
        await access(file);
        return send(409, { error: { code: "blob_already_exists" } });
      } catch {}
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > scope.maximumSizeInBytes)
          return send(413, { error: { code: "file_too_large" } });
        chunks.push(chunk);
      }
      const contentType = req.headers["x-content-type"];
      if (!scope.allowedContentTypes.includes(contentType))
        return send(403, { error: { code: "forbidden" } });
      const bytes = Buffer.concat(chunks),
        blobUrl = `https://sharptest.private.blob.vercel-storage.com/${pathname}`;
      const meta = {
        pathname,
        url: blobUrl,
        downloadUrl: blobUrl + "?download=1",
        contentType,
        size: bytes.length,
        uploadedAt: new Date().toISOString(),
        contentDisposition: "inline",
        cacheControl: "private, no-store",
        etag: createHash("sha256").update(bytes).digest("hex"),
      };
      await writeFile(file, bytes, { flag: "wx" });
      await writeFile(file + ".json", JSON.stringify(meta));
      send(200, meta);
    } catch {
      send(500, { error: { code: "synthetic_mock_failure" } });
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    server,
    token,
    url: `http://127.0.0.1:${server.address().port}`,
    directory,
  };
}
