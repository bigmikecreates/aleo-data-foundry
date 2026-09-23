import type { FastifyInstance } from "fastify";
import type {
  BlockRepository,
  ChainMetadataRepository,
} from "@aleo-foundry/db";
import { ValidationError } from "./errors.js";
import { serializePayload } from "./server.js";

export interface BlockStreamOptions {
  network: "testnet" | "mainnet";
  chainMetadataRepository: ChainMetadataRepository;
  blockRepository: BlockRepository;
  intervalMs: number;
  initialCursor?: number;
  write: (chunk: string) => void;
}

export function encodeBlockEvent(block: unknown, height: number): string {
  return `id: ${height}\nevent: block\ndata: ${JSON.stringify(
    serializePayload(block),
  )}\n\n`;
}

export function createBlockStream(opts: BlockStreamOptions): () => void {
  let cursor = opts.initialCursor;
  let running = true;
  let busy = false;

  const tick = async (): Promise<void> => {
    if (!running || busy) return;
    busy = true;
    try {
      const meta = await opts.chainMetadataRepository.findByNetwork(
        opts.network,
      );
      const latest = meta?.latest_height;
      if (latest === undefined || latest === null) return;

      if (cursor === undefined) {
        cursor = latest;
        const block = await opts.blockRepository.findByHeight(latest);
        if (block) opts.write(encodeBlockEvent(block, latest));
        return;
      }

      for (let h = cursor + 1; h <= latest; h++) {
        const block = await opts.blockRepository.findByHeight(h);
        if (!block) continue;
        opts.write(encodeBlockEvent(block, h));
        cursor = h;
      }
    } finally {
      busy = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, opts.intervalMs);
  void tick();

  return () => {
    running = false;
    clearInterval(timer);
  };
}

export interface StreamRoutesDeps {
  blockRepository: BlockRepository;
  chainMetadataRepository: ChainMetadataRepository;
  intervalMs?: number;
}

export function streamRoutes(deps: StreamRoutesDeps) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/stream/blocks", async (request, reply) => {
      const { network } = request.query as { network?: string };
      if (
        network !== undefined &&
        network !== "testnet" &&
        network !== "mainnet"
      ) {
        throw new ValidationError("network must be 'testnet' or 'mainnet'");
      }
      const resolvedNetwork = network ?? "testnet";

      const raw = reply.raw;
      raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      raw.write("retry: 3000\n\n");

      reply.hijack();

      const lastEventId = request.headers["last-event-id"];
      const initialCursor =
        typeof lastEventId === "string" && lastEventId.length > 0
          ? Number(lastEventId)
          : undefined;

      const write = (chunk: string): void => {
        if (!raw.destroyed) raw.write(chunk);
      };

      const stop = createBlockStream({
        network: resolvedNetwork,
        chainMetadataRepository: deps.chainMetadataRepository,
        blockRepository: deps.blockRepository,
        intervalMs: deps.intervalMs ?? 1000,
        initialCursor,
        write,
      });

      request.raw.on("close", stop);
    });
  };
}