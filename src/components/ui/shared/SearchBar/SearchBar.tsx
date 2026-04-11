import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserProfileModal } from '@/components/ui/modals';
import { getUserAvatarUrl } from '@/lib/utils';
import { VerifiedBadge, isUserVerified } from '@/components/ui/core';
import './SearchBar.css';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search..."
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, full_name, username, avatar_url, is_verified')
          .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(5);

        if (error) throw error;

        const blockedIdsStr = localStorage.getItem('blocked_user_ids');
        const blockedIds: string[] = blockedIdsStr ? JSON.parse(blockedIdsStr) : [];

        const users = (data || []).filter((u: User) => !blockedIds.includes(u.id));
        // Pre-populate verified cache from DB results
        users.forEach((u: User) => {
          if (u.is_verified) {
            import('@/components/ui/core/VerifiedBadge').then(m => m.fetchAndCacheVerification(u.id));
          }
        });
        setResults(users);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleUserClick = (user: User) => {
    // Show user profile modal
    setSelectedUserId(user.id);
    setShowResults(false);
  };

  const closeUserProfile = () => {
    setSelectedUserId(null);
  };

  const getAvatarFallbackUrl = (user: User) => {
    return getUserAvatarUrl(user.avatar_url, user.full_name || user.email, 40);
  };

  return (
    <div className="search-container" ref={searchRef}>
      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={handleSearchChange}
        />
        <div className="search-icon">
          {loading ? (
            <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.6, animation: 'pulse 1.5s ease-in-out 0.2s infinite' }} />
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.6, animation: 'pulse 1.5s ease-in-out 0.4s infinite' }} />
            </div>
          ) : (
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488.4 488.4"
            >
              <g>
                <g>
                  <path
                    d="M0,203.25c0,112.1,91.2,203.2,203.2,203.2c51.6,0,98.8-19.4,134.7-51.2l129.5,129.5c2.4,2.4,5.5,3.6,8.7,3.6 s6.3-1.2,8.7-3.6c4.8-4.8,4.8-12.5,0-17.3l-129.6-129.5c31.8-35.9,51.2-83,51.2-134.7c0-112.1-91.2-203.2-203.2-203.2 S0,91.15,0,203.25z M381.9,203.25c0,98.5-80.2,178.7-178.7,178.7s-178.7-80.2-178.7-178.7s80.2-178.7,178.7-178.7 S381.9,104.65,381.9,203.25z"
                  />
                </g>
              </g>
            </svg>
          )}
        </div>
        <div className="search-glow"></div>
        <div className="search-glow-blur"></div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((user) => (
            <div
              key={user.id}
              className="search-result-item"
              onClick={() => handleUserClick(user)}
            >
              <img
                src={getAvatarFallbackUrl(user)}
                alt={user.full_name || user.email}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = getUserAvatarUrl(null, user.full_name || user.email, 40);
                  e.currentTarget.onerror = null;
                }}
                className="search-result-avatar"
              />
              <div className="search-result-info">
                <div className="search-result-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {user.full_name || 'Anonymous User'}
                  {isUserVerified(user.email) && <VerifiedBadge size={14} />}
                  {user.username && <span className="text-xs text-muted-foreground ml-2">@{user.username}</span>}
                </div>
                <div className="search-result-email">{user.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="search-results">
          <div className="search-no-results">
            No users found matching "{query}"
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={closeUserProfile}
        />
      )}
    </div>
  );
};

export default SearchBar;
