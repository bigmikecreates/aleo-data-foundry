import { z, ZodError } from "zod";
import {
  TOPIC_SCHEMA_VERSION,
  TopicEntitySchema,
  TopicVariantSchema,
  NetworkSchema,
  BlockRowSchema,
  TransactionRowSchema,
  TransitionRowSchema,
  ProgramRowSchema,
  FeeRowSchema,
  MappingChangeRowSchema,
  ChainMetadataRowSchema,
} from "@aleo-foundry/shared";
import type {
  TopicEntity,
  TopicVariant,
  Network,
  BlockRow,
  TransactionRow,
  TransitionRow,
  ProgramRow,
  FeeRow,
  MappingChangeRow,
  ChainMetadataRow,
} from "@aleo-foundry/shared";
import { errorMessage } from "./retry.js";

export const EventEnvelopeSchema = z.object({
  schema_version: z.literal(TOPIC_SCHEMA_VERSION),
  entity: TopicEntitySchema,
  variant: TopicVariantSchema,
  network: NetworkSchema,
  message_id: z.string().min(1),
  event_timestamp: z.string().datetime(),
  payload: z.unknown(),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export type NormalizedEntityPayload =
  | BlockRow
  | TransactionRow
  | TransitionRow
  | ProgramRow
  | FeeRow
  | MappingChangeRow
  | ChainMetadataRow;

export class EnvelopeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvelopeParseError";
  }
}

const NORMALIZED_SCHEMAS: Record<TopicEntity, z.ZodTypeAny> = {
  blocks: BlockRowSchema,
  transactions: TransactionRowSchema,
  transitions: TransitionRowSchema,
  programs: ProgramRowSchema,
  deployments: ProgramRowSchema,
  fees: FeeRowSchema,
  "mapping-changes": MappingChangeRowSchema,
  "chain-metadata": ChainMetadataRowSchema,
};

export function createEnvelope(
  entity: TopicEntity,
  variant: TopicVariant,
  network: Network,
  message_id: string,
  payload: unknown,
  event_timestamp = new Date().toISOString(),
): EventEnvelope {
  return {
    schema_version: TOPIC_SCHEMA_VERSION,
    entity,
    variant,
    network,
    message_id,
    event_timestamp,
    payload,
  };
}

export function encodeEnvelope(envelope: EventEnvelope): string {
  return JSON.stringify(envelope);
}

export function parseEnvelope(value: string | Buffer | null): EventEnvelope {
  if (value === null) throw new EnvelopeParseError("Empty message");

  const text = typeof value === "string" ? value : value.toString("utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new EnvelopeParseError(`Invalid JSON: ${errorMessage(error)}`);
  }

  const parsed = EventEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EnvelopeParseError(parsed.error.message);
  }
  return parsed.data;
}

export function parseNormalizedPayload(
  entity: TopicEntity,
  payload: unknown,
): NormalizedEntityPayload {
  const schema = NORMALIZED_SCHEMAS[entity];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ZodError(parsed.error.issues);
  }
  return parsed.data as NormalizedEntityPayload;
}