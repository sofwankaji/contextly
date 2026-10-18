function releaseInfo(release,repository,currentBuild){
 if(!/^[a-z\d](?:[a-z\d-]*[a-z\d])?\/[a-z\d._-]+$/i.test(repository)||!release||release.draft||release.prerelease)return null;
 const marker=/<!--\s*contextly-update\s+(\{[^\r\n]+\})\s*-->/.exec(release.body||'');if(!marker)return null;
 let meta;try{meta=JSON.parse(marker[1]);}catch{return null;}
 if(!Number.isSafeInteger(meta.versionCode)||meta.versionCode<=Number(currentBuild)||typeof meta.versionName!=='string'||!/^[\w.+-]{1,60}$/.test(meta.versionName))return null;
 const prefix='https://github.com/'+repository+'/releases/',asset=release.assets?.find(item=>item.name===meta.apk&&typeof item.browser_download_url==='string'&&item.browser_download_url.startsWith(prefix+'download/')&&/\.apk$/.test(item.name));
 if(!asset||typeof release.html_url!=='string'||!release.html_url.startsWith(prefix+'tag/'))return null;
 return {...meta,url:release.html_url,downloadUrl:asset.browser_download_url};
}
module.exports={releaseInfo};
