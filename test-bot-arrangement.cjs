const assert=require('node:assert/strict'),{Game}=require('./engine.cjs'),deck=require('./deck.json');
function fresh(){const g=new Game(deck,5,()=>.41);for(const p of g.s.players){g.s.deck.push(...p.hand);p.hand=[];}g.s.phase='play';g.s.turn=1;g.s.played=0;g.s.pending=null;return g;}
function add(g,key,color,newSet=false){const at=g.s.deck.findIndex(c=>c.key===key);assert(at>=0,key);const c=g.s.deck.splice(at,1)[0];g.place(1,c,color,newSet?'':undefined);return c;}
function wild(g,colors,value){return deck.find(d=>d.type==='wild'&&d.key!=='expansion_property'&&colors.every(c=>d.colors.includes(c))&&(value===undefined||d.value===value)).key;}
function apply(g){const before=g.s.played,hand=JSON.stringify(g.p(1).hand),bank=JSON.stringify(g.p(1).bank),discard=JSON.stringify(g.s.discard);const p=JSON.stringify(g.s);assert.equal(g.bot(1,true),null);assert.equal(JSON.stringify(g.s),p,'preview remains read-only');g.bot(1);assert.equal(g.s.played,before);assert.equal(JSON.stringify(g.p(1).hand),hand);assert.equal(JSON.stringify(g.p(1).bank),bank);assert.equal(JSON.stringify(g.s.discard),discard);}
{
 const g=fresh();add(g,'mediterranean_avenue','Brown',true);add(g,'baltic_avenue','Brown',true);apply(g);assert.equal(g.sets(1),1);assert.equal(g.p(1).groups.length,1);
}
{
 // Reclaim a flexible wild from a duplicate full set to complete a third color.
 const g=fresh();add(g,'mediterranean_avenue','Brown');add(g,'baltic_avenue','Brown');add(g,wild(g,['Brown','Light Blue']),'Brown',true);add(g,wild(g,['Brown','Light Blue']),'Brown');
 add(g,'park_place','Dark Blue');add(g,'boardwalk','Dark Blue');add(g,'oriental_avenue','Light Blue');add(g,'vermont_avenue','Light Blue');
 assert.equal(g.sets(1),2);apply(g);assert.equal(g.sets(1),3);
}
{
 const g=fresh();add(g,'mediterranean_avenue','Brown');add(g,'baltic_avenue','Brown');add(g,'park_place','Dark Blue');add(g,'boardwalk','Dark Blue');add(g,'electric_company','Utility');add(g,'water_works','Utility');g.p(1).defending=true;g.p(1).defenseRemaining=1;
 const plan=g.bestArrangement(1);if(plan){assert(new Set(plan.filter(x=>g.full(x)).map(x=>x.color)).size>=3);g.bot(1);assert.equal(g.p(1).defending,true);assert.equal(g.p(1).defenseRemaining,1);}
}
{
 const g=fresh(),c=add(g,wild(g,['Brown','Light Blue']),'Brown');c.locked='Brown';add(g,'oriental_avenue','Light Blue');add(g,'vermont_avenue','Light Blue');const plan=g.bestArrangement(1);if(plan)assert.equal(plan.find(x=>x.cards.some(x=>x.id===c.id)).color,'Brown');
}
{
 const g=fresh();const a=add(g,'mediterranean_avenue','Brown');add(g,'expansion_property','Brown');add(g,'baltic_avenue','Brown',true);const plan=g.bestArrangement(1);if(plan)for(const group of plan)if(group.cards.some(c=>c.key==='expansion_property'))assert(group.cards.some(c=>c.key!=='expansion_property'));
}
{
 const g=fresh();add(g,'mediterranean_avenue','Brown');add(g,'baltic_avenue','Brown');const built=g.p(1).groups[0];const ix=g.s.deck.findIndex(c=>c.key==='house');built.house=g.s.deck.splice(ix,1)[0];const original=JSON.stringify(built);
 add(g,'kentucky_avenue','Red',true);add(g,'indiana_avenue','Red',true);add(g,'illinois_avenue','Red',true);apply(g);assert.equal(JSON.stringify(g.p(1).groups.find(x=>x.id===built.id)),original,'built set remains intact');assert.equal(g.sets(1),2);
}
console.log('PASS bot consolidation, duplicate-set wild reassignment, distinct-color priorities, preview purity, free rearrangement, defense/lock/Expansion invariants');
