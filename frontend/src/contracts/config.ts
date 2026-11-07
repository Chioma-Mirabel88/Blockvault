export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"

export const TOKEN_ADDRESS =
  import.meta.env.VITE_TOKEN_ADDRESS || ""

export const TOKEN_NAME =
  import.meta.env.VITE_TOKEN_NAME || "Learning Token"

export const TOKEN_SYMBOL =
  import.meta.env.VITE_TOKEN_SYMBOL || "LTK"

export const TOKEN_DECIMALS =
  Number(import.meta.env.VITE_TOKEN_DECIMALS || "18")

export const LOCAL_CHAIN_ID = 31337

export const LOCAL_CHAIN_NAME = "Hardhat Local"

export const LOCAL_RPC_URL = "http://127.0.0.1:8545"

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000"
