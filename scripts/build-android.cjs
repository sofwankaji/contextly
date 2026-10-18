const fs=require('fs'),path=require('path'),cp=require('child_process'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'mobile-dist');
if(out!==path.join(root,'mobile-dist'))throw Error('Invalid output directory');
fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(root,'web'),out,{recursive:true});
let commit='local';try{commit=cp.execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
const version={versionName:process.env.CONTEXTLY_VERSION_NAME||'1.0.0-dev',versionCode:Number(process.env.CONTEXTLY_VERSION_CODE)||1,commit,repository:process.env.GITHUB_REPOSITORY||'sofwankaji/contextly'};
if(!Number.isSafeInteger(version.versionCode)||version.versionCode<1||version.versionCode>2100000000)throw Error('Invalid Android versionCode');
fs.writeFileSync(path.join(out,'app-version.json'),JSON.stringify(version));
esbuild.buildSync({entryPoints:[path.join(root,'native/main.mjs')],outfile:path.join(out,'native-runtime.js'),bundle:true,format:'iife',target:'chrome110',minify:true,define:{__CONTEXTLY_VERSION__:JSON.stringify(version)}});
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
html=html.replace('<script src="vendor/compromise','<script src="native-runtime.js"></script><script src="vendor/compromise');
html=html.replace('navigator.serviceWorker.register("./sw.js")','!window.ContextlyDevice?.isNative&&navigator.serviceWorker.register("./sw.js")');
html=html.replace('คำศัพท์เก็บในเครื่อง · แจ้งเตือนส่งเฉพาะเวลาและช่องทางของอุปกรณ์','คำศัพท์และแจ้งเตือนเก็บในเครื่อง');
html=html.replace('</head>','<style>body{padding-top:env(safe-area-inset-top)}.native-update-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;margin:12px 0}.native-update-notice button{min-height:44px}.native-update-notice span{font-size:12px}</style></head>');
fs.writeFileSync(path.join(out,'index.html'),html);
console.log('Android assets ready: '+version.versionName+' ('+version.versionCode+'). No API key bundled.');
