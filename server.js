import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), process.argv[2] || '.');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json' };
http.createServer(async (req,res)=>{
  try {
    const requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file = path.resolve(root, '.' + requested);
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Invalid path');
    try { await stat(file); } catch { file = path.resolve(root,'public','.'+requested); }
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Invalid path');
    try { if ((await stat(file)).isDirectory()) file = path.join(file,'index.html'); } catch { if (!path.extname(file)) file = path.join(root,'index.html'); }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log(`CDM Campus Map running at http://localhost:${Number(process.env.PORT)||4173}`));
