/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly VITE_DEV_MODE?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_WEBSOCKET_URL?: string;
  // agrega otras claves VITE_ aquí si se usan en el proyecto
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
