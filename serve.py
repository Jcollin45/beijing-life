#!/usr/bin/env python3
"""The development server for the game.

`python3 -m http.server` sends no cache headers at all, and a browser given no instructions
about a file decides for itself how long to keep it. That is fine for a site that does not
change and wrong for one you are editing: reload after a change and you can get yesterday's
index.html, or today's world.js beside yesterday's game.js. Neither shows up as an error. What
you see is a world that half-built — furniture missing, a room that does not finish drawing,
the title screen sitting over a black canvas — which looks like a rendering bug and is not one.

So: every response says no-store, and nothing is ever kept. The files are a few hundred
kilobytes off the local disk; there is nothing to gain by caching them and a whole class of
confusing bug to lose.

    python3 serve.py [port]
"""

import http.server
import os
import socket
import socketserver
import sys
import threading

# 8000, because that is the port all twenty test harnesses have always asked for. The default here
# was 5173, so `python3 serve.py` started a server the entire suite could not see, and every harness
# run against it screenshotted Chrome's own "site cannot be reached" page and reported no errors.
PORT = int(sys.argv[1] if len(sys.argv) > 1 else os.environ.get('GAME_PORT', 8000))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    # One line per request instead of the default three-line preamble.
    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))


# On macOS `localhost` resolves to ::1 as well as 127.0.0.1, and this server used to bind the IPv4
# loopback only. A browser that tries the IPv6 address first gets a refused connection, and whether
# it then retries over IPv4 is up to the browser — so `http://localhost:8000` worked in some clients
# and not in others while `http://127.0.0.1:8000` always worked. That is a miserable thing to debug,
# because the game looks broken and nothing is wrong with it.
#
# Both loopback addresses now get their own listener. Deliberately not bound to 0.0.0.0 or ::: this
# is an unauthenticated file server over the whole project directory, and it has no business being
# reachable from anything but this machine.
class Threaded(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class Threaded6(Threaded):
    address_family = socket.AF_INET6


def serve(cls, host, port, started):
    try:
        srv = cls((host, port), NoCache)
    except OSError as e:
        # One of the two families may be unavailable. That is survivable as long as the other bound.
        sys.stderr.write('note: not serving %s: %s\n' % (host, e))
        return
    started.append(host)
    srv.serve_forever()


if __name__ == '__main__':
    started = []
    threads = [threading.Thread(target=serve, args=(cls, host, PORT, started), daemon=True)
               for cls, host in ((Threaded, '127.0.0.1'), (Threaded6, '::1'))]
    for t in threads:
        t.start()
    for t in threads:
        t.join(1.0)
    if not started:
        sys.stderr.write('could not bind port %d on either loopback address\n' % PORT)
        raise SystemExit(1)
    sys.stderr.write('Serving %s on port %d — http://localhost:%d/index.html\n'
                     % (' and '.join(started), PORT, PORT))
    try:
        while True:
            for t in threads:
                t.join(0.5)
    except KeyboardInterrupt:
        pass
