/**
 * Mutable state read by the mocked `supabase.from('banned_users')` chain in setup-server.ts.
 * Tests call `resetSupabaseBanQueryState()` in beforeEach and assign rows as needed.
 */
export const supabaseBanQueryState = {
  /** Rows returned by the checkIsBanned-style select().eq().or() query */
  rows: [] as Array<{
    id: string;
    reason: string;
    banned_at: string;
    expires_at: string | null;
  }>,
  /** If set, the query promise rejects (simulates network/DB failure) */
  rejectError: null as Error | null,

  reset() {
    this.rows = [];
    this.rejectError = null;
  },
};


