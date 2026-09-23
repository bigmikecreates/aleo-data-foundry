import type { EntityWriter } from "@aleo-foundry/streaming";
import type {
  BlockRow,
  TransactionRow,
  TransitionRow,
  ProgramRow,
  FeeRow,
  MappingChangeRow,
  ChainMetadataRow,
} from "@aleo-foundry/db";

export interface NormalizedWriterRepos {
  blockRepository: { insert(block: BlockRow): Promise<unknown> };
  transactionRepository: { insert(tx: TransactionRow): Promise<unknown> };
  transitionRepository: { insert(transition: TransitionRow): Promise<unknown> };
  programRepository: { insert(program: ProgramRow): Promise<unknown> };
  feeRepository: { insert(fee: FeeRow): Promise<unknown> };
  mappingChangeRepository: {
    insert(change: MappingChangeRow): Promise<unknown>;
  };
  chainMetadataRepository: {
    upsert(metadata: {
      network: string;
      latest_height: number;
      latest_hash: string;
    }): Promise<unknown>;
    findByNetwork(network: string): Promise<ChainMetadataRow | null>;
  };
}

export function createNormalizedEntityWriter(
  repos: NormalizedWriterRepos,
): EntityWriter {
  return {
    write: async (entity, payload) => {
      switch (entity) {
        case "blocks":
          await repos.blockRepository.insert(payload as BlockRow);
          return;
        case "transactions":
          await repos.transactionRepository.insert(payload as TransactionRow);
          return;
        case "transitions":
          await repos.transitionRepository.insert(payload as TransitionRow);
          return;
        case "programs":
        case "deployments":
          await repos.programRepository.insert(payload as ProgramRow);
          return;
        case "fees":
          await repos.feeRepository.insert(payload as FeeRow);
          return;
        case "mapping-changes":
          await repos.mappingChangeRepository.insert(payload as MappingChangeRow);
          return;
        case "chain-metadata": {
          const metadata = payload as ChainMetadataRow;
          const existing =
            await repos.chainMetadataRepository.findByNetwork(metadata.network);
          if (existing && existing.latest_height >= metadata.latest_height) {
            return;
          }
          await repos.chainMetadataRepository.upsert({
            network: metadata.network,
            latest_height: metadata.latest_height,
            latest_hash: metadata.latest_hash,
          });
          return;
        }
      }
    },
  };
}