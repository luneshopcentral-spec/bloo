import type { Instrumentation } from "next";
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest = (error as Error & { digest?: string }).digest;
  // Route patterns and digest only. Never log cookies, submitted answers or PII.
  console.error(JSON.stringify({ event: "request_error", digest: digest ?? "unavailable", method: request.method, route: context.routePath, router: context.routerKind, at: new Date().toISOString() }));
};
