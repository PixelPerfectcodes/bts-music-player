import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a fully static site to `out/`. Every route here prerenders — there are
  // no route handlers, Server Actions or dynamic server functions — so there is
  // nothing to run at request time and Cloudflare can serve the files directly.
  output: "export",
};

export default nextConfig;
