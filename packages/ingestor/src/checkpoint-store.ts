import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { CheckpointSchema, type Checkpoint } from "@aleo-foundry/shared";

export class CheckpointStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<Checkpoint | null> {
    try {
      const data = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(data);
      return CheckpointSchema.parse(parsed);
    } catch {
      return null;
    }
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const data = JSON.stringify(checkpoint, null, 2);
    await writeFile(this.filePath, data, "utf-8");
  }
}
