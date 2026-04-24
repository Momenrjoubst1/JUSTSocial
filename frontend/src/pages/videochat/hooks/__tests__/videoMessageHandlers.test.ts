import { afterEach, describe, expect, it, vi } from "vitest";
import { handleVideoMessage } from "../videoMessageHandlers";

function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    length: 0,
  } as unknown as Storage;
}

describe("handleVideoMessage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("syncs watch state and clears it after the debounce", async () => {
    vi.useFakeTimers();
    const sessionStorageMock = createSessionStorageMock();
    Object.defineProperty(globalThis, "sessionStorage", {
      value: sessionStorageMock,
      configurable: true,
    });

    const deps = {
      setWatchVideoIdFromPeer: vi.fn(),
      setIsWatchMode: vi.fn(),
      setWatchRequestPending: vi.fn(),
      setWatchRequestSent: vi.fn(),
      setWatchCloseRequestPending: vi.fn(),
      setWatchSyncMessage: vi.fn(),
      watchSyncTimerRef: { current: null },
      receiveCodeState: vi.fn(),
      setRemoteUserInfo: vi.fn(),
      localUserInfoRef: { current: null },
      hasRepliedInfoRef: { current: false },
      hasSentInfoRef: { current: false },
      userInfoTimerRef: { current: null },
      sendDataRef: { current: vi.fn() },
      moderationRef: { current: null },
      textChatRef: { current: null },
      setShowReportToast: vi.fn(),
      setReportToastMsg: vi.fn(),
      reportToastTimerRef: { current: null },
      onExtraDataReceivedRef: { current: undefined },
    };

    await handleVideoMessage(
      { type: "watch-sync", action: "play", time: 42, videoId: "abc" },
      {} as never,
      deps,
    );

    expect(deps.setWatchSyncMessage).toHaveBeenCalledWith({
      action: "play",
      time: 42,
      videoId: "abc",
    });

    vi.advanceTimersByTime(100);
    expect(deps.setWatchSyncMessage).toHaveBeenLastCalledWith(null);
  });

  it("removes persisted watch state on watch-exit-confirm", async () => {
    const sessionStorageMock = createSessionStorageMock();
    Object.defineProperty(globalThis, "sessionStorage", {
      value: sessionStorageMock,
      configurable: true,
    });

    const deps = {
      setWatchVideoIdFromPeer: vi.fn(),
      setIsWatchMode: vi.fn(),
      setWatchRequestPending: vi.fn(),
      setWatchRequestSent: vi.fn(),
      setWatchCloseRequestPending: vi.fn(),
      setWatchSyncMessage: vi.fn(),
      watchSyncTimerRef: { current: null },
      receiveCodeState: vi.fn(),
      setRemoteUserInfo: vi.fn(),
      localUserInfoRef: { current: null },
      hasRepliedInfoRef: { current: false },
      hasSentInfoRef: { current: false },
      userInfoTimerRef: { current: null },
      sendDataRef: { current: vi.fn() },
      moderationRef: { current: null },
      textChatRef: { current: null },
      setShowReportToast: vi.fn(),
      setReportToastMsg: vi.fn(),
      reportToastTimerRef: { current: null },
      onExtraDataReceivedRef: { current: undefined },
    };

    await handleVideoMessage({ type: "watch-exit-confirm" }, {} as never, deps);

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("vc_watch_mode");
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("vc_watch_id");
    expect(deps.setIsWatchMode).toHaveBeenCalledWith(false);
    expect(deps.setWatchVideoIdFromPeer).toHaveBeenCalledWith(null);
  });
});
