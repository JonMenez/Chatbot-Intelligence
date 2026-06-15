# Workspace (live task state)

## Current task
- Unify documents folder directory across RAG service, upload controller, and registry service to `backend/documents`.

## Open files
- [ragService.js](file:///Users/home/Documents/chatbot-ai/backend/src/services/ragService.js)
- [uploadController.js](file:///Users/home/Documents/chatbot-ai/backend/src/controllers/uploadController.js)
- [registryService.js](file:///Users/home/Documents/chatbot-ai/backend/src/services/registryService.js)

## Active hypotheses
- Changing the folder path to `backend/documents` consistently across all files will allow user-uploaded files to be re-ingested correctly on ChromaDB reset.

## Checkpoints
- [x] Update `backend/src/controllers/uploadController.js` to point to `backend/documents`.
- [x] Update `backend/src/services/registryService.js` to point to `backend/documents`.
- [x] Verify that new file uploads go to `backend/documents`.
- [x] Verify that ChromaDB initialization reads from `backend/documents` and re-ingests files correctly.
- [x] Investigate and fix the empty bubble response caused by ChatGroq returning malformed `invalid_tool_calls` (args: "null").

## Next step
- Task completed successfully. Archive workspace state.
