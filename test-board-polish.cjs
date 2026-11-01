const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/presentationSets.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);
const {deferredSetBoxes,releaseSetBoxes}=m.exports;
const state={phase:'play',players:[{groups:[{id:'old',cards:[{id:'a'}]},{id:'new',cards:[{id:'b'},{id:'c'}]}]}]};
const flights=[{seq:20,type:'transfer',cards:[{id:'b'}]},{seq:21,type:'payment',cards:[{id:'c'}]}];
const deferred=deferredSetBoxes(state,new Set(['old']),flights);assert.deepEqual(deferred,{new:[20,21]});assert.deepEqual(releaseSetBoxes(deferred,20),{new:[21]});assert.deepEqual(releaseSetBoxes(releaseSetBoxes(deferred,20),21),{});
assert.deepEqual(deferredSetBoxes({...state,phase:'setup'},new Set(),flights),{});assert.deepEqual(deferredSetBoxes(state,new Set(['old','new']),flights),{});
assert.deepEqual(releaseSetBoxes(deferred,999),deferred,'unrelated arrivals cannot reveal new sets');
(async()=>{const {createServer}=await import('vite');const server=await createServer({root:__dirname,server:{middlewareMode:true},logLevel:'error'});try{
 const {defenseFragile}=await server.ssrLoadModule('/src/boardSelection.ts');
 const group=(id,color,keys)=>({id,color,cards:keys.map((key,i)=>({id:id+i,key}))});
 const brown=group('brown','Brown',['mediterranean_avenue','baltic_avenue']),blue=group('blue','Dark Blue',['park_place','boardwalk']),utility=group('utility','Utility',['electric_company','water_works']);const p={defending:1,groups:[brown,blue,utility]};
 assert(defenseFragile(p,brown));assert(!defenseFragile({...p,defending:null},brown));assert(!defenseFragile({...p,groups:[...p.groups,{...brown,id:'backup'}]},brown));assert(!defenseFragile({...p,groups:[...p.groups,group('red','Red',['kentucky_avenue','indiana_avenue','illinois_avenue'])]},brown));
 console.log('PASS new set boxes wait for all related transfers; existing sets/setup stay visible; unrelated landings do not reveal boxes; defense warning accounts for color backups and fourth sets');
}finally{await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
