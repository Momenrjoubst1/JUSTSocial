import React from "react";

export function MagicAgentIcon({ size = 20, className = "", color = "#ffffff" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g clipPath="url(#clip0_magic_agent)">
        <path d="M8.47004 5.41003L7.33004 5.67003C6.51004 5.86003 5.87004 6.50003 5.68004 7.32003L5.41004 8.46003C5.38004 8.58003 5.21004 8.58003 5.18004 8.46003L4.92004 7.32003C4.73004 6.50003 4.09004 5.86003 3.27004 5.67003L2.13004 5.40003C2.01004 5.37003 2.01004 5.20003 2.13004 5.17003L3.27004 4.91003C4.09004 4.72003 4.73004 4.08003 4.92004 3.26003L5.19004 2.12003C5.22004 2.00003 5.39004 2.00003 5.42004 2.12003L5.68004 3.26003C5.87004 4.08003 6.51004 4.72003 7.33004 4.91003L8.47004 5.18003C8.59004 5.21003 8.59004 5.38003 8.47004 5.41003Z" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M12 4.5H19C21 4.5 22 5.84 22 7.5V12.5C22 14.16 21 15.5 19 15.5H5C3 15.5 2 14.16 2 12.5V10" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" />
        <path opacity="0.4" d="M7.5 12.5H16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path opacity="0.4" d="M17 8H15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path opacity="0.4" d="M8 19V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path opacity="0.4" d="M12 19V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path opacity="0.4" d="M16 19V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="clip0_magic_agent">
          <rect width={24} height={24} fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}
