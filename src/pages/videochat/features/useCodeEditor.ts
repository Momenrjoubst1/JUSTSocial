import { useCallback, useState } from "react";

export interface UseCodeEditorReturn {
  isCodeMode: boolean;
  openCodeEditor: () => void;
  closeCodeEditor: () => void;
  receiveCodeState: (isOpen: boolean) => void;
  reset: () => void;
}

export function useCodeEditor(sendData: (data: object) => void): UseCodeEditorReturn {
  const [isCodeMode, setIsCodeMode] = useState(false);

  const openCodeEditor = useCallback(() => {
    setIsCodeMode(true);
    sendData({ type: "code-open", state: true });
  }, [sendData]);

  const closeCodeEditor = useCallback(() => {
    setIsCodeMode(false);
    sendData({ type: "code-open", state: false });
  }, [sendData]);

  const receiveCodeState = useCallback((isOpen: boolean) => {
    setIsCodeMode(isOpen);
  }, []);

  const reset = useCallback(() => {
    setIsCodeMode(false);
  }, []);

  return {
    isCodeMode,
    openCodeEditor,
    closeCodeEditor,
    receiveCodeState,
    reset,
  };
}
