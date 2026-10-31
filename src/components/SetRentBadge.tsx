import React from 'react';
import type {PlayerState,PropertyGroup} from '../types';
import {displayedSetRent} from '../rentDisplay';
import '../set-rent.css';
export function SetRentBadge({group,owner}:{group:PropertyGroup;owner:PlayerState}){
 const amount=displayedSetRent(group,owner);
 return <span className="set-rent-badge" title="Standard rent, including buildings and Luxury District. Double Rent and the payer’s discount apply when played." aria-label={`Set rent ${amount} million`}>Rent <b>{amount}M</b></span>;
}
