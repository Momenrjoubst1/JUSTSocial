import express from 'express';
import { supabase } from '../services/supabase.service.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const { user_id, email, name, category, message, rating } = req.body;
  const { error } = await supabase.from('feedback').insert({ user_id, email, name, category, message, rating });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
}));

export default router;