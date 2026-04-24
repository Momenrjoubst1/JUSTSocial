import React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarSearchProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDark: boolean;
}

export function SidebarSearch({ searchQuery, setSearchQuery, isDark }: SidebarSearchProps) {
  const { t } = useTranslation('chat');
  return (
    <div className="px-5 pb-3">
      <div className={`flex items-center px-4 py-2.5 rounded-[32px] transition-all duration-300 shadow-md border ${isDark ? 'bg-[#1e1e24] border-white/5 focus-within:border-white/10 shadow-black/20 focus-within:ring-0' : 'bg-white border-gray-200 focus-within:border-gray-300 shadow-gray-200/50 focus-within:ring-0'
        }`}>
        <Search size={18} className="text-foreground mr-2" />
        <input
          type="text"
          placeholder={t('searchMessages')}
          className="w-full bg-transparent border-none outline-none text-[15px] placeholder:text-foreground"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
