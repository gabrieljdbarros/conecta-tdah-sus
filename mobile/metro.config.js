// Metro (empacotador do React Native): o app importa arquivos da web que
// ficam FORA desta pasta (tipos e lógica pura, em ../src/types e
// ../src/helpers). Por isso o Metro precisa "enxergar" essas duas pastas.
// Só elas: nada do Next.js nem das dependências da web entra no app.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const raiz = path.resolve(__dirname, "..");

config.watchFolders = [
    path.join(raiz, "src", "types"),
    path.join(raiz, "src", "helpers"),
];

module.exports = config;
