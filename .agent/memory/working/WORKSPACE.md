# Workspace (live task state)

## Current task
- Implement Self-Critique layer for the Ethereal agent.

## Open files
- [selfCritiqueService.js](file:///Users/home/Documents/chatbot-ai/backend/src/services/selfCritiqueService.js)
- [agentService.js](file:///Users/home/Documents/chatbot-ai/backend/src/services/agentService.js)
- [test-robustness.js](file:///Users/home/Documents/chatbot-ai/backend/test-robustness.js)

## Active hypotheses
- Two-phase architecture (agent.invoke + critique.stream) provides cleaner separation than intercepting LangGraph stream events.

## Checkpoints
- [x] Create selfCritiqueService.js with streaming and sync critique functions.
- [x] Rewrite agentService.js runAgentStream to two-phase flow.
- [x] Add critique step to runAgentChat.
- [x] Add Self-Critique unit tests to test-robustness.js.
- [x] Run and pass all 25 tests (13 postModelHook + 12 Self-Critique).
- [x] Clean up scratch files.
- [x] Create walkthrough.

## Next step
- Run integration test (test-agent.js) when GROQ_API_KEY and ChromaDB are available.
