import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { supabase as supabaseAdmin } from '../../services/supabase.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

/** Real Supabase + service role; set RUN_SUPABASE_INTEGRATION=1 to enable. */
const runSupabaseIntegration = process.env.RUN_SUPABASE_INTEGRATION === '1';

describe.skipIf(!runSupabaseIntegration)('Ban Instant Enforcement', () => {
  let testUserId: string;

  beforeAll(async () => {
    // إنشاء مستخدم اختبار
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: `test-ban-${Date.now()}@example.com`,
      password: 'Test123!',
      email_confirm: true
    });
    
    if (error) throw error;
    testUserId = user!.id;
  });

  it('يجب أن يرفض الطلب فوراً بعد تحديث banned_until', async () => {
    // 1. توليد توكن صالح
    const { data: { session }, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email: (await supabaseAdmin.auth.admin.getUserById(testUserId)).data.user?.email!,
      password: 'Test123!',
    });

    if (loginError) throw loginError;

    // 2. محاكاة طلب مع التوكن (يجب أن ينجح)
    const mockReq = { 
      headers: { authorization: `Bearer ${session?.access_token}` },
      ip: '127.0.0.1',
      get: (name: string) => name === 'User-Agent' ? 'TestBot' : undefined
    } as any;
    
    const mockRes = { 
      status: vi.fn().mockReturnThis(), 
      json: vi.fn().mockReturnThis() 
    } as any;
    
    const mockNext = vi.fn();

    await authMiddleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled(); // يجب أن ينجح قبل الحظر

    // 3. حظر المستخدم في قاعدة البيانات
    // ملاحظة: نستخدم جدول banned_users لتتبع الحظر
    await supabaseAdmin
      .from('banned_users')
      .insert({
        user_id: testUserId,
        reason: 'Integration test',
        banned_by: 'test-script',
        is_active: true,
        banned_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    // 4. إعادة محاكاة الطلب (يجب أن يفشل فوراً)
    const mockRes2 = { 
      status: vi.fn().mockReturnThis(), 
      json: vi.fn().mockReturnThis() 
    } as any;
    const mockNext2 = vi.fn();

    await authMiddleware(mockReq, mockRes2, mockNext2);
    
    expect(mockRes2.status).toHaveBeenCalledWith(403);
    expect(mockRes2.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('suspended') })
    );
  });

  afterAll(async () => {
    // تنظيف: حذف مستخدم الاختبار
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      await supabaseAdmin.from('banned_users').delete().eq('user_id', testUserId);
    }
  });
});
