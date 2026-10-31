import {useState,useEffect} from 'react';
export function useMobileLayout(){
 const [layout,setLayout]=useState({mobile:false,portrait:false});
 useEffect(()=>{
  // Covers touch phones/tablets; a narrow desktop window also gets the compact layout.
  const device=window.matchMedia('(any-pointer: coarse) and (max-width: 1600px), (max-width: 950px)');
  const orientation=window.matchMedia('(orientation: portrait)');
  const update=()=>{const mobile=device.matches;setLayout({mobile,portrait:mobile&&orientation.matches});document.documentElement.classList.toggle('mobile-device',mobile);};
  update();device.addEventListener('change',update);orientation.addEventListener('change',update);
  return()=>{device.removeEventListener('change',update);orientation.removeEventListener('change',update);document.documentElement.classList.remove('mobile-device');};
 },[]);
 return layout;
}
