import type { Network, ProvableFinalizeAction } from "@aleo-foundry/shared";
import {
  normalizeBlock,
  normalizeTransaction,
  normalizeTransition,
  normalizeFee,
  normalizeDeployment,
  normalizeMappingChange,
} from "@aleo-foundry/normalizer";
import type { EventPublisher } from "@aleo-foundry/streaming";
import type { BlockData } from "./poller.js";

export type BlockPublisherCallback = (data: BlockData) => Promise<void>;

/**
 * Build a BlockCallback that publishes raw + normalized events for every
 * entity in a block, in dependency order. Shared by the live Poller and the
 * backfill CLI so both emit identical event streams.
 */
export function createBlockPublisher(
  publisher: EventPublisher,
  network: Network,
): BlockPublisherCallback {
  return async (data) => {
    const { height, block } = data;
    const blockHash = block.block_hash;
    const blockKey = `${height}:${blockHash}`;

    await publisher.publish({
      entity: "blocks",
      variant: "raw",
      naturalKey: blockKey,
      payload: block,
    });

    const blockResult = normalizeBlock(network, height, block);
    await publisher.publish({
      entity: "blocks",
      variant: "normalized",
      naturalKey: blockKey,
      payload: blockResult.serving,
    });

    const blockTxs = block.transactions;
    for (const blockTx of blockTxs) {
      const body = blockTx.transaction;
      const txId = body.id;

      await publisher.publish({
        entity: "transactions",
        variant: "raw",
        naturalKey: txId,
        payload: blockTx,
      });

      const txResult = normalizeTransaction(network, height, blockHash, blockTx);
      await publisher.publish({
        entity: "transactions",
        variant: "normalized",
        naturalKey: txId,
        payload: txResult.serving,
      });

      if (body.execution) {
        for (const transition of body.execution.transitions) {
          await publisher.publish({
            entity: "transitions",
            variant: "raw",
            naturalKey: transition.id,
            payload: transition,
          });

          const transResult = normalizeTransition(network, txId, transition);
          await publisher.publish({
            entity: "transitions",
            variant: "normalized",
            naturalKey: transition.id,
            payload: transResult.serving,
          });
        }
      }

      if (body.type === "deploy" && body.deploy !== undefined) {
        const deployResult = normalizeDeployment(
          network,
          txId,
          blockResult.serving.timestamp,
          body,
        );
        if (deployResult) {
          const programId = deployResult.serving.program_id;
          await publisher.publish({
            entity: "deployments",
            variant: "raw",
            naturalKey: txId,
            payload: { tx_id: txId, deployment: body.deploy },
          });
          await publisher.publish({
            entity: "programs",
            variant: "raw",
            naturalKey: programId,
            payload: body.deploy,
          });
          await publisher.publish({
            entity: "deployments",
            variant: "normalized",
            naturalKey: `${txId}:${programId}`,
            payload: deployResult.serving,
          });
          await publisher.publish({
            entity: "programs",
            variant: "normalized",
            naturalKey: programId,
            payload: deployResult.serving,
          });
        }
      }

      if (body.fee) {
        await publisher.publish({
          entity: "fees",
          variant: "raw",
          naturalKey: `${txId}:${body.fee.transition.id}`,
          payload: body.fee,
        });

        const feeResult = normalizeFee(network, txId, body.fee);
        await publisher.publish({
          entity: "fees",
          variant: "normalized",
          naturalKey: `${txId}:${feeResult.serving.transition_id}`,
          payload: feeResult.serving,
        });
      }
    }

    const txResponses = data.transactions;
    for (const tx of txResponses) {
      if (tx.finalize && tx.finalize.length > 0) {
        const txId = tx.id;
        for (const action of tx.finalize as ProvableFinalizeAction[]) {
          const programId = action.mapping_id?.split("/")[0] ?? "";
          const transitionId = `${txId}:${action.index}`;
          const naturalKey = `${txId}:${action.index}`;

          await publisher.publish({
            entity: "mapping-changes",
            variant: "raw",
            naturalKey,
            payload: { tx_id: txId, transition_id: transitionId, action },
          });

          const changeResult = normalizeMappingChange(
            network,
            txId,
            transitionId,
            programId,
            action,
          );
          await publisher.publish({
            entity: "mapping-changes",
            variant: "normalized",
            naturalKey,
            payload: changeResult.serving,
          });
        }
      }
    }

    const now = new Date().toISOString();
    await publisher.publish({
      entity: "chain-metadata",
      variant: "raw",
      naturalKey: network,
      payload: {
        network,
        latest_height: height,
        latest_hash: blockHash,
      },
    });
    await publisher.publish({
      entity: "chain-metadata",
      variant: "normalized",
      naturalKey: network,
      payload: {
        network,
        latest_height: height,
        latest_hash: blockHash,
        updated_at: now,
      },
    });
  };
}