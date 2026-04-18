import express from 'express';
import { KeysService } from '../services/keys.service.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { publicKey, encryptedPrivateKey } = req.body;
    if (!userId || !publicKey) return res.status(400).json({ error: 'Missing params' });
    await KeysService.registerKeys(userId, publicKey, encryptedPrivateKey);
    res.json({ success: true });
}));

router.delete('/', asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await KeysService.deleteKeys(userId);
    res.json({ success: true });
}));

export default router;