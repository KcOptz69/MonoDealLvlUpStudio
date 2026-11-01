import React,{useEffect,useRef,useState} from 'react';
import type {PlayerState,PropertyGroup} from '../types';
import {displayedSetRent} from '../rentDisplay';
import '../set-rent.css';
export function SetRentBadge({group,owner}:{group:PropertyGroup;owner:PlayerState}){
 const amount=displayedSetRent(group,owner);
 const previous=useRef(amount);const [pulse,setPulse]=useState(false);
 useEffect(()=>{if(previous.current===amount)return;previous.current=amount;setPulse(true);const timer=setTimeout(()=>setPulse(false),850);return()=>clearTimeout(timer);},[amount]);
 return <span key={amount} className={"set-rent-badge"+(pulse?" rent-badge-pulse":"")} title="Standard rent, including buildings and Luxury District. Double Rent and the payer’s discount apply when played." aria-label={`Set rent ${amount} million`}>Rent <b>{amount}M</b></span>;
}
