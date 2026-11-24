import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
const root = path.resolve('dist/build/h5')
const port = Number(process.env.PORT || 5181)
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' }
http.createServer((req, res) => {
  const requested = path.resolve(root, `.${decodeURIComponent((req.url || '/').split('?')[0])}`)
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return }
  const file = requested === root || !path.extname(requested) ? path.join(root, 'index.html') : requested
  try {
    const content = fs.readFileSync(file)
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
    res.end(content)
  }
  catch { res.writeHead(404).end() }
}).listen(port, '0.0.0.0', () => console.log(`H5 production preview: http://localhost:${port}`))
