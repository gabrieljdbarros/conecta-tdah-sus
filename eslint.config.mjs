import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // App nativo (Expo): tem o próprio lint e as próprias dependências
      "mobile/**",
      // Edge Functions (Deno): rodam no servidor do Supabase, com outro ambiente
      "supabase/functions/**",
    ],
  },
];

export default eslintConfig;
