#!/usr/bin/env python3
"""Serve site/ locally the way Vercel serves it: clean addresses (/euro-2028 is euro-2028.html, and
any /x.html redirects to /x), then the redirects listed in site/vercel.json, no trailing slash,
and no caching, so an edit shows on the next load.
Usage: python3 tools/serve.py [port]    (default 8001; then http://localhost:8001/)"""
import http.server, json, os, socket, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site'))
with open(os.path.join(ROOT, 'vercel.json')) as f:
    REDIRECTS = {r['source']: r['destination'] for r in json.load(f).get('redirects', [])}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path, _, query = self.path.partition('?')
        tail = f'?{query}' if query else ''
        # Vercel's order: any .html is stripped first, whether or not the file exists, and only then
        # are the redirects read; so a rule names the stripped form (/euro2028, not /euro2028.html).
        if path.endswith('.html'):
            return self.redirect(path[:-5] + tail)
        if path in REDIRECTS:
            return self.redirect(REDIRECTS[path] + tail)
        if len(path) > 1 and path.endswith('/'):
            return self.redirect(path.rstrip('/') + tail)
        if not os.path.exists(self.translate_path(path)) and os.path.isfile(self.translate_path(path) + '.html'):
            self.path = path + '.html' + tail
        return super().do_GET()

    def redirect(self, to):
        self.send_response(308)
        self.send_header('Location', to)
        self.end_headers()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6      # one socket for both stacks, so localhost resolves either way


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    print(f'serving {ROOT} at http://localhost:{port}/', flush=True)
    Server(('::', port), Handler).serve_forever()
