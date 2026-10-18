// Local, one-time setup. No credentials are written to disk or printed.
const http=require('http'),crypto=require('crypto'),cp=require('child_process');
const serial=process.argv[2];if(!serial||!/^[\w.:-]+$/.test(serial))throw Error('Provide the paired Android serial');
const port=Number(process.env.CONTEXTLY_SETUP_PORT)||8097,origin='http://127.0.0.1:'+port,nonce=crypto.randomBytes(24).toString('hex');let busy=false,complete=false;
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid setup port');
const adb=args=>cp.execFileSync('adb',['-s',serial,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:40000});
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
 if(req.headers.host!=='127.0.0.1:'+port){res.writeHead(403).end();return;}
 if(req.method==='GET'&&req.url==='/'){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="th"><meta charset="utf-8"><title>Contextly · เชื่อมเครื่อง</title><style>body{font:18px system-ui;background:#101214;color:#f0f1f2;max-width:600px;margin:60px auto;padding:24px}input,button{font:inherit;padding:14px;margin:15px 0;display:block;width:100%;box-sizing:border-box}button{background:#d8c8a9;border:0;border-radius:10px}</style><h1>เชื่อม Contextly</h1>'+(complete?'<p>เชื่อมต่อแล้ว · คีย์เก็บเข้ารหัสในมือถือ</p>':'<form method="POST" action="/connect"><input type="hidden" name="nonce" value="'+nonce+'"><label>คีย์ Gemini สำหรับเครื่องนี้<input type="password" name="key" autocomplete="off" maxlength="256" required></label><button type="submit">เชื่อมเครื่อง</button></form><p id="status" role="status"></p><p>ส่งตรงไปมือถือผ่าน ADB ที่จับคู่ไว้ · ไม่บันทึกคีย์ในคอม</p><script src="/setup.js" defer></script>')+'</html>');return;
 }
 if(req.method==='GET'&&req.url==='/setup.js'){res.setHeader('Content-Type','application/javascript');res.end(`document.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=document.getElementById('status');button.disabled=true;status.textContent='กำลังเชื่อม…';try{const response=await fetch('/connect',{method:'POST',body:new URLSearchParams(new FormData(form))});const data=await response.json();if(!response.ok||!data.configured)throw Error();form.querySelector('[name=key]').value='';form.remove();status.textContent='เชื่อมต่อแล้ว · คีย์เก็บเข้ารหัสในมือถือ';}catch{status.textContent='เชื่อมต่อไม่สำเร็จ · ลองอีกครั้ง';}finally{button.disabled=false;}});`);return;}
 if(req.method!=='POST'||req.url!=='/connect'||req.headers.origin!==origin||busy||complete){res.writeHead(403).end('Unavailable');return;}
 const chunks=[];let size=0,phase='input';
 try{
  for await(const chunk of req){size+=chunk.length;if(size>2000)throw Error();chunks.push(chunk);}
  const form=new URLSearchParams(Buffer.concat(chunks).toString()),key=form.get('key');
  if(form.get('nonce')!==nonce||!/^[A-Za-z0-9_.-]{20,256}$/.test(key||''))throw Error();busy=true;
  phase='device-request';const request=adb(['shell','content','call','--uri','content://app.contextly.personal.provision','--method','request']);
  const transfer=Buffer.from(/transfer=([A-Za-z0-9+/=]+)/.exec(request)?.[1]||'','base64'),id=/nonce=([a-f0-9-]+)/.exec(request)?.[1];
  if(transfer.length!==32||!id)throw Error();
  let envelope;
  try{const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',transfer,iv);cipher.setAAD(Buffer.from(id));const data=Buffer.concat([cipher.update(key,'utf8'),cipher.final(),cipher.getAuthTag()]);envelope=Buffer.from(JSON.stringify({nonce:id,iv:iv.toString('base64'),data:data.toString('base64')})).toString('base64');}
  finally{transfer.fill(0);}
  phase='device-import';const imported=adb(['shell','content','call','--uri','content://app.contextly.personal.provision','--method','import','--extra','sealed:s:'+envelope]);
  if(!imported.includes('configured=true'))throw Error();
  complete=true;adb(['shell','am','start','-n','app.contextly.personal/.MainActivity','--ez','contextlyProvisioned','true']);
  res.writeHead(200,{'Content-Type':'application/json'}).end('{"configured":true}');console.log('Gemini connected on Android. API key not saved to disk or returned by this page.');
 }catch{console.log('Setup failed during '+phase+'; credentials omitted.');res.writeHead(400,{'Content-Type':'application/json'}).end('{"configured":false}');}
 finally{busy=false;chunks.forEach(chunk=>chunk.fill(0));}
});
server.listen(port,'127.0.0.1',()=>console.log('One-time Android setup ready at '+origin+'/. Close after setup.'));
setTimeout(()=>server.close(),600000).unref();
