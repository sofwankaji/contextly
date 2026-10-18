const assert=require('assert/strict'),cp=require('child_process');
const port=28000+Math.floor(Math.random()*20000),origin='http://127.0.0.1:'+port,key='unit-test-device-key-1234567890';
const fixture=`const cp=require('child_process'),crypto=require('crypto');const transfer=Buffer.alloc(32,49),nonce='12345678-1234-1234-1234-123456789abc';
cp.execFileSync=(file,args)=>{if(file!=='adb'||args.includes('${key}'))throw Error('unsafe command');if(args.includes('request'))return 'Bundle[{nonce='+nonce+', transfer='+transfer.toString('base64')+'}]';if(args.includes('import')){const sealed=args.find(x=>x.startsWith('sealed:s:'));const e=JSON.parse(Buffer.from(sealed.slice(9),'base64'));if(e.nonce!==nonce)throw Error('nonce');const data=Buffer.from(e.data,'base64'),decipher=crypto.createDecipheriv('aes-256-gcm',transfer,Buffer.from(e.iv,'base64'));decipher.setAAD(Buffer.from(nonce));decipher.setAuthTag(data.subarray(-16));const plain=Buffer.concat([decipher.update(data.subarray(0,-16)),decipher.final()]).toString();if(plain!=='${key}')throw Error('ciphertext');return 'Bundle[{configured=true}]';}if(args.includes('start'))return 'OK';throw Error('Unexpected operation');};process.argv[2]='test-device';require('./scripts/connect-device.cjs');`;
const child=cp.spawn(process.execPath,['-e',fixture],{cwd:require('path').resolve(__dirname,'..'),env:{...process.env,CONTEXTLY_SETUP_PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
(async()=>{try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('setup did not start')),10000);child.stdout.on('data',()=>{if(output.includes('ready at')){clearTimeout(timeout);resolve();}});child.on('exit',()=>reject(Error('setup exited early')));});
 const page=await(await fetch(origin)).text(),nonce=/name="nonce" value="([a-f0-9]+)"/.exec(page)[1];
 assert(page.includes('/setup.js'),'submit uses a script with visible progress instead of relying on form navigation');
 const script=await fetch(origin+'/setup.js');assert(script.ok);assert((await script.text()).includes("form.remove()"),'successful setup clears/removes credential form');
 const body=new URLSearchParams({nonce,key}),send=site=>fetch(origin+'/connect',{method:'POST',headers:{Origin:site},body});
 assert.equal((await send('https://untrusted.example')).status,403,'foreign sites cannot provision a device');
 const result=await send(origin);assert.equal(result.status,200);assert.deepEqual(await result.json(),{configured:true});
 assert.equal((await send(origin)).status,403,'setup is single use');
 const final=await(await fetch(origin)).text();assert(!final.includes('<form'));assert(!output.includes(key));assert(!final.includes(key));
 console.log('PASS: local setup CSRF guard, encrypted ADB transfer, success feedback, single use and no key in page/output.');
}finally{child.kill();}})().catch(error=>{console.error(error);process.exitCode=1;});
