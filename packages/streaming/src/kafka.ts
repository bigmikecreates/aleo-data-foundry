import { Kafka } from "kafkajs";

export interface KafkaClientOptions {
  brokers: string[];
  clientId: string;
}

export interface ProducerMessage {
  key?: string;
  value: string;
}

export interface ProducerLike {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(topic: string, messages: ProducerMessage[]): Promise<void>;
}

export interface ConsumedMessage {
  topic: string;
  partition: number;
  offset: string;
  value: string | Buffer | null;
}

export type ConsumerMessageHandler = (message: ConsumedMessage) => Promise<void>;

export interface ConsumerLike {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topics: string[]): Promise<void>;
  run(handler: ConsumerMessageHandler): Promise<void>;
  commitOffsets(topic: string, partition: number, offset: string): Promise<void>;
}

export function createKafkaClient(options: KafkaClientOptions): Kafka {
  return new Kafka({
    clientId: options.clientId,
    brokers: options.brokers,
  });
}

export function createKafkaProducer(kafka: Kafka): ProducerLike {
  const producer = kafka.producer({
    retry: { retries: 5 },
    allowAutoTopicCreation: true,
  });

  return {
    async connect() {
      await producer.connect();
    },
    async disconnect() {
      await producer.disconnect();
    },
    async send(topic: string, messages: ProducerMessage[]) {
      const result = await producer.send({ topic, messages });
      if (!result || result.length === 0) {
        throw new Error(`Kafka producer.send returned no topic results for ${topic}`);
      }
    },
  };
}

export function createKafkaConsumer(
  kafka: Kafka,
  options: { groupId: string },
): ConsumerLike {
  const consumer = kafka.consumer({ groupId: options.groupId });

  return {
    async connect() {
      await consumer.connect();
    },
    async disconnect() {
      await consumer.disconnect();
    },
    async subscribe(topics: string[]) {
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: true });
      }
    },
    async run(handler: ConsumerMessageHandler) {
      await consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          await handler({
            topic,
            partition,
            offset: message.offset,
            value: message.value,
          });
        },
      });
    },
    async commitOffsets(topic: string, partition: number, offset: string) {
      const nextOffset = String(Number(offset) + 1);
      await consumer.commitOffsets([{ topic, partition, offset: nextOffset }]);
    },
  };
}