export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const origin = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:5000';
    const url = `${origin}/api/v1/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`;
    const headers = new Headers();
    for (const name of ['authorization', 'content-type', 'x-request-id']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch(url, {
      method: request.method, headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      signal: AbortSignal.timeout(60000), cache: 'no-store', redirect: 'manual'
    });
    const outgoing = new Headers({ 'Cache-Control': 'private, no-store' });
    for (const name of ['content-type', 'content-disposition', 'x-request-id', 'location']) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ success: false, error: 'Backend service temporarily unavailable' }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS, proxy as HEAD };
