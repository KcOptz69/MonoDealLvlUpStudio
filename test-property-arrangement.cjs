const assert=require('node:assert/strict');
(async()=>{const {createServer}=await import('vite');const server=await createServer({root:__dirname,server:{middlewareMode:true},logLevel:'error'});try{
 const {propertyDestinations}=await server.ssrLoadModule('/src/propertyArrangement.ts');
 const state={players:[{groups:[{id:'brown',color:'Brown',cards:[{id:'natural',key:'mediterranean_avenue'},{id:'wild',key:'wildcard_brown_light_blue'}]},{id:'blue',color:'Light Blue',cards:[{id:'oriental',key:'oriental_avenue'}]},{id:'other',color:'Brown',cards:[{id:'baltic',key:'baltic_avenue'}]}]}]};
 const deck=require('./deck.json'),wildKey=deck.find(d=>d.type==='wild'&&d.colors.includes('Brown')&&d.colors.includes('Light Blue')).key;
 const card=state.players[0].groups[0].cards[1];card.key=wildKey;
 let choices=propertyDestinations(state,'wild');assert.deepEqual(choices.groups.map(g=>g.id),['blue','other']);assert(choices.newColors.includes('Light Blue'));assert(choices.newColors.includes('Brown'));
 card.locked='Brown';choices=propertyDestinations(state,'wild');assert.deepEqual(choices.groups.map(g=>g.id),['other']);assert.deepEqual(choices.newColors,['Brown']);
 delete card.locked;card.key='expansion_property';card.expansionColor='Brown';card.expansionOwner=0;choices=propertyDestinations(state,'wild');assert.deepEqual(choices.groups.map(g=>g.id),['other']);assert.deepEqual(choices.newColors,[]);
 state.players[0].groups[2].cards[0].key='expansion_property';assert.equal(propertyDestinations(state,'wild').groups.length,0,'Expansion cannot attach to another unsupported Expansion');
 assert.deepEqual(propertyDestinations(state,'oriental').newColors,[],'single card cannot move to an identical empty set');
 state.players[0].groups[1].cards.push({id:'vermont',key:'vermont_avenue'},{id:'connecticut',key:'connecticut_avenue'});card.key=wildKey;delete card.expansionColor;assert(!propertyDestinations(state,'wild').groups.some(g=>g.id==='blue'),'full destinations are unavailable');
 assert.deepEqual(propertyDestinations(state,'missing'),{groups:[],newColors:[]});
 const React=require('react'),{renderToString}=require('react-dom/server'),{PlayerZone}=await server.ssrLoadModule('/src/components/PlayerZone.tsx');const {Game}=require('./engine.cjs');const g=new Game(deck,3);g.s.phase='play';g.s.turn=0;g.s.pending=null;
 const html=renderToString(React.createElement(PlayerZone,{state:g.s,arrangeMode:true,selectedCard:null,onSelectCard(){throw Error('preview must not open during render');},onPlaySelected(){},onBankSelected(){},onEndTurn(){},onViewBank(){},onRearrange(){},onDropPropertyToGroup(){}}));
 assert(html.includes('arranging-properties'));assert(html.includes('Select a property to move.'));assert(html.includes('Done'));assert(html.includes('aria-pressed="true"'));
 console.log('PASS tap/click Arrange mode renders; destinations reject full/source sets, respect locks and Expansion support, and show only legal new colors');
}finally{await server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
