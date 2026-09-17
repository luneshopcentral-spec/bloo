/** Cookie-authenticated mutations must come from this application's origin. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
