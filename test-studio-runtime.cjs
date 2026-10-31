'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import('vite');
 const server=await createServer({root:__dirname,server:{middlewareMode:true},logLevel:'error',plugins:[{name:'simulate-older-feedback-helper',enforce:'pre',load(id){if(id.endsWith('/src/feedbackPrivacy.ts'))return 'export function animationCards(event){return event.cards||[];}';}}]});
 try{
  const feedback=await server.transformRequest('/src/GameFeedback.tsx');assert(feedback?.code);
  assert(!feedback.code.includes('from "/src/feedbackPrivacy'));
  assert(!feedback.code.includes('from "/src/feedbackMotion'));
  const mod=await server.ssrLoadModule('/src/GameFeedback.tsx');assert.equal(typeof mod.GameFeedback,'function');
  const app=await server.transformRequest('/src/App.tsx');assert(!app.code.includes('$RefreshReg$'),'component graph uses complete reloads');
  const plugin=server.config.plugins.find(p=>p.name==='studio-complete-reloads');assert(plugin);
  const messages=[];const result=await plugin.handleHotUpdate({file:__dirname+'/src/App.tsx',server:{ws:{send:message=>messages.push(message)}}});assert.deepEqual(result,[]);assert.equal(messages[0].type,'full-reload');
  assert(server.config.resolve.dedupe.includes('react'));assert(server.config.resolve.dedupe.includes('react-dom'));
  console.log('PASS GameFeedback loads with an older helper lacking activeMotionEvents; TSX edits request a complete reload; React remains deduplicated');
 }finally{await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
