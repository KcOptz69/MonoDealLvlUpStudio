'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
(async()=>{const{createServer}=await import('vite');const server=await createServer({root:__dirname,server:{port:0,host:'127.0.0.1'},logLevel:'error'});await server.listen();try{
 const base='http://127.0.0.1:'+server.httpServer.address().port;
 const root=await(await fetch(base+'/')).text();assert.match(root,/src\/main.tsx/);assert.doesNotMatch(root,/<script src="app.js"/);
 for(const file of ['/src/App.tsx','/src/music.ts','/src/cardArt.ts']){const res=await fetch(base+file);assert.equal(res.status,200,file);assert.doesNotMatch(await res.text(),/Internal Server Error/);}
 assert.equal((await(await fetch(base+'/api/health')).json()).online,true);
 const room=await(await fetch(base+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:'create',name:'React QA'})})).json();assert.ok(room.token);
 const state=await(await fetch(base+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...room,cmd:'state'})})).json();assert.equal(state.seats[0].status,'In lobby');
 const files=fs.readdirSync(__dirname+'/public/artwork');assert.equal(files.length,73);
 for(const f of files){const res=await fetch(base+'/artwork/'+f);assert.equal(res.status,200,f);const actual=Buffer.from(await res.arrayBuffer());assert.deepEqual(actual,fs.readFileSync(__dirname+'/public/artwork/'+f),f);}
 console.log('PASS Vite React entry, transformed frontend/music modules, online room API and all 73 approved binary artwork endpoints.');
}finally{await server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
