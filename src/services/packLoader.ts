// src/services/packLoader.ts
import { Pack } from "@/entities";
import { logger } from "@/shared/utils/logger";

class PackLoaderService {
  private packs: Map<string, Pack> = new Map();
  private availablePackIds = [
    "real-voca-basic",
    // "real-voca-advanced",
    // "english-sentences-1",
  ];

  async loadPack(packId: string): Promise<Pack> {
    if (this.packs.has(packId)) {
      return this.packs.get(packId)!;
    }

    try {
      // 🔥 public 폴더 경로로 변경
      const response = await fetch(`/data/packs/${packId}.json`);
      logger.log("response: ", response);

      if (!response.ok) {
        throw new Error(`Pack ${packId} not found (${response.status})`);
      }

      const pack: Pack = await response.json();
      this.validatePack(pack);
      this.packs.set(packId, pack);

      logger.log(`✅ Pack loaded: ${pack.title} (${pack.totalItems} items)`);
      return pack;
    } catch (error) {
      logger.error(`Failed to load pack ${packId}:`, error);
      throw error;
    }
  }

  async loadAllPacks(): Promise<Pack[]> {
    const packs: Pack[] = [];

    for (const packId of this.availablePackIds) {
      try {
        const pack = await this.loadPack(packId);
        packs.push(pack);
      } catch (error) {
        logger.warn(`Failed to load pack ${packId}:`, error);
      }
    }

    return packs;
  }

  private validatePack(pack: Pack): void {
    if (!pack.id || !pack.title || !pack.items || pack.items.length === 0) {
      throw new Error("Invalid pack format");
    }

    // 아이템 검증
    for (const item of pack.items) {
      if (!item.id || !item.word || !item.definition) {
        throw new Error(`Invalid item in pack ${pack.id}: ${item.id}`);
      }
    }
  }

  getAvailablePackIds(): string[] {
    return [...this.availablePackIds];
  }
}

export const packLoader = new PackLoaderService();
