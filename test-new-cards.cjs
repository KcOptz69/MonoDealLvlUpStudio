const assert=require('node:assert/strict');const{Game,COLORS}=require('./engine.cjs');const{Rooms}=require('./rooms.cjs');const deck=require('./deck.json');
const test=(name,fn)=>{fn();console.log('PASS '+name)};
function fresh(){const g=new Game(deck,3,()=>.41);for(const p of g.s.players){g.s.deck.push(...p.hand);p.hand=[];}g.s.phase='play';g.s.turn=0;g.s.pending=null;g.s.queue=[];g.s.played=0;return g;}
function give(g,i,key,zone='hand'){const n=g.s.deck.findIndex(c=>c.key===key);assert(n>=0,key);const c=g.s.deck.splice(n,1)[0];if(zone==='field')g.place(i,c,g.d(c).colors?.[0]);else g.p(i)[zone].push(c);return c;}
function allow(g){while(g.s.pending?.kind==='counter'){const p=g.s.pending;g.respond(p.responders?.[0]??p.responder,false);}}
function count(g){return g.s.deck.length+g.s.discard.length+g.s.players.reduce((n,p)=>n+p.hand.length+p.bank.length+p.special.length+p.groups.reduce((n,g)=>n+g.cards.length+!!g.house+!!g.hotel,0),0)+(g.s.pending?.kind==='chance'?g.s.pending.cards.length:0);}
test('160 cards; new copies and face values match approved list',()=>{assert.equal(deck.reduce((n,d)=>n+d.copies,0),160);for(const[key,n,value]of[['go_to_jail',2,4],['expansion_property',4,0],['free_parking',1,3],['chance',2,2],['community_chest',3,2],['empire_rent',2,3]]){const d=deck.find(d=>d.key===key);assert.equal(d.copies,n);assert.equal(d.value,value);}for(const d of deck.filter(d=>d.type==='rent'&&d.key!=='empire_rent'))assert.equal(d.copies,d.any?4:3);});
test('Go to Jail is counterable and waits until the target turn; skipped turn draws nothing',()=>{const g=fresh(),c=give(g,0,'go_to_jail');give(g,1,'just_say_no');g.play(0,c.id,'play',{target:1});assert(!g.p(1).jailed);g.respond(1,true);g.respond(0,false);assert(!g.p(1).jailed);const j=give(g,0,'go_to_jail');g.play(0,j.id,'play',{target:1});allow(g);assert(g.p(1).jailed);assert(!g.s.pending);g.end(0);assert.equal(g.s.pending.kind,'jail');const size=g.p(1).hand.length;g.jail(1,false);assert.equal(g.s.turn,2);assert.equal(g.p(1).hand.length,size);assert(!g.p(1).jailed);});
test('Bail discards at least10M; no partial bail or IOU; normal start effects occur afterward',()=>{const g=fresh();g.s.turn=1;g.p(1).jailed=true;give(g,1,'emergency_treasury','special');const a=give(g,1,'money_5m','bank'),b=give(g,1,'money_5m','bank');const iou=give(g,1,'i_owe_you');g.begin();assert.equal(g.p(1).bank.length,2);assert.equal(g.p(1).hand.length,1);g.jail(1,true);assert.throws(()=>g.pay(1,[a.id]),/10M/);assert.throws(()=>g.owe(1,iou.id),/another player/);g.pay(1,[a.id,b.id]);assert(!g.p(1).jailed);assert(g.s.discard.some(c=>c.id===a.id));assert.equal(g.p(1).bank[0].key,'money_3m');assert.equal(g.p(1).hand.length,3);});
test('Private Vault only refills an empty hand at turn start; Treasury pays even with an existing bank',()=>{const g=fresh();give(g,0,'private_vault','special');give(g,0,'emergency_treasury','special');give(g,0,'money_1m','bank');g.begin();assert.equal(g.p(0).hand.length,7);assert.equal(g.p(0).bank.at(-1).key,'money_3m');assert.equal(g.handLimit(0),9);const events=g.s.events.filter(e=>e.type==='special_trigger');assert(events.some(e=>e.key==='private_vault'));assert(events.some(e=>e.key==='emergency_treasury'));});
test('Free Parking banks once without an AP, works at zero AP and resets per turn; cannot bank properties',()=>{const g=fresh();give(g,0,'free_parking','special');const a=give(g,0,'money_1m'),b=give(g,0,'money_2m'),prop=give(g,0,'baltic_avenue');g.s.played=3;assert.throws(()=>g.play(0,prop.id,'bank'),/Properties/);assert(!g.p(0).freeBankUsed);g.play(0,a.id,'bank');assert.equal(g.s.played,3);assert(g.p(0).freeBankUsed);assert.throws(()=>g.play(0,b.id,'bank'),/No card plays/);g.s.turn=0;g.begin();assert(g.freeBank(0));});
test('Community Chest and Chance cost zeroAP; Chance reveals3, keeps1, discards2 without losing cards',()=>{const g=fresh();const chest=give(g,0,'community_chest'),chance=give(g,0,'chance');g.s.played=3;const before=g.p(0).hand.length;g.play(0,chest.id,'play');assert.equal(g.s.played,3);assert.equal(g.p(0).hand.length,before+1);assert.equal(g.p(1).hand.length,1);assert.equal(g.p(2).hand.length,1);g.play(0,chance.id,'play');assert.equal(g.s.played,3);assert.equal(g.s.pending.kind,'chance');assert.equal(g.s.pending.cards.length,3);assert.equal(count(g),160);const chosen=g.s.pending.cards[1];assert.throws(()=>g.choose(1,chosen.id),/not requested/);g.choose(0,chosen.id);assert(g.p(0).hand.some(c=>c.id===chosen.id));assert.equal(count(g),160);});
test('Expansion Property requires existing color, cannot be paid/banked, locks for owner and can change after transfer',()=>{const g=fresh(),c=give(g,0,'expansion_property');assert.throws(()=>g.play(0,c.id,'play',{color:'Red'}),/existing/);give(g,0,'kentucky_avenue','field');g.play(0,c.id,'play',{color:'Red'});assert.equal(c.expansionColor,'Red');assert.throws(()=>g.move(0,c.id,'Blue'),/fixed/);assert(!g.payable(0,{key:'debt_collector'}).some(x=>x.id===c.id));give(g,1,'oriental_avenue','field');g.s.turn=1;g.s.played=0;const sly=give(g,1,'sly_deal');g.play(1,sly.id,'play',{target:0,property:c.id});allow(g);assert.equal(g.s.pending.kind,'expansion');g.choose(1,'Light Blue');assert.equal(g.find(1,c.id).group.color,'Light Blue');assert.equal(c.expansionOwner,1);assert.equal(count(g),160);});
test('Incoming Expansion with no existing color returns to hand for later legal placement',()=>{const g=fresh();give(g,0,'kentucky_avenue','field');const c=give(g,0,'expansion_property');g.play(0,c.id,'play',{color:'Red'});const sly=give(g,1,'sly_deal');g.s.turn=1;g.s.played=0;g.play(1,sly.id,'play',{target:0,property:c.id});allow(g);assert(g.p(1).hand.some(x=>x.id===c.id));assert(!g.find(1,c.id));assert.equal(count(g),160);});
test('Empire Rent counts wilds and specials, excludes buildings, supports stacked doubling with AP validation',()=>{const g=fresh();give(g,0,'mediterranean_avenue','field');give(g,0,'multicolor_wildcard','field');give(g,0,'free_parking','special');give(g,0,'insurance_agency','special');const r=give(g,0,'empire_rent'),a=give(g,0,'double_the_rent'),b=give(g,0,'double_the_rent');give(g,1,'money_10m','bank');g.s.played=1;assert.throws(()=>g.play(0,r.id,'play',{target:1,doubleIds:[a.id,b.id]}),/available plays/);g.s.played=0;g.play(0,r.id,'play',{target:1,doubleIds:[a.id,b.id]});assert.equal(g.s.played,3);assert.equal(g.s.pending.e.amount,16);assert.equal(g.s.pending.e.target,1);});
test('Forced Deal cannot offer a property from your own complete set',()=>{const g=fresh();give(g,0,'mediterranean_avenue','field');const own=give(g,0,'baltic_avenue','field');const target=give(g,1,'kentucky_avenue','field');const c=give(g,0,'forced_deal');assert.throws(()=>g.play(0,c.id,'play',{target:1,own:own.id,property:target.id}),/outside a complete set/);});
test('Online new commands use rotated seat ownership and reconnect preserves jail/choice state',()=>{const rooms=new Rooms();const a=rooms.create('Host'),b=rooms.join(a.code,'B');rooms.command(a.code,a.token,'ready',{ready:true});rooms.command(a.code,b.token,'ready',{ready:true});rooms.command(a.code,a.token,'start');const r=rooms.get(a.code,a.token).r,g=r.game;const actor=r.gameSeats.indexOf(1);g.s.phase='play';g.s.turn=actor;g.s.played=0;g.p(actor).jailed=true;g.begin();const view=rooms.view(r,1);assert.equal(view.state.pending.responder,0);assert(view.state.players[0].jailed);rooms.command(a.code,b.token,'action',{method:'jail',args:[false]});assert(!g.p(actor).jailed);rooms.close();});
test('Special trigger timing matches all eight approved rules',()=>{
 const g=fresh();give(g,0,'corporate_headquarters','special');give(g,0,'private_vault','special');give(g,0,'investment_office','special');give(g,0,'emergency_treasury','special');g.begin();const triggers=()=>g.s.events.filter(e=>e.type==='special_trigger');assert(triggers().some(e=>e.key==='private_vault'));assert(triggers().some(e=>e.key==='investment_office'));assert(triggers().some(e=>e.key==='emergency_treasury'));g.s.played=3;const c=give(g,0,'money_1m');g.play(0,c.id,'bank');assert(triggers().some(e=>e.key==='corporate_headquarters'));
 while(g.p(0).hand.length<8)give(g,0,'money_1m');g.end(0);assert(triggers().filter(e=>e.key==='private_vault').some(e=>e.message.includes('9 cards')));
 const h=fresh();give(h,0,'mediterranean_avenue','field');give(h,0,'luxury_district','special');give(h,1,'rent_controlled_residence','special');give(h,1,'insurance_agency','special');const cash=give(h,1,'money_1m','bank');const r=give(h,0,'empire_rent');h.play(0,r.id,'play',{target:1});assert(h.s.events.some(e=>e.type==='special_trigger'&&e.key==='luxury_district'));assert(!h.s.events.some(e=>e.type==='special_trigger'&&e.key==='rent_controlled_residence'));allow(h);h.pay(1,[cash.id]);assert(h.s.events.some(e=>e.type==='special_trigger'&&e.key==='rent_controlled_residence'));
 const k=fresh();const ins=give(k,1,'insurance_agency','special'),ev=give(k,0,'eviction_notice');k.play(0,ev.id,'play',{target:1,property:ins.id});allow(k);assert(k.s.events.some(e=>e.type==='special_trigger'&&e.key==='insurance_agency'));
 const parking=fresh();give(parking,0,'free_parking','special');const money=give(parking,0,'money_1m');parking.play(0,money.id,'bank');assert(parking.s.events.some(e=>e.type==='special_trigger'&&e.key==='free_parking'));
});
test('Shared passive events are visible to every online seat with the right player mapping',()=>{const rooms=new Rooms();const a=rooms.create('A'),b=rooms.join(a.code,'B');rooms.command(a.code,a.token,'ready',{ready:true});rooms.command(a.code,b.token,'ready',{ready:true});rooms.command(a.code,a.token,'start');const r=rooms.get(a.code,a.token).r,g=r.game;g.s.phase='play';g.s.turn=0;for(const p of g.s.players){g.s.deck.push(...p.hand);p.hand=[];}give(g,0,'emergency_treasury','special');g.begin();for(const seat of[0,1]){const v=rooms.view(r,seat);const event=v.state.events.findLast(e=>e.type==='special_trigger'&&e.key==='emergency_treasury');assert(event);assert.equal(event.actor,(0-r.gameSeats.indexOf(seat)+g.s.players.length)%g.s.players.length);assert.equal(event.message,'+3M added to bank');}rooms.close();});

test('Income Tax charges 3M per complete 10M in one bank and sends payment to discard',()=>{
 const g = fresh();
 const tax = give(g,0,'income_tax');
 g.p(1).bank = [{id:'ten',key:'money_10m'},{id:'six1',key:'money_3m'},{id:'six2',key:'money_3m'},{id:'ten2',key:'money_10m'}];
 assert.equal(g.d(tax).value,3);
 assert.equal(deck.find(c=>c.key==='income_tax').copies,2);
 assert.equal(g.incomeTax(1),6);
 const bankBefore = g.p(0).bank.length;
 g.play(0,tax.id,'play',{target:1});
 assert.equal(g.s.pending.kind,'counter');
 g.respond(1,false);
 assert.equal(g.s.pending.e.amount,6);
 g.pay(1,['six1','six2']);
 assert.equal(g.p(0).bank.length,bankBefore);
 assert(g.s.discard.some(c=>c.id==='six1'));
 assert(g.s.discard.some(c=>c.id==='six2'));
});

test('Bank Withdrawal retrieves one banked action at zero remaining plays and rejects money', () => {
 const g = fresh();
 const withdrawal = give(g, 0, 'bank_withdrawal');
 const action = {id:'bank-action',key:'debt_collector'};
 const money = {id:'bank-cash',key:'money_1m'};
 g.p(0).bank = [action, money];
 g.s.played = g.limit(0);
 const before = JSON.stringify(g.s);
 assert.throws(() => g.play(0, withdrawal.id, 'play', {bankCard: money.id}), /Choose an action card/);
 assert.equal(JSON.stringify(g.s), before);
 assert(g.options(0).some(option => option.id === withdrawal.id && option.args.bankCard === action.id));
 g.play(0, withdrawal.id, 'play', {bankCard: action.id});
 assert.equal(g.s.played, g.limit(0));
 assert.deepEqual(g.p(0).bank, [money]);
 assert(g.p(0).hand.includes(action));
 assert(g.s.discard.includes(withdrawal));
 assert.equal(g.d(withdrawal).value, 1);
 assert.equal(deck.find(card => card.key === 'bank_withdrawal').copies, 4);
});

test('Eviction Notice blocks the specific card for the current turn only', () => {
 const g = fresh();
 const property = give(g, 1, 'baltic_avenue', 'field');
 const eviction = give(g, 0, 'eviction_notice');
 g.play(0, eviction.id, 'play', {target: 1, property: property.id});
 allow(g);
 assert(g.p(1).hand.includes(property));
 // A donation can put the evicted card into the active player's hand.
 g.p(0).hand.push(g.p(1).hand.pop());
 const plays = g.s.played;
 assert.throws(() => g.play(0, property.id, 'play', {color: 'Brown'}), /evicted property/);
 assert.equal(g.s.played, plays);
 assert(!g.options(0).some(option => option.id === property.id));
 g.p(1).hand.push(g.p(0).hand.pop());
 g.end(0);
 g.play(1, property.id, 'play', {color: 'Brown'});
 assert(g.find(1, property.id));
});
