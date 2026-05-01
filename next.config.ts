import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/guess": ["./data/wordles.txt"],
  },
};

export default nextConfig;
