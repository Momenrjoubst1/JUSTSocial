import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { AVATAR_FRAMES, FrameId } from '../atoms/AvatarFrame';
import { UNIVERSITY_OPTIONS } from '../../constants';
import { HANGER_OPTIONS, HangerId } from '@/features/chat/components/atoms/ChatHanger';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFullName: string;
  username: string;
  initialUniversity: string;
  initialBio: string;
  initialAvatarFrame: FrameId;
  initialChatHanger: string;
  onSave: (fullName: string, bio: string, avatarFrame: FrameId, university: string, chatHanger: string) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  initialFullName,
  username,
  initialUniversity,
  initialBio,
  initialAvatarFrame,
  initialChatHanger,
  onSave,
}) => {
  const [fullName, setFullName] = useState(initialFullName);
  const [university, setUniversity] = useState(initialUniversity);
  const [bio, setBio] = useState(initialBio);
  const [avatarFrame, setAvatarFrame] = useState<FrameId>(initialAvatarFrame);
  const [chatHanger, setChatHanger] = useState(initialChatHanger || 'none');
  const [isSaving, setIsSaving] = useState(false);
  const [showUsernameWarning, setShowUsernameWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName(initialFullName);
      setUniversity(initialUniversity);
      setBio(initialBio);
      setAvatarFrame(initialAvatarFrame);
      setChatHanger(initialChatHanger || 'none');
      setIsSaving(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, initialFullName, initialUniversity, initialBio, initialAvatarFrame, initialChatHanger]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(fullName, bio, avatarFrame, university, chatHanger);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white/70 dark:bg-black/70 backdrop-blur-3xl rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50 dark:border-white/10 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-foreground/5 text-foreground flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">تعديل الملف الشخصي</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-all hover:scale-110 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Avatar Frame Selection */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500" />
              إطار صورة الحساب
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
              {AVATAR_FRAMES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAvatarFrame(f.id)}
                  className={`relative aspect-square rounded-2xl p-1 transition-all duration-300 border-2 ${
                    avatarFrame === f.id 
                      ? 'border-blue-500 bg-blue-500/10 scale-105 shadow-lg' 
                      : 'border-white/20 hover:border-white/40 hover:scale-[1.02]'
                  }`}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-muted flex flex-col items-center justify-center gap-1 text-center p-1">
                    {f.id === 'none' ? (
                        <div className="text-[10px] font-bold text-muted-foreground">بدون</div>
                    ) : (
                        <>
                          <div 
                            className="w-8 h-8 rounded-full border-2" 
                            style={{ 
                              background: f.colors.length > 1 ? `linear-gradient(to tr, ${f.colors.join(',')})` : f.colors[0],
                              borderColor: f.colors[0] === 'transparent' ? 'rgba(0,0,0,0.1)' : f.colors[0]
                            }} 
                          />
                          <span className="text-[9px] font-bold text-foreground truncate w-full">{f.name}</span>
                        </>
                    )}
                  </div>
                  {avatarFrame === f.id && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-background">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Hanger Selection */}
          <div className="space-y-4 border-t border-white/10 pt-4 mt-4">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles size={14} className="text-purple-500" />
              مرافق المحادثة (يتدلى من صورتك في الشات)
            </label>
            <div className="flex flex-wrap gap-3">
              {HANGER_OPTIONS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setChatHanger(h.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300 border-2 min-w-[70px] ${
                    chatHanger === h.id 
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg scale-105' 
                      : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'
                  }`}
                >
                  <span className="text-2xl">{h.icon}</span>
                  <span className="text-[10px] font-bold">{h.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center">
              اختر مرافقاً يظهر لأصدقائك في المحادثة
            </p>
          </div>

          <div className="space-y-2 group relative">
            <label className="text-sm font-bold text-foreground">المعرف (Username)</label>
            <div className="relative">
              <input
                type="text"
                value={username || ''}
                readOnly
                onClick={() => {
                  setShowUsernameWarning(true);
                  setTimeout(() => setShowUsernameWarning(false), 3000);
                }}
                className="w-full bg-black/5 dark:bg-white/5 backdrop-blur-md text-muted-foreground border border-white/30 dark:border-white/10 rounded-2xl px-4 py-3 text-sm cursor-not-allowed transition-all shadow-inner font-mono"
                title="Username cannot be changed"
              />
              {showUsernameWarning && (
                <p className="absolute -bottom-5 left-0 text-[10px] font-medium text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
                  ⚠️ هذا المعرف ثابت لا يمكن تغييره حالياً
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-white/40 dark:bg-black/40 backdrop-blur-xl text-foreground border border-white/50 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-foreground/40 shadow-inner"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">الجامعة</label>
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full bg-white/40 dark:bg-black/40 backdrop-blur-xl text-foreground border border-white/50 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
            >
              <option value="">بدون تحديد</option>
              {UNIVERSITY_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">النبذة (Bio)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              className="w-full bg-white/40 dark:bg-black/40 backdrop-blur-xl text-foreground border border-white/50 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-32 custom-scrollbar placeholder:text-foreground/40 shadow-inner leading-relaxed"
              maxLength={300}
            />
            <div className="text-right text-[10px] font-bold text-muted-foreground flex justify-end items-center gap-1">
               <span className={bio.length > 280 ? 'text-orange-500' : ''}>{bio.length}</span>
               <span>/ 300</span>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-6 rounded-2xl font-bold text-foreground bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-black/60 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:scale-[1.02] active:scale-[0.98]"
            disabled={isSaving}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 px-6 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                يتم الحفظ...
              </>
            ) : (
              'حفظ التغييرات'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
