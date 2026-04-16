const fs = require('fs');
const path = require('path');

const DOCUMENTS_DIR = path.join(__dirname, '../../../documents');
const REGISTRY_PATH = path.join(DOCUMENTS_DIR, '_registry.json');

// Assure directory exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

async function loadRegistry() {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const data = await fs.promises.readFile(REGISTRY_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load document registry:', err);
  }
  return {};
}

async function saveRegistry(registry) {
  try {
    await fs.promises.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  } catch (err) {
    console.error('Failed to save document registry:', err);
  }
}

async function registerDocumentMapping(diskFilename, originalName) {
  const registry = await loadRegistry();
  registry[diskFilename] = originalName;
  await saveRegistry(registry);
}

async function getOriginalName(diskFilename) {
  const registry = await loadRegistry();
  return registry[diskFilename] || diskFilename;
}

module.exports = {
  registerDocumentMapping,
  getOriginalName,
};
