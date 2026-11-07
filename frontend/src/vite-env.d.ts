/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: string
  readonly VITE_CONTRACT_ADDRESS?: string
  readonly VITE_TOKEN_ADDRESS?: string
  readonly VITE_TOKEN_NAME?: string
  readonly VITE_TOKEN_SYMBOL?: string
  readonly VITE_TOKEN_DECIMALS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
