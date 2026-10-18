const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const directory=path.resolve('release'),version=JSON.parse(fs.readFileSync(path.join(directory,'app-version.json'),'utf8')),repository=process.env.GITHUB_REPOSITORY;
if(!/^[\w-]+\/[\w.-]+$/.test(repository||''))throw Error('Missing repository');
const gh=args=>cp.execFileSync('gh',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}),name='Contextly-'+version.versionName+'.apk',tag='android-v'+version.versionName;
let current;try{current=JSON.parse(gh(['api','repos/'+repository+'/releases/latest']));}catch{}
const previous=/<!--\s*contextly-update\s+(\{[^\r\n]+\})\s*-->/.exec(current?.body||'');
if(previous&&JSON.parse(previous[1]).versionCode>version.versionCode){console.log('A newer release is already published; skipping this older build.');process.exit(0);}
const apk=path.join(directory,name),digest=crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex'),checksum=apk+'.sha256';
fs.writeFileSync(checksum,digest+'  '+name+'\n');
const metadata={versionCode:version.versionCode,versionName:version.versionName,commit:process.env.GITHUB_SHA,apk:name};
const notes=path.join(directory,'release-notes.md');fs.writeFileSync(notes,'Contextly Android APK\n\n- Local reminders on this device (3 / 7 days).\n- Direct Gemini connection with a device-owned encrypted key.\n- Vocabulary stays on the device.\n\nInstall this APK over the previous version to retain your words. Android asks you to confirm installation.\n\nSHA-256: `'+digest+'`\n\n<!-- contextly-update '+JSON.stringify(metadata)+' -->\n');
let exists=false;try{gh(['release','view',tag,'--repo',repository]);exists=true;}catch{}
if(exists){gh(['release','upload',tag,apk,checksum,'--clobber','--repo',repository]);gh(['release','edit',tag,'--notes-file',notes,'--latest','--repo',repository]);}
else gh(['release','create',tag,apk,checksum,'--repo',repository,'--target',process.env.GITHUB_SHA,'--title','Contextly '+version.versionName,'--notes-file',notes,'--latest']);
console.log('Published '+tag+' from '+process.env.GITHUB_SHA);
