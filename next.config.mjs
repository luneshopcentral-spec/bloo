/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com https://billing.stripe.com; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; media-src 'self' blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
