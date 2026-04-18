## Plan: Refactor Speech Recognition and Echo Prevention

**Steps**
1. **Enhance Backend VAD**: Increase minimum silence duration to allow speech pauses.
2. **Backend STT Debouncing**: Implement a deduplication filter in the agent's message consumer to discard exact duplicate strings arriving within 3 seconds.
3. **Frontend STT Removal**: Strip out the native browser `SpeechRecognition` from `AgentConversationOverlay.tsx` to ensure zero conflict and UI flickering.

**Relevant files**
- `agent/livekit_text_agent.py` — Update `silero.VAD.load(min_silence_duration=2.0)` and add debounce state variables in `on_user_speech_committed`.
- `src/pages/videochat/components/AgentConversationOverlay.tsx` — Remove `useRef` for `recognitionRef` and the whole Web Speech API logic.

**Verification**
1. The user can speak, pause for 1.5 seconds, continue speaking, and the agent processes it as a single thought.
2. If the user says "مرحبا", only one UI bubble appears, and only one AI response is generated.

**Decisions**
- Exclusively use the Server-Side LiveKit STT; Frontend STT is disabled to eliminate redundant hardware triggers and double-renders.