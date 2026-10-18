const assert=require('assert/strict'),api=require('../native/updates.cjs'),repository='sofwankaji/contextly';
const meta={versionCode:5,versionName:'1.0.5',apk:'Contextly-1.0.5.apk'},release={body:'APK\n<!-- contextly-update '+JSON.stringify(meta)+' -->',html_url:'https://github.com/'+repository+'/releases/tag/android-v1.0.5',assets:[{name:meta.apk,browser_download_url:'https://github.com/'+repository+'/releases/download/android-v1.0.5/'+meta.apk}]};
assert.equal(api.releaseInfo(release,repository,4).versionCode,5);assert.equal(api.releaseInfo(release,repository,5),null);assert.equal(api.releaseInfo(release,repository,6),null);
assert.equal(api.releaseInfo({...release,draft:true},repository,1),null);assert.equal(api.releaseInfo({...release,prerelease:true},repository,1),null);assert.equal(api.releaseInfo({...release,body:'not a release'},repository,1),null);
assert.equal(api.releaseInfo({...release,assets:[{...release.assets[0],browser_download_url:'https://example.com/untrusted.apk'}]},repository,1),null);
assert.equal(api.releaseInfo({...release,html_url:'https://github.com.evil.test/sofwankaji/contextly/releases/tag/5'},repository,1),null);
console.log('PASS: newer published APK only, correct repository/asset, no downgrade, no draft/prerelease or external download.');
