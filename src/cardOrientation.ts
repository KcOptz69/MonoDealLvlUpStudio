import type { CardInstance } from './types';

export function isCardInverted(card:CardInstance,color?:string):boolean {
 const colors=card.key==='brown_light_blue_wildcard'?['Brown','Light Blue']:card.key==='pink_orange_wildcard'?['Pink','Orange']:card.key==='red_yellow_wildcard'?['Red','Yellow']:card.key==='dark_blue_green_wildcard'?['Dark Blue','Green']:card.key==='green_railroad_wildcard'?['Green','Railroad']:card.key==='light_blue_railroad_wildcard'?['Light Blue','Railroad']:card.key==='railroad_utility_wildcard'?['Railroad','Utility']:null;
 return !!colors&&color===colors[1];
}
