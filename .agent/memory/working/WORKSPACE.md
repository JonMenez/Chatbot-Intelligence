# Workspace (live task state)

## Current task
- Implement LangGraph Checkpointer (`MemorySaver`) for robust conversational memory.

## Open files
- [mainAgent.js](file:///Users/home/Documents/chatbot-ai/backend/src/agents/mainAgent.js)
- [agentService.js](file:///Users/home/Documents/chatbot-ai/backend/src/services/agentService.js)
- [agentController.js](file:///Users/home/Documents/chatbot-ai/backend/src/controllers/agentController.js)
- [chatApi.js](file:///Users/home/Documents/chatbot-ai/frontend/src/api/chatApi.js)
- [useChat.js](file:///Users/home/Documents/chatbot-ai/frontend/src/hooks/useChat.js)

## Active hypotheses
- Using LangGraph's native Checkpointer with `thread_id` will manage state effectively without manually extracting and parsing raw message history strings.

## Checkpoints
- [x] Create MemorySaver in `mainAgent.js`.
- [x] Refactor `agentService.js` to rely on the Checkpointer instead of manually passing `chatHistory`.
- [x] Configure backend and frontend to use `thread_id` for tracking session instances.
- [x] Ensure everything complies with project rules and linters.

## Next step
- Completed. Task done.
