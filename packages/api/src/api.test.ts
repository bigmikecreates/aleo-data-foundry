import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";
import type { AppContext } from "./server.js";
import { encodeCursor, decodeCursor, parseLimit } from "./utils.js";
import { generateETag } from "./middleware/etag.js";
import type {
  BlockRepository,
  TransactionRepository,
  TransitionRepository,
  ProgramRepository,
  MappingChangeRepository,
  FeeRepository,
  ChainMetadataRepository,
} from "@aleo-foundry/db";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_BLOCK_3 = {
  height: 3,
  block_hash: "hash3",
  previous_hash: "hash2",
  network: "testnet",
  timestamp: "2024-06-03T14:00:00.000Z",
  coinbase_target: "4294967295",
  proof_target: "4294967295",
  last_coinbase_target: "4294967295",
  last_coinbase_ratio: "1000000",
  round: "3",
  transactions_root: "tr3",
  previous_state_root: "sr2",
  transactions_count: 2,
  aborted_transactions_count: 0,
  created_at: "2024-06-03T14:00:00.000Z",
};

const MOCK_BLOCK_2 = {
  height: 2,
  block_hash: "hash2",
  previous_hash: "hash1",
  network: "testnet",
  timestamp: "2024-06-03T13:00:00.000Z",
  coinbase_target: "4294967295",
  proof_target: "4294967295",
  last_coinbase_target: "4294967295",
  last_coinbase_ratio: "1000000",
  round: "2",
  transactions_root: "tr2",
  previous_state_root: "sr1",
  transactions_count: 1,
  aborted_transactions_count: 0,
  created_at: "2024-06-03T13:00:00.000Z",
};

const MOCK_BLOCK_1 = {
  height: 1,
  block_hash: "hash1",
  previous_hash: "hash0",
  network: "testnet",
  timestamp: "2024-06-03T12:00:00.000Z",
  coinbase_target: "4294967295",
  proof_target: "4294967295",
  last_coinbase_target: "4294967295",
  last_coinbase_ratio: "1000000",
  round: "1",
  transactions_root: "tr1",
  previous_state_root: "sr0",
  transactions_count: 1,
  aborted_transactions_count: 0,
  created_at: "2024-06-03T12:00:00.000Z",
};

const MOCK_BLOCKS = [MOCK_BLOCK_3, MOCK_BLOCK_2, MOCK_BLOCK_1];

const MOCK_TX = {
  tx_id: "at1tx",
  block_height: 12345,
  block_hash: "ab17upp",
  network: "testnet",
  type: "execute",
  status: "accepted",
  index_in_block: 0,
  global_state_root: "sr1abc",
  created_at: "2024-06-03T12:00:00.000Z",
};

const MOCK_TRANSITION = {
  transition_id: "au1tr",
  tx_id: "at1tx",
  program_id: "credits.aleo",
  function_name: "transfer_public",
  inputs_json: [] as unknown[],
  outputs_json: [] as unknown[],
  tpk: "tpk123",
  tcm: "tcm456",
  created_at: "2024-06-03T12:00:00.000Z",
};

const MOCK_PROGRAM = {
  program_id: "credits.aleo",
  network: "testnet",
  edition: 0,
  deployment_tx_id: "at1deploy",
  deployed_at: "2024-06-03T12:00:00.000Z",
  created_at: "2024-06-03T12:00:00.000Z",
};

const MOCK_MAPPING_CHANGE_3 = {
  id: 3,
  tx_id: "at1tx3",
  transition_id: "au1tr3",
  program_id: "credits.aleo",
  mapping_name: "account",
  mapping_id: "mapping1",
  action: "set",
  key_id: "key3",
  value_id: "val3",
  index_in_transition: 0,
  network: "testnet",
  created_at: "2024-06-03T14:00:00.000Z",
};

const MOCK_MAPPING_CHANGE_2 = {
  id: 2,
  tx_id: "at1tx2",
  transition_id: "au1tr2",
  program_id: "credits.aleo",
  mapping_name: "account",
  mapping_id: "mapping1",
  action: "set",
  key_id: "key2",
  value_id: "val2",
  index_in_transition: 0,
  network: "testnet",
  created_at: "2024-06-03T13:00:00.000Z",
};

const MOCK_MAPPING_CHANGE_1 = {
  id: 1,
  tx_id: "at1tx1",
  transition_id: "au1tr1",
  program_id: "credits.aleo",
  mapping_name: "account",
  mapping_id: "mapping1",
  action: "remove",
  key_id: "key1",
  value_id: "val1",
  index_in_transition: 0,
  network: "testnet",
  created_at: "2024-06-03T12:00:00.000Z",
};

const MOCK_MAPPING_CHANGES = [
  MOCK_MAPPING_CHANGE_3,
  MOCK_MAPPING_CHANGE_2,
  MOCK_MAPPING_CHANGE_1,
];

const MOCK_FEE_3 = {
  id: 3,
  tx_id: "at1tx3",
  transition_id: "au1tr3",
  payer: "aleo1payer3",
  amount: 100000,
  global_state_root: "sr3",
  network: "testnet",
  created_at: "2024-06-03T14:00:00.000Z",
};

const MOCK_FEE_2 = {
  id: 2,
  tx_id: "at1tx2",
  transition_id: "au1tr2",
  payer: "aleo1payer2",
  amount: 50000,
  global_state_root: "sr2",
  network: "testnet",
  created_at: "2024-06-03T13:00:00.000Z",
};

const MOCK_FEE_1 = {
  id: 1,
  tx_id: "at1tx1",
  transition_id: "au1tr1",
  payer: "aleo1payer1",
  amount: 25000,
  global_state_root: "sr1",
  network: "testnet",
  created_at: "2024-06-03T12:00:00.000Z",
};

const MOCK_FEES = [MOCK_FEE_3, MOCK_FEE_2, MOCK_FEE_1];

const MOCK_CHAIN_METADATA = {
  network: "testnet",
  latest_height: 12345,
  latest_hash: "ab17upp",
  updated_at: "2024-06-03T12:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------

function createMockBlockRepository(): BlockRepository {
  return {
    async insert() {
      throw new Error("Not implemented in tests");
    },
    async findByHeight(height: number) {
      return MOCK_BLOCKS.find((b) => b.height === height) ?? null;
    },
    async findAll(limit: number, cursor?: number) {
      let filtered = MOCK_BLOCKS;
      if (cursor !== undefined) {
        filtered = MOCK_BLOCKS.filter((b) => b.height < cursor);
      }
      return filtered.slice(0, limit);
    },
  } as unknown as BlockRepository;
}

function createMockTransactionRepository(): TransactionRepository {
  return {
    async insert() {
      throw new Error("Not implemented in tests");
    },
    async findByTxId(txId: string) {
      if (txId === MOCK_TX.tx_id) return MOCK_TX;
      return null;
    },
    async findAll(limit: number, _cursor?: string) {
      return [MOCK_TX].slice(0, limit);
    },
  } as unknown as TransactionRepository;
}

function createMockTransitionRepository(): TransitionRepository {
  return {
    async insert() {
      throw new Error("Not implemented in tests");
    },
    async findByTransitionId(id: string) {
      if (id === MOCK_TRANSITION.transition_id) return MOCK_TRANSITION;
      return null;
    },
    async findAll(limit: number, _cursor?: string) {
      return [MOCK_TRANSITION].slice(0, limit);
    },
  } as unknown as TransitionRepository;
}

function createMockProgramRepository(): ProgramRepository {
  return {
    async insert() {
      throw new Error("Not implemented in tests");
    },
    async findByProgramId(id: string) {
      if (id === MOCK_PROGRAM.program_id) return MOCK_PROGRAM;
      return null;
    },
    async findAll(limit: number, _cursor?: string) {
      return [MOCK_PROGRAM].slice(0, limit);
    },
  } as unknown as ProgramRepository;
}

function createMockMappingChangeRepository(): MappingChangeRepository {
  return {
    async insert() {
      throw new Error("Not implemented in tests");
    },
    async findAll(limit: number, cursor?: number) {
      let filtered = MOCK_MAPPING_CHANGES;
      if (cursor !== undefined) {
        filtered = MOCK_MAPPING_CHANGES.filter((c) => c.id < cursor);
      }
      return filtered.slice(0, limit);
    },
  } as unknown as MappingChangeRepository;
}

function createMockFeeRepository(): FeeRepository {
  return {
    async insert() {
      throw new Error("Not implemented in tests");
    },
    async findByTxId(_txId: string) {
      return [];
    },
    async findAll(limit: number, cursor?: number) {
      let filtered = MOCK_FEES;
      if (cursor !== undefined) {
        filtered = MOCK_FEES.filter((f) => f.id < cursor);
      }
      return filtered.slice(0, limit);
    },
  } as unknown as FeeRepository;
}

function createMockChainMetadataRepository(): ChainMetadataRepository {
  return {
    async upsert() {
      throw new Error("Not implemented in tests");
    },
    async findByNetwork(network: string) {
      if (network === MOCK_CHAIN_METADATA.network) return MOCK_CHAIN_METADATA;
      return null;
    },
  } as unknown as ChainMetadataRepository;
}

function createAppContext(): AppContext {
  return {
    blockRepository: createMockBlockRepository(),
    transactionRepository: createMockTransactionRepository(),
    transitionRepository: createMockTransitionRepository(),
    programRepository: createMockProgramRepository(),
    mappingChangeRepository: createMockMappingChangeRepository(),
    feeRepository: createMockFeeRepository(),
    chainMetadataRepository: createMockChainMetadataRepository(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer(createAppContext());
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ===== Health =====

describe("Health", () => {
  it("GET /health returns ok with timestamp", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.status).toBe("ok");
    expect(body.data.timestamp).toBeDefined();
    expect(typeof body.data.timestamp).toBe("string");
  });
});

// ===== Blocks =====

describe("Blocks", () => {
  describe("GET /blocks", () => {
    it("returns paginated block list with default limit", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    });

    it("respects custom limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks?limit=2",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(2);
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.cursor).toBeDefined();
    });

    it("returns hasMore=false when all items fit", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks?limit=100",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(3);
      expect(body.meta.hasMore).toBe(false);
      expect(body.meta.cursor).toBeNull();
    });

    it("paginates using cursor", async () => {
      // First page
      const page1 = await app.inject({
        method: "GET",
        url: "/blocks?limit=2",
      });
      const body1 = JSON.parse(page1.payload);
      expect(body1.data).toHaveLength(2);
      expect(body1.meta.hasMore).toBe(true);
      expect(body1.data[0].height).toBe(3);
      expect(body1.data[1].height).toBe(2);

      // Second page
      const page2 = await app.inject({
        method: "GET",
        url: `/blocks?limit=2&cursor=${body1.meta.cursor}`,
      });
      const body2 = JSON.parse(page2.payload);
      expect(body2.data).toHaveLength(1);
      expect(body2.meta.hasMore).toBe(false);
      expect(body2.data[0].height).toBe(1);
    });

    it("clamps limit to maximum of 100", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks?limit=500",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      // Only 3 mock blocks exist, so we get 3 regardless
      expect(body.data.length).toBeLessThanOrEqual(100);
    });

    it("uses default limit for invalid limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks?limit=abc",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      // Should use default limit (20), we only have 3 blocks
      expect(body.data).toHaveLength(3);
    });

    it("serializes height as number", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(typeof body.data[0].height).toBe("number");
    });
  });

  describe("GET /blocks/:height", () => {
    it("returns block for valid height", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks/2",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(body.data.height).toBe(2);
      expect(body.data.block_hash).toBe("hash2");
      expect(body.data.network).toBe("testnet");
    });

    it("returns 404 for unknown height", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/blocks/99999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toContain("99999");
    });
  });
});

// ===== Transactions =====

describe("Transactions", () => {
  describe("GET /transactions/:txId", () => {
    it("returns transaction for valid txId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/transactions/at1tx",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(body.data.tx_id).toBe("at1tx");
      expect(body.data.type).toBe("execute");
      expect(body.data.status).toBe("accepted");
      expect(body.data.network).toBe("testnet");
    });

    it("serializes bigint block_height as string", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/transactions/at1tx",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(typeof body.data.block_height).toBe("number");
      expect(body.data.block_height).toBe(12345);
    });

    it("returns 404 for unknown txId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/transactions/at1unknown",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toContain("at1unknown");
    });
  });
});

// ===== Transitions =====

describe("Transitions", () => {
  describe("GET /transitions/:transitionId", () => {
    it("returns transition for valid id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/transitions/au1tr",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(body.data.transition_id).toBe("au1tr");
      expect(body.data.program_id).toBe("credits.aleo");
      expect(body.data.function_name).toBe("transfer_public");
    });

    it("returns 404 for unknown id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/transitions/au1unknown",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toContain("au1unknown");
    });
  });
});

// ===== Programs =====

describe("Programs", () => {
  describe("GET /programs/:programId", () => {
    it("returns program for valid id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/programs/credits.aleo",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(body.data.program_id).toBe("credits.aleo");
      expect(body.data.edition).toBe(0);
      expect(body.data.network).toBe("testnet");
    });

    it("returns 404 for unknown program", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/programs/unknown.aleo",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toContain("unknown.aleo");
    });
  });
});

// ===== Mapping Changes =====

describe("Mapping Changes", () => {
  describe("GET /mapping-changes", () => {
    it("returns paginated mapping change list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/mapping-changes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    });

    it("respects custom limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/mapping-changes?limit=2",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(2);
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.cursor).toBeDefined();
    });

    it("returns hasMore=false when all items fit", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/mapping-changes?limit=100",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(3);
      expect(body.meta.hasMore).toBe(false);
      expect(body.meta.cursor).toBeNull();
    });

    it("paginates using cursor", async () => {
      // First page
      const page1 = await app.inject({
        method: "GET",
        url: "/mapping-changes?limit=2",
      });
      const body1 = JSON.parse(page1.payload);
      expect(body1.data).toHaveLength(2);
      expect(body1.meta.hasMore).toBe(true);

      // Second page
      const page2 = await app.inject({
        method: "GET",
        url: `/mapping-changes?limit=2&cursor=${body1.meta.cursor}`,
      });
      const body2 = JSON.parse(page2.payload);
      expect(body2.data).toHaveLength(1);
      expect(body2.meta.hasMore).toBe(false);
      expect(body2.data[0].id).toBe(1);
    });

    it("serializes id as number", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/mapping-changes?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(typeof body.data[0].id).toBe("number");
    });
  });
});

// ===== Fees =====

describe("Fees", () => {
  describe("GET /fees", () => {
    it("returns paginated fee list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/fees",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    });

    it("respects custom limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/fees?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(1);
      expect(body.meta.hasMore).toBe(true);
      expect(body.meta.cursor).toBeDefined();
    });

    it("returns hasMore=false when all items fit", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/fees?limit=100",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(3);
      expect(body.meta.hasMore).toBe(false);
      expect(body.meta.cursor).toBeNull();
    });

    it("paginates using cursor", async () => {
      // First page
      const page1 = await app.inject({
        method: "GET",
        url: "/fees?limit=2",
      });
      const body1 = JSON.parse(page1.payload);
      expect(body1.data).toHaveLength(2);
      expect(body1.meta.hasMore).toBe(true);

      // Second page
      const page2 = await app.inject({
        method: "GET",
        url: `/fees?limit=2&cursor=${body1.meta.cursor}`,
      });
      const body2 = JSON.parse(page2.payload);
      expect(body2.data).toHaveLength(1);
      expect(body2.meta.hasMore).toBe(false);
      expect(body2.data[0].id).toBe(1);
    });

    it("serializes id and amount as numbers", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/fees?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(typeof body.data[0].id).toBe("number");
      expect(typeof body.data[0].amount).toBe("number");
    });
  });
});

// ===== Chain Metadata =====

describe("Chain Metadata", () => {
  describe("GET /chain-metadata/:network", () => {
    it("returns metadata for valid network", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/chain-metadata/testnet",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(body.data.network).toBe("testnet");
      expect(body.data.latest_height).toBe(12345);
      expect(body.data.latest_hash).toBe("ab17upp");
    });

    it("returns 404 for unknown network", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/chain-metadata/mainnet",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.message).toContain("mainnet");
    });
  });
});

// ===== Error Format =====

describe("Error Format", () => {
  it("returns consistent error format for 404", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/blocks/99999",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(typeof body.error.message).toBe("string");
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("returns consistent error format for unknown transaction", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transactions/nonexistent",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("nonexistent");
  });
});

// ===== ETag =====

describe("ETag", () => {
  it("sets ETag header on JSON responses", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/blocks/2",
    });

    expect(response.statusCode).toBe(200);
    const etag = response.headers["etag"];
    expect(etag).toBeDefined();
    expect(typeof etag).toBe("string");
  });

  it("returns 304 when If-None-Match matches", async () => {
    // First request to get the ETag (using a stable endpoint)
    const first = await app.inject({
      method: "GET",
      url: "/blocks/2",
    });
    const etag = first.headers["etag"] as string;
    expect(etag).toBeDefined();

    // Second request with matching If-None-Match
    const second = await app.inject({
      method: "GET",
      url: "/blocks/2",
      headers: { "if-none-match": etag },
    });

    expect(second.statusCode).toBe(304);
  });

  it("returns full response when If-None-Match does not match", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/blocks/2",
      headers: { "if-none-match": '"stale-etag-value"' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.block_hash).toBe("hash2");
  });
});

// ===== Utility functions =====

describe("Utility functions", () => {
  describe("encodeCursor / decodeCursor", () => {
    it("round-trips bigint values", () => {
      const encoded = encodeCursor(12345n);
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe("12345");
    });

    it("round-trips string values", () => {
      const encoded = encodeCursor("hello-world");
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe("hello-world");
    });

    it("round-trips number values", () => {
      const encoded = encodeCursor(42);
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe("42");
    });

    it("produces opaque (non-readable) cursors", () => {
      const encoded = encodeCursor(12345n);
      // Should not contain the raw value in plain text
      expect(encoded).not.toBe("12345");
    });
  });

  describe("parseLimit", () => {
    it("returns default for undefined", () => {
      expect(parseLimit(undefined)).toBe(20);
    });

    it("returns parsed value for valid input", () => {
      expect(parseLimit("50")).toBe(50);
    });

    it("clamps to max limit", () => {
      expect(parseLimit("500")).toBe(100);
    });

    it("returns default for non-numeric input", () => {
      expect(parseLimit("abc")).toBe(20);
    });

    it("returns default for zero", () => {
      expect(parseLimit("0")).toBe(20);
    });

    it("returns default for negative", () => {
      expect(parseLimit("-5")).toBe(20);
    });

    it("accepts 1 as minimum", () => {
      expect(parseLimit("1")).toBe(1);
    });
  });

  describe("generateETag", () => {
    it("returns a truncated SHA-256 hex string", () => {
      const etag = generateETag('{"status":"ok"}');
      expect(etag).toMatch(/^[0-9a-f]{16}$/);
    });

    it("returns same ETag for same input", () => {
      const etag1 = generateETag('{"a":1}');
      const etag2 = generateETag('{"a":1}');
      expect(etag1).toBe(etag2);
    });

    it("returns different ETag for different input", () => {
      const etag1 = generateETag('{"a":1}');
      const etag2 = generateETag('{"a":2}');
      expect(etag1).not.toBe(etag2);
    });
  });
});
