export interface PaymentItem {id:string;value:number;zone:string}
// Minimize overpayment first; preserve property assets, then spend larger bank bills.
export function suggestPayment(items:PaymentItem[],amount:number,bankFirst=false):string[]{
 if(amount<=0)return [];
 const banks=items.filter(x=>x.zone==='bank');
 if(bankFirst){const bankTotal=banks.reduce((n,x)=>n+x.value,0);if(bankTotal>=amount)return suggestPayment(banks,amount);return [...banks.map(x=>x.id),...suggestPayment(items.filter(x=>x.zone!=='bank'),amount-bankTotal)];}
 const usable=items.filter(x=>x.value>0);
 if(usable.reduce((n,x)=>n+x.value,0)<=amount)return usable.map(x=>x.id);
 type Pick={ids:string[];property:number;bills:number[]};
 const better=(a:Pick,b:Pick)=>{if(a.property!==b.property)return a.property<b.property;for(let i=0;i<Math.max(a.bills.length,b.bills.length);i++){const d=(a.bills[i]||0)-(b.bills[i]||0);if(d)return d>0;}return a.ids.length<b.ids.length;};
 const dp=new Map<number,Pick>([[0,{ids:[],property:0,bills:[]}]]);
 for(const x of usable)for(const [sum,prev] of [...dp]){
  const next={ids:[...prev.ids,x.id],property:prev.property+(x.zone==='bank'?0:x.value),bills:x.zone==='bank'?[...prev.bills,x.value].sort((a,b)=>b-a):prev.bills};
  const value=sum+x.value,old=dp.get(value);if(!old||better(next,old))dp.set(value,next);
 }
 const sum=[...dp.keys()].filter(n=>n>=amount).sort((a,b)=>a-b)[0];return dp.get(sum)?.ids||[];
}
