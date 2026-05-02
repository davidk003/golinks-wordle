import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/": ["./data/wordles.txt", "./data/valid-guesses.txt"],
    "/api/guess": ["./data/wordles.txt", "./data/valid-guesses.txt"],
    "/api/practice": ["./data/wordles.txt", "./data/valid-guesses.txt"],
  },
};

export default nextConfig;
