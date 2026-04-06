/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  // Keep dev and production artifacts separate so `next build`
  // cannot corrupt a running `next dev` session.
  distDir: isDev ? ".next-dev" : ".next",
};

export default nextConfig;
