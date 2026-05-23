const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const http = require("http");
const url = require("url");

setGlobalOptions({ maxInstances: 10 });

const VM_BACKEND = "http://34.172.175.84:8080";

/**
 * Transparent proxy to the VM backend.
 * Handles all /api/** requests including MJPEG video streams.
 */
exports.api = onRequest({ timeoutSeconds: 540, cors: true }, (req, res) => {
  // Build target URL — preserve full path + query string
  const rawPath = req.originalUrl || req.url || "/";
  const targetUrl = `${VM_BACKEND}${rawPath}`;

  const parsed = url.parse(targetUrl);

  // Forward request headers but replace Host
  const forwardHeaders = Object.assign({}, req.headers, {
    host: `${parsed.hostname}:${parsed.port || 80}`,
  });
  // Remove hop-by-hop headers that should not be forwarded
  delete forwardHeaders["connection"];
  delete forwardHeaders["te"];
  delete forwardHeaders["trailers"];
  delete forwardHeaders["transfer-encoding"];
  delete forwardHeaders["upgrade"];

  const options = {
    hostname: parsed.hostname,
    port: parseInt(parsed.port || "80", 10),
    path: parsed.path,
    method: req.method,
    headers: forwardHeaders,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // CORS headers so browser accepts the response
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Forward all response headers from the VM
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      // Skip headers that Express sets automatically
      if (key.toLowerCase() !== "transfer-encoding") {
        res.set(key, value);
      }
    });

    res.status(proxyRes.statusCode || 200);

    // Pipe the response body (works for both JSON and MJPEG streams)
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy request error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Bad Gateway", detail: err.message });
    }
  });

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).send("");
    return;
  }

  // Pipe request body for POST/PUT
  req.pipe(proxyReq, { end: true });
});
