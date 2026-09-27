export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'admin.pillcare.in' || url.hostname.startsWith('admin.')) {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return context.env.ASSETS.fetch(new URL('/admin.html', context.request.url));
    }
  }
  return context.next();
}
