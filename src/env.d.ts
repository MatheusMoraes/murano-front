/// <reference types="vite/client" />

// Additional definitions for our custom variables
interface ImportMetaEnv {
  readonly VITE_MELHOR_ENVIO_TOKEN: string;
  // add more env vars as you create them
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
