const assert=require('node:assert/strict'),{Game}=require('./engine.cjs'),deck=require('./deck.json');
function fresh(){const g=new Game(deck,4,()=>.41);for(const p of g.s.players){g.s.deck.push(...p.hand);p.hand=[];}g.s.phase='play';g.s.turn=0;g.s.pending=null;g.s.played=0;return g;}
function give(g,i,key,color){const n=g.s.deck.findIndex(c=>c.key===key);assert(n>=0,key);const c=g.s.deck.splice(n,1)[0];if(color)g.place(i,c,color);else g.p(i).hand.push(c);return c;}
function expansion(g,i,color){const c=give(g,i,'expansion_property');g.s.turn=i;g.s.played=0;g.play(i,c.id,'play',{color});return c;}
{
 const g=fresh(),support=give(g,0,'kentucky_avenue','Red'),a=expansion(g,0,'Red'),b=expansion(g,0,'Red');give(g,0,'insurance_agency');const insurance=g.p(0).hand.pop();g.p(0).special.push(insurance);const before=g.p(0).hand.length;
 g.removeProp(0,support.id);g.p(1).hand.push(support);assert(!g.find(0,a.id)&&!g.find(0,b.id));assert(g.s.discard.some(c=>c.id===a.id)&&g.s.discard.some(c=>c.id===b.id));assert.equal(g.p(0).hand.length,before+2);assert(!g.p(0).groups.some(group=>group.color==='Red'));
}
{
 const g=fresh(),a=give(g,0,'kentucky_avenue','Red'),b=give(g,1,'indiana_avenue','Red'),x=expansion(g,0,'Red'),y=expansion(g,1,'Red');g.s.turn=0;g.s.played=0;const swap=give(g,0,'forced_deal');g.play(0,swap.id,'play',{target:1,own:a.id,property:b.id});g.respond(1,false);assert(g.find(0,x.id)&&g.find(1,y.id),'atomic same-color swap retains matching support');assert(!g.s.discard.some(c=>c.key==='expansion_property'));
}
{
 const g=fresh();give(g,0,'kentucky_avenue','Red');const x=expansion(g,0,'Red');give(g,1,'mediterranean_avenue','Brown');give(g,1,'baltic_avenue','Brown');g.s.turn=1;g.s.played=0;const sly=give(g,1,'sly_deal');g.play(1,sly.id,'play',{target:0,property:x.id});g.respond(0,false);assert(g.p(1).hand.some(c=>c.id===x.id),'a full set is not an eligible connection; transfer returns to hand');
}
{
 const g=fresh();const def=deck.find(d=>d.type==='wild'&&d.key!=='expansion_property'&&d.colors.includes('Red')&&d.colors.includes('Yellow'));const wild=give(g,0,def.key,'Red');const x=expansion(g,0,'Red');give(g,0,'atlantic_avenue','Yellow');g.s.turn=0;g.s.played=0;g.move(0,wild.id,'Yellow',g.p(0).groups.find(group=>group.color==='Yellow').id);assert(g.s.discard.some(c=>c.id===x.id));
}
{
 const g=fresh();give(g,0,'kentucky_avenue','Red');const x=expansion(g,0,'Red');give(g,1,'oriental_avenue','Light Blue');g.s.turn=1;g.s.played=0;const sly=give(g,1,'sly_deal');g.play(1,sly.id,'play',{target:0,property:x.id});g.respond(0,false);g.choose(1,'Light Blue');assert.equal(g.find(1,x.id).group.color,'Light Blue');assert(g.find(1,x.id).group.cards.some(c=>c.key!=='expansion_property'));assert.equal(x.expansionOwner,1);
}
{
 const g=fresh();const def=deck.find(d=>d.type==='wild'&&d.key!=='expansion_property'&&d.colors.includes('Red')&&d.colors.includes('Yellow'));const wild=give(g,0,def.key,'Red');const x=expansion(g,0,'Red');give(g,0,'atlantic_avenue','Yellow');const insurance=give(g,0,'insurance_agency');g.takeHand(0,insurance.id);g.place(0,insurance);g.s.phase='setup';g.s.turn=0;const before=g.p(0).hand.length;g.move(0,wild.id,'Yellow',g.p(0).groups.find(group=>group.color==='Yellow').id);assert(g.s.discard.some(c=>c.id===x.id));assert.equal(g.p(0).hand.length,before,'setup does not grant passive Insurance draws');
}
console.log('PASS unsupported Expansions discard together; Insurance counts losses; atomic swaps preserve support; recoloring removes support; transfers connect to eligible sets or return to hand');
