import { describe, it, expect } from "vitest";
import {
  ProvableBlockResponseSchema,
  ProvableTransactionResponseSchema,
  ProvableBlockTransactionsResponseSchema,
} from "./source.js";

const fixture = {
  block_hash: "ab17uppp4gpxysdduzexch5gekkg09lxsdsswmpllxp0028sv2xvczsc2zv99",
  previous_hash: "ab1h8wss9hvagjafrmqpfael2ka8sp9ujhlwm3cxy7dj90xpn2905zsjgfg94",
  header: {
    previous_state_root:
      "sr1fthuyd9qhswzlkd6f9jxsqpjdj6j4nfnzx02z6x4uj9wpefn4qqqatzzpk",
    transactions_root:
      "5921516920880609316862456430090842775173766057023337047347451140512518961075field",
    finalize_root:
      "6782937905510142338894567209948077657217225961237793603538433212746202312880field",
    ratifications_root:
      "4710405186992022735262004958522644990224161834463249249031636047654518734485field",
    solutions_root: "0field",
    subdag_root:
      "2786039085244220585595328072521002856783567900190360046892230183363703801925field",
    metadata: {
      network: 3,
      round: "5925654",
      coinbase_target: "4294967295",
      proof_target: "4294967295",
      last_coinbase_target: "4294967295",
      last_coinbase_ratio: "1000000",
      timestamp: "1717328209",
    },
  },
  transactions: [
    {
      status: "accepted",
      type: "execute",
      index: 0,
      transaction: {
        type: "execute",
        id: "at1qf0rdpte850dp2nfqfwcr6qsz7akhdltfww4vgqe89z0yehquuzs5qy30j",
        execution: {
          transitions: [
            {
              id: "au1dqqmksxh0rajrzc0nup6lmkcswy3jgrus63mqmwehc35edrzeqzswl832d",
              program: "credits.aleo",
              function: "transfer_public",
              inputs: [
                {
                  type: "public",
                  id: "7211782742260852429831915761594330448264617840794998167278548847975343296914field",
                  value: "aleo1q6qstg8q8shwqf5m6q5fcenuwsdqsvp4hhsgfnx5chzjm3secyzqt9mxm8",
                },
                {
                  type: "public",
                  id: "2162174389550796297396988258754313424316882116880733076986338233070249084067field",
                  value: "1u64",
                },
              ],
              outputs: [
                {
                  type: "future",
                  id: "4835128319561491720964520756553059145206970283715594820466295144772470752552field",
                  value: "{ program_id: credits.aleo }",
                },
              ],
              tpk: "7561112813805817986030837166078003059098785717182101238376337363731705904827group",
              tcm: "5238475629103847562910384756291038475629103847562910384756291038475629103847field",
            },
          ],
          global_state_root:
            "sr1fthuyd9qhswzlkd6f9jxsqpjdj6j4nfnzx02z6x4uj9wpefn4qqqatzzpk",
          proof: "proof123",
        },
        fee: {
          transition: {
            id: "au1lcmxhkgq47elf88kwkxt94u3l5upzknk0p9xtkyyscujjpnpngxsrfsxzl",
            program: "credits.aleo",
            function: "fee_public",
            inputs: [
              {
                type: "public",
                id: "4546048683189917942029033675702766209235216738510627738753240165700875185626field",
                value: "263388u64",
              },
              {
                type: "public",
                id: "2748401797868569292728650262539507785140506578130527030669609715302451970416field",
                value: "10000u64",
              },
              {
                type: "public",
                id: "5384012855164869214368951098776005598448688254961958843105407676398657172009field",
                value: "263089435304588716992307850183487012023530526704610137976125946279071975033field",
                },
            ],
            outputs: [
              {
                type: "future",
                id: "81684589200855153586292104771109834059365897093559321752156557570524614145058field",
                value: "{ program_id: credits.aleo }",
              },
            ],
            tpk: "5643706748662558792272673429140074511984763214650541880236032867211807645175group",
            tcm: "6238475629103847562910384756291038475629103847562910384756291038475629103847field",
          },
          global_state_root:
            "sr1fthuyd9qhswzlkd6f9jxsqpjdj6j4nfnzx02z6x4uj9wpefn4qqqatzzpk",
          proof: "feeProof456",
        },
      },
    },
  ],
};

describe("ProvableBlockResponseSchema", () => {
  it("parses a valid block response", () => {
    const result = ProvableBlockResponseSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.block_hash).toBe(fixture.block_hash);
      expect(result.data.header.metadata.network).toBe(3);
      expect(result.data.transactions).toHaveLength(1);
    }
  });

  it("rejects block with missing required fields", () => {
    const invalid = { block_hash: "abc" };
    const result = ProvableBlockResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects block with empty transactions", () => {
    const invalid = { ...fixture, transactions: "not_an_array" };
    const result = ProvableBlockResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("ProvableTransactionResponseSchema", () => {
  it("parses a valid transaction response", () => {
    const result = ProvableTransactionResponseSchema.safeParse({
      type: "execute",
      id: "at1qf0rdpte850dp2nfqfwcr6qsz7akhdltfww4vgqe89z0yehquuzs5qy30j",
      execution: {
        transitions: [],
        global_state_root: "sr1abc",
        proof: "proof123",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("execute");
    }
  });

  it("rejects transaction with missing id", () => {
    const result = ProvableTransactionResponseSchema.safeParse({
      type: "execute",
    });
    expect(result.success).toBe(false);
  });
});

describe("ProvableBlockTransactionsResponseSchema", () => {
  it("parses a valid block transactions response", () => {
    const result = ProvableBlockTransactionsResponseSchema.safeParse({
      transactions: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactions).toHaveLength(0);
    }
  });

  it("rejects non-array transactions", () => {
    const result = ProvableBlockTransactionsResponseSchema.safeParse({
      transactions: "not_an_array",
    });
    expect(result.success).toBe(false);
  });
});
