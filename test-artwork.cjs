const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {createServer}=require('./server.cjs');
(async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 const base='http://127.0.0.1:'+server.address().port+'/';
 const code=await(await fetch(base+'data.js')).text();
 const ctx={};vm.runInNewContext(code+';this.images=ART;this.deck=DECK;',ctx);
 const originals=JSON.parse(fs.readFileSync(__dirname+'/assets.json','utf8'));
 for(const [key,url] of Object.entries(ctx.images)){
  const res=await fetch(base+url);assert.equal(res.status,200,key);assert.match(res.headers.get('content-type'),/^image\//,key);
  const bytes=Buffer.from(await res.arrayBuffer()),expected=Buffer.from(originals[key].split(',')[1],'base64');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),crypto.createHash('sha256').update(expected).digest('hex'),key);
 }
 for(const c of ctx.deck)assert.ok(ctx.images[c.key],c.key);
 console.log('PASS all approved artwork files served over HTTP; exact approved image hashes; every card has artwork');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
