import React from 'react';

interface FollowStatProps {
  count: number;
  label: string;
  onClick: () => void;
}

export const FollowStat: React.FC<FollowStatProps> = ({ count, label, onClick }) => {
  return (
    <div
      className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <span className="text-foreground font-bold text-base">{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
};
