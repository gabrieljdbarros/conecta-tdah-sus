// Lint do app (regras recomendadas do Expo). Separado do lint da web, que ignora esta pasta
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
    expoConfig,
    { ignores: ["dist/*", ".expo/*"] },
]);
