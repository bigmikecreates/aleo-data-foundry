import type {
  ProvableBlockResponse,
  ProvableTransactionResponse,
} from "./schemas/source.js";

/**
 * ChainSource — abstraction over blockchain data providers.
 *
 * All methods map to Provable API v2 endpoints. Implementations
 * (ProvableApiSource, SnarkOsRestSource) provide the concrete HTTP calls.
 */
export interface ChainSource {
  /** Get the latest block height from the chain. */
  getLatestHeight(): Promise<number>;

  /** Get a block by height or hash. */
  getBlock(heightOrHash: number | string): Promise<ProvableBlockResponse>;

  /** Get all transactions in a block by height. */
  getBlockTransactions(
    height: number,
  ): Promise<ProvableTransactionResponse[]>;

  /** Get a single transaction by its ID. */
  getTransaction(txId: string): Promise<ProvableTransactionResponse>;

  /** Get a program by its ID. */
  getProgram(programId: string): Promise<unknown>;
}
