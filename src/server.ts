import * as http from 'node:http'

export function startServer(html: string, port: number): http.Server {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
  })

  server.listen(port)

  return server
}
