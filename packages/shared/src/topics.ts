import { z } from "zod";
import { NetworkSchema } from "./schemas/canonical.js";

// ─── Topic Entity Types ──────────────────────────────────────────

export const TopicEntitySchema = z.enum([
  "blocks",
  "transactions",
  "transitions",
  "programs",
  "deployments",
  "fees",
  "mapping-changes",
  "chain-metadata",
]);
export type TopicEntity = z.infer<typeof TopicEntitySchema>;

// ─── Topic Variants ──────────────────────────────────────────────

export const TopicVariantSchema = z.enum(["raw", "normalized"]);
export type TopicVariant = z.infer<typeof TopicVariantSchema>;

// ─── Topic Schema Version ────────────────────────────────────────

export const TOPIC_SCHEMA_VERSION = 1 as const;

// ─── Topic Name Generation ───────────────────────────────────────

/**
 * Generate a topic name following the convention:
 * aleo.{entity}.{variant}.v{version}
 *
 * Examples:
 *   aleo.blocks.raw.v1
 *   aleo.transactions.normalized.v1
 *   aleo.transitions.normalized.v1
 */
export function topicName(entity: TopicEntity, variant: TopicVariant): string {
  return `aleo.${entity}.${variant}.v${TOPIC_SCHEMA_VERSION}`;
}

// ─── Topic List ──────────────────────────────────────────────────

export const RAW_TOPICS = {
  blocks: topicName("blocks", "raw"),
  transactions: topicName("transactions", "raw"),
  transitions: topicName("transitions", "raw"),
  programs: topicName("programs", "raw"),
  deployments: topicName("deployments", "raw"),
  fees: topicName("fees", "raw"),
  "mapping-changes": topicName("mapping-changes", "raw"),
  "chain-metadata": topicName("chain-metadata", "raw"),
} as const;

export const NORMALIZED_TOPICS = {
  blocks: topicName("blocks", "normalized"),
  transactions: topicName("transactions", "normalized"),
  transitions: topicName("transitions", "normalized"),
  programs: topicName("programs", "normalized"),
  deployments: topicName("deployments", "normalized"),
  fees: topicName("fees", "normalized"),
  "mapping-changes": topicName("mapping-changes", "normalized"),
  "chain-metadata": topicName("chain-metadata", "normalized"),
} as const;

export const DLQ_TOPIC = "aleo.ingestion.dlq.v1";
