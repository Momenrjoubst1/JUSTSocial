import { supabase } from '../config/supabase.config';
import { createLogger } from '../utils/logger';

const logger = createLogger('keys.service');

export class KeysService {

    static async registerKeys(userId: string, publicKey: string, encryptedPrivateKey: string) {
        logger.info(`Registering keys for user: ${userId}`);
        
        // Use a transaction if possible, or sequential ops
        const { error: pubError } = await supabase
            .from('user_public_keys')
            .upsert({ user_id: userId, public_key: publicKey }, { onConflict: 'user_id' });
            
        if (pubError) throw new Error("Failed to register public key: " + pubError.message);

        const { error: privError } = await supabase
            .from('encrypted_private_keys')
            .upsert({ user_id: userId, encrypted_key: encryptedPrivateKey }, { onConflict: 'user_id' });

        if (privError) throw new Error("Failed to register private key: " + privError.message);

        return true;
    }

    static async deleteKeys(userId: string) {
        logger.info(`Deleting keys for user: ${userId}`);

        const { error: privError } = await supabase
            .from('encrypted_private_keys')
            .delete()
            .eq('user_id', userId);

        if (privError) throw new Error("Failed to delete private key: " + privError.message);

        // We may not delete public key so others can still decrypt old messages sent by them,
        // or we can just leave it up to the frontend logic for now. 
        // Based on useSendMessage.tsx it usually only deleted `encrypted_private_keys` or both.
        // Let's check what the frontend actually did.
        
        return true;
    }
}