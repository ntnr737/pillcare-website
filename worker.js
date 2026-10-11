const BLOCKED_PATHS = [
  /^\/wp-admin(?:\/|$)/i,
  /^\/wp-login\.php$/i,
  /^\/\.env$/i,
  /^\/admin\/config(?:\/|$)/i,
];

function isBlocked(pathname) {
  return BLOCKED_PATHS.some((pattern) => pattern.test(pathname));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isBlocked(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    if (url.hostname.toLowerCase() === "admin.pillcare.in") {
      if (url.pathname === "/") {
        url.pathname = "/admin/index.html";
      } else if (url.pathname === "/admin") {
        url.pathname = "/admin/";
      } else if (!url.pathname.startsWith("/admin/")) {
        url.pathname = `/admin${url.pathname}`;
      }

      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    return env.ASSETS.fetch(request);
  },
};
