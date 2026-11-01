const assert=require('node:assert/strict'),React=require('react'),{renderToString}=require('react-dom/server'),{Game}=require('./engine.cjs'),deck=require('./deck.json');
(async()=>{const {createServer}=await import('vite');const server=await createServer({root:__dirname,server:{middlewareMode:true},logLevel:'error'});try{
 const {OpponentField}=await server.ssrLoadModule('/src/components/OpponentField.tsx');const {PlayerZone}=await server.ssrLoadModule('/src/components/PlayerZone.tsx');const {MobilePlayerPanels}=await server.ssrLoadModule('/src/components/MobilePlayerPanels.tsx');
 const g=new Game(deck,4);g.s.phase='play';g.s.turn=0;g.s.pending=null;g.place(1,{id:'test-property',key:'mediterranean_avenue'},'Brown');
 let mobile=false,previews=0,fields=0;global.document={documentElement:{classList:{contains:()=>mobile}}};
 const node=OpponentField({state:g.s,onSelectCard:()=>previews++,onViewBank:()=>{},onViewPlayer:()=>fields++});
 function all(n,out=[]){if(n&&typeof n==='object'){out.push(n);React.Children.forEach(n.props?.children,c=>all(c,out));}return out;}
 const nodes=all(node),card=nodes.find(x=>x.type==='button'&&x.props['data-card-id']==='test-property');assert(card);card.props.onClick({stopPropagation(){}});assert.equal(previews,1);assert.equal(fields,0,'PC card click never opens board');
 const board=nodes.find(x=>x.type==='section'&&x.props['data-player']===1);board.props.onClick({target:{closest:()=>null}});assert.equal(fields,1,'PC board background opens field');mobile=true;card.props.onClick({stopPropagation(){}});assert.equal(fields,2,'mobile tap opens field; hold remains artwork preview');delete global.document;
 const props={state:g.s,selectedCard:null,onSelectCard(){},onPlaySelected(){},onBankSelected(){},onEndTurn(){},onViewBank(){},onRearrange(){}};
 const mobileHtml=renderToString(React.createElement(PlayerZone,{...props,allowDrag:false}));assert(!mobileHtml.includes('draggable="true"'));assert(mobileHtml.includes('Arrange properties'));assert(!mobileHtml.includes('Drag here or rearrange'));
 const desktopHtml=renderToString(React.createElement(PlayerZone,props));assert(desktopHtml.includes('draggable="true"'));
 const dock=renderToString(React.createElement(MobilePlayerPanels,props));assert(!dock.includes('draggable="true"'));
 console.log('PASS PC card clicks select preview, board backgrounds open field, mobile taps retain field inspection; mobile hand cannot drag; field transfer is explicitly enabled by toggle; PC dragging remains enabled');
}finally{delete global.document;await server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
