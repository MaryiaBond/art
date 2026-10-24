import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import imageProxy from '../netlify/functions/image-proxy.mjs';

const root=fileURLToPath(new URL('../dist/',import.meta.url)),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const extension=value=>value.slice(value.lastIndexOf('.'));
const server=createServer(async(request,response)=>{try{const incoming=new URL(request.url,'http://127.0.0.1:8091');if(incoming.pathname==='/.netlify/functions/image-proxy'){const proxied=await imageProxy(new Request(incoming,{method:request.method}));response.writeHead(proxied.status,Object.fromEntries(proxied.headers));response.end(Buffer.from(await proxied.arrayBuffer()));return}const relative=decodeURIComponent(incoming.pathname==='/'?'/index.html':incoming.pathname),path=fileURLToPath(new URL(`.${relative}`,new URL('../dist/',import.meta.url)));if(!path.startsWith(root))throw Object.assign(Error('Forbidden'),{status:403});await stat(path);const type=types[extension(path)]||'application/octet-stream';if(type==='application/octet-stream')console.warn('Unknown audit MIME:',path);response.writeHead(200,{'Content-Type':type});response.end(await readFile(path))}catch(error){response.writeHead(error?.status||404,{'Content-Type':'text/plain; charset=utf-8'});response.end('Not found')}});
server.listen(8091,'127.0.0.1',()=>console.log('ART color-picker audit server: http://127.0.0.1:8091'));
