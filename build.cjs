'use strict';
const fs=require('node:fs'),path=require('node:path');
process.chdir(__dirname);
module.exports=(async()=>{
 const deck=JSON.parse(fs.readFileSync('deck.json','utf8')),art={},imagePaths={};
 if(deck.reduce((n,c)=>n+c.copies,0)!==150)throw Error('Expected 150 cards');
 const mime={'.webp':'webp','.png':'png','.jpg':'jpeg','.svg':'svg+xml'};
 for(const file of fs.readdirSync('public/artwork')){
  const ext=path.extname(file);if(!mime[ext])continue;
  const key=path.basename(file,ext);
  art[key]='data:image/'+mime[ext]+';base64,'+fs.readFileSync(path.join('public/artwork',file)).toString('base64');
  imagePaths[key]='artwork/'+file;
 }
 for(const c of deck)if(!art[c.key])throw Error('Missing approved artwork: '+c.key);
 // Keep the test/offline master synchronized with the approved binary originals.
 fs.writeFileSync('assets.json',JSON.stringify(art));
 const {build}=await import('vite');
 await build({configFile:false,root:__dirname,build:{outDir:'dist',emptyOutDir:true}});
 fs.writeFileSync('dist/data.js','const DECK='+JSON.stringify(deck)+';\nconst ART='+JSON.stringify(imagePaths)+';');
 // Keep backend runtime modules separate from the native TypeScript frontend.
 for(const name of ['engine','rooms','server']){
  let code=fs.readFileSync(name+'.js','utf8');
  if(name==='rooms')code=code.replace("require('./engine')","require('./engine.cjs')");
  if(name==='server')code=code.replace("require('./rooms')","require('./rooms.cjs')");
  fs.writeFileSync(name+'.cjs',code);
 }
 console.log('Built React game, music, online backend and all approved artwork assets.');
})();
if(require.main===module)module.exports.catch(error=>{console.error(error);process.exitCode=1});
