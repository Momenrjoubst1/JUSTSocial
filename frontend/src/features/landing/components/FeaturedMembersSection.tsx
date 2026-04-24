import { motion } from "framer-motion";
import { CalendarDays, GraduationCap, Sparkles } from "lucide-react";
import type { CommunityMemberProfile } from "@/features/landing/types";

interface FeaturedMembersSectionProps {
  communityMembers: CommunityMemberProfile[];
  formatJoinedDate: (date: string | null) => string;
  isLoggedIn: boolean;
  membersError: string;
  membersLoading: boolean;
  onSignInClick: () => void;
  t: (key: string) => unknown;
}

export function FeaturedMembersSection({
  communityMembers,
  formatJoinedDate,
  isLoggedIn,
  membersError,
  membersLoading,
  onSignInClick,
  t,
}: FeaturedMembersSectionProps) {
  return (
    <section id="members" className="relative py-28 px-6 z-10">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-10 flex flex-col items-center text-center"
        >
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#A1A1A1] border border-[#262626] bg-[#121212] rounded-full px-4 py-2 mb-5">
            <Sparkles className="w-4 h-4 text-[#D4D4D4]" />
            {String(t("landing:community.badge"))}
          </span>

          <h2 className="text-3xl md:text-5xl font-bold text-[#FFFFFF] leading-tight max-w-3xl">
            {String(t("landing:community.title"))}
          </h2>

          <p className="mt-4 text-[#A1A1A1] text-sm md:text-base max-w-2xl leading-relaxed">
            {String(t("landing:community.description"))}
          </p>
        </motion.div>

        {membersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-[#262626] bg-[#141414]/80 backdrop-blur-xl p-6 animate-pulse"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#232323] mb-4" />
                <div className="h-4 bg-[#232323] rounded w-2/3 mb-3" />
                <div className="h-3 bg-[#202020] rounded w-1/3 mb-5" />
                <div className="h-3 bg-[#202020] rounded w-full mb-2" />
                <div className="h-3 bg-[#202020] rounded w-5/6 mb-6" />
                <div className="h-9 bg-[#202020] rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : membersError ? (
          <div className="max-w-xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-center text-red-200">
            {membersError}
          </div>
        ) : communityMembers.length === 0 ? (
          <div className="max-w-xl mx-auto rounded-2xl border border-[#262626] bg-[#141414]/80 px-6 py-5 text-center text-[#C9C9C9]">
            {String(t("landing:community.empty"))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {communityMembers.map((member, index) => (
              <motion.article
                key={member.id}
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(index * 0.05, 0.3),
                  ease: "easeOut",
                }}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-3xl border border-[#2A2A2A] bg-[linear-gradient(155deg,rgba(25,25,25,0.97),rgba(15,15,15,0.95))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="pointer-events-none absolute -top-24 -right-14 w-44 h-44 rounded-full bg-white/[0.045] blur-3xl group-hover:bg-white/[0.08] transition-colors duration-300" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={member.avatarUrl}
                      alt={member.fullName}
                      className="w-14 h-14 rounded-2xl border border-[#3A3A3A] object-cover shadow-lg"
                      loading="lazy"
                      decoding="async"
                      width="56"
                      height="56"
                    />

                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {member.fullName}
                      </h3>
                      <p className="text-xs text-[#AFAFAF] truncate">
                        {member.username ? `@${member.username}` : "@member"}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#D6D6D6] border border-[#3A3A3A] bg-[#1A1A1A] rounded-full px-3 py-1">
                    {String(t("landing:community.active"))}
                  </span>
                </div>

                <p className="mt-5 text-[13px] text-[#C6C6C6] leading-relaxed line-clamp-3 min-h-[60px]">
                  {member.bio}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-[11px] text-[#BABABA]">
                  <div className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#171717] px-3 py-2">
                    <CalendarDays className="w-3.5 h-3.5 text-[#D0D0D0]" />
                    <span className="truncate">
                      {formatJoinedDate(member.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#171717] px-3 py-2">
                    <GraduationCap className="w-3.5 h-3.5 text-[#D0D0D0]" />
                    <span className="truncate">
                      {member.university ||
                        member.chatHanger ||
                        String(t("landing:community.fallbackRole"))}
                    </span>
                  </div>
                </div>

                <a
                  href={`/profile/${member.id}`}
                  onClick={(event) => {
                    if (!isLoggedIn) {
                      event.preventDefault();
                      onSignInClick();
                    }
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[#3A3A3A] bg-[#1B1B1B] px-4 py-2.5 text-sm font-medium text-[#ECECEC] transition-all duration-300 hover:bg-[#222222] hover:border-[#505050]"
                >
                  {String(t("landing:community.viewProfile"))}
                </a>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
