const assert=require('node:assert/strict'),{Game,COLORS}=require('./engine.cjs'),deck=require('./deck.json');
function random(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function invariant(g){
 const cards=[...g.s.deck,...g.s.discard,...(g.s.pending?.kind==='chance'?g.s.pending.cards:[]),...g.s.players.flatMap(p=>[...p.hand,...p.bank,...p.special,...p.groups.flatMap(x=>[...x.cards,x.house,x.hotel].filter(Boolean))])];
 assert.equal(cards.length,150+(g.s.minted||0),'card conservation');assert.equal(new Set(cards.map(c=>c.id)).size,cards.length,'unique card IDs');
 const ids=[];
 g.s.players.forEach((p,i)=>{for(const x of p.groups){ids.push(x.id);assert(x.cards.length>0&&x.cards.length<=COLORS[x.color].size);for(const c of x.cards){assert(g.d(c).colors.includes(x.color));if(c.locked)assert.equal(c.locked,x.color);if(c.key==='expansion_property'){assert.equal(c.expansionOwner,i);assert.equal(c.expansionColor,x.color);assert(p.groups.some(y=>y.color===x.color&&y.cards.some(c=>c.key!=='expansion_property')));}}
 if(x.house)assert(g.full(x));if(x.hotel)assert(x.house);}
 if(p.defending)assert(g.sets(i)>=3);});assert.equal(new Set(ids).size,ids.length,'unique group IDs');
}
let steps=0,ended=0;
for(let seed=101;seed<=180;seed++){
 const g=new Game(deck,2+seed%4,random(seed),{roundLimit:10});
 for(let turn=0;turn<3000&&g.s.winner===null;turn++){
  const p=g.s.pending;
  const actor=g.isSetup()?g.s.players.findIndex(p=>!p.setupDone):p?(p.responders?.[turn%p.responders.length]??p.payments?.[turn%p.payments.length]?.target??p.responder):g.s.turn;
  try{if(turn%11===0){const state=JSON.stringify(g.s);g.bot(actor,true);assert.equal(JSON.stringify(g.s),state,'preview purity');}g.bot(actor);invariant(g);steps++;}catch(e){throw Error(`seed=${seed}, step=${turn}, actor=${actor}, pending=${p?.kind}: ${e.message}`);}
 }
 assert.notEqual(g.s.winner,null,'match terminated: '+seed);ended++;
}
console.log(`PASS ${ended} extra seeded matches / ${steps} actions; card conservation, unique IDs, property locks, Expansion ownership/support, buildings, defense and preview purity`);
