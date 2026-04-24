import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareIcon, PlusIcon, MoreHorizontalIcon, ArchiveIcon, TrashIcon } from "lucide-react";
import type { FC } from "react";
import { useChatHistory, ChatThread } from "../hooks/useChatHistory";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const ThreadList: FC = () => {
  const { threads, isLoadingThreads, createNewThread } = useChatHistory();

  return (
    <div className="aui-root aui-thread-list-root flex flex-col gap-1.5 h-full">
      <Button
        variant="outline"
        onClick={createNewThread}
        className="aui-thread-list-new h-11 justify-start gap-2 rounded-2xl border-white/10 bg-white/[0.03] px-4 text-sm text-white shadow-none hover:bg-white/[0.06] hover:text-white"
      >
        <PlusIcon className="size-4" />
        New Chat
      </Button>

      <div className="flex-1 overflow-y-auto mt-2">
        {isLoadingThreads ? (
          <ThreadListSkeleton />
        ) : threads.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-4">No chats yet.</div>
        ) : (
          <div className="flex flex-col gap-1">
            {threads.map((thread) => (
              <ThreadListItem key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex h-9 items-center px-3">
          <Skeleton className="h-4 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
};

const ThreadListItem: FC<{ thread: ChatThread }> = ({ thread }) => {
  const { activeThreadId, setActiveThreadId } = useChatHistory();
  const isActive = activeThreadId === thread.id;

  return (
    <div 
      onClick={() => setActiveThreadId(thread.id)}
      className={`group relative flex h-10 items-center gap-2 rounded-xl text-white/80 transition-all duration-150 cursor-pointer hover:bg-white/[0.06] hover:text-white px-3
        ${isActive ? "bg-white/[0.08] text-white" : ""}`}
    >
      <MessageSquareIcon className="size-4 opacity-70 shrink-0" />
      <span className="flex-1 truncate text-start text-sm">
        {thread.title || "New Chat"}
      </span>

      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 rounded-r-xl bg-gradient-to-l from-[#111]/80 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 size-7 p-0 text-white/50 opacity-0 transition-all duration-150 hover:bg-white/[0.08] hover:text-white group-hover:opacity-100"
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-36 bg-[#1a1a1a] text-white border-white/10">
          <DropdownMenuItem className="gap-2 cursor-pointer hover:bg-white/10">
            <ArchiveIcon className="size-4 opacity-70" /> Archive
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <TrashIcon className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
