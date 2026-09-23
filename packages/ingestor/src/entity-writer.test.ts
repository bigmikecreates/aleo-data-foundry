import { describe, it, expect, vi } from "vitest";
import { createNormalizedEntityWriter } from "./entity-writer.js";
import type { NormalizedWriterRepos } from "./entity-writer.js";
import type { EntityWriter } from "@aleo-foundry/streaming";

function makeRepos(existingHeight?: number | null): NormalizedWriterRepos & {
  writes: Record<string, unknown[]>;
  upserts: unknown[];
} {
  const writes: Record<string, unknown[]> = {};
  const upserts: unknown[] = [];
  const record = (key: string) => (payload: unknown) => {
    writes[key] = [...(writes[key] ?? []), payload];
    return Promise.resolve();
  };
  return {
    writes,
    upserts,
    blockRepository: { insert: vi.fn(record("block")) },
    transactionRepository: { insert: vi.fn(record("transaction")) },
    transitionRepository: { insert: vi.fn(record("transition")) },
    programRepository: { insert: vi.fn(record("program")) },
    feeRepository: { insert: vi.fn(record("fee")) },
    mappingChangeRepository: { insert: vi.fn(record("mapping-change")) },
    chainMetadataRepository: {
      upsert: vi.fn((meta: unknown) => {
        upserts.push(meta);
        return Promise.resolve();
      }),
      findByNetwork: vi.fn(async () => {
        if (existingHeight === undefined || existingHeight === null) return null;
        return {
          network: "testnet",
          latest_height: existingHeight,
          latest_hash: "h",
          updated_at: "2024-06-03T12:00:00.000Z",
        };
      }),
    },
  } as NormalizedWriterRepos & {
    writes: Record<string, unknown[]>;
    upserts: unknown[];
  };
}

describe("createNormalizedEntityWriter", () => {
  it("routes each entity to its repository", async () => {
    const repos = makeRepos();
    const writer: EntityWriter = createNormalizedEntityWriter(repos);

    const payloads: Record<string, unknown> = {
      blocks: { height: 1 },
      transactions: { tx_id: "t1" },
      transitions: { transition_id: "tr1" },
      programs: { program_id: "p1" },
      fees: { tx_id: "f1" },
      "mapping-changes": { tx_id: "m1" },
    };

    await writer.write("blocks", payloads.blocks);
    await writer.write("transactions", payloads.transactions);
    await writer.write("transitions", payloads.transitions);
    await writer.write("programs", payloads.programs);
    await writer.write("fees", payloads.fees);
    await writer.write("mapping-changes", payloads["mapping-changes"]);

    expect(repos.writes.block).toEqual([{ height: 1 }]);
    expect(repos.writes.transaction).toEqual([{ tx_id: "t1" }]);
    expect(repos.writes.transition).toEqual([{ transition_id: "tr1" }]);
    expect(repos.writes.program).toEqual([{ program_id: "p1" }]);
    expect(repos.writes.fee).toEqual([{ tx_id: "f1" }]);
    expect(repos.writes["mapping-change"]).toEqual([{ tx_id: "m1" }]);
  });

  it("treats deployments as program rows", async () => {
    const repos = makeRepos();
    const writer: EntityWriter = createNormalizedEntityWriter(repos);

    await writer.write("deployments", { program_id: "p-deploy" });

    expect(repos.writes.program).toEqual([{ program_id: "p-deploy" }]);
  });

  it("upserts chain metadata only when height is newer", async () => {
    const repos = makeRepos(50);
    const writer: EntityWriter = createNormalizedEntityWriter(repos);

    await writer.write("chain-metadata", {
      network: "testnet",
      latest_height: 30,
      latest_hash: "h30",
      updated_at: "2024-06-03T12:00:00.000Z",
    });

    expect(repos.upserts).toEqual([]);
  });

  it("upserts chain metadata when height is newer", async () => {
    const repos = makeRepos(10);
    const writer: EntityWriter = createNormalizedEntityWriter(repos);

    await writer.write("chain-metadata", {
      network: "testnet",
      latest_height: 11,
      latest_hash: "h11",
      updated_at: "2024-06-03T12:00:00.000Z",
    });

    expect(repos.upserts).toEqual([
      {
        network: "testnet",
        latest_height: 11,
        latest_hash: "h11",
      },
    ]);
  });
});