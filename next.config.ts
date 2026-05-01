import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/guess": ["./data/wordles.txt"],
    "/api/practice": ["./data/wordles.txt"],
  },
};

export default nextConfig;
