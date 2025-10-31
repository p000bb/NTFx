import { Chip, ChipDB } from "@/types/chip";

import { db } from "@/utils/database";

export class ChipService {
  /**
   * 清理数据，确保可以被 IndexedDB 序列化
   */
  private static cleanChipData(chip: Partial<Chip>): Partial<Chip> {
    return {
      ...chip,
      pins: chip.pins?.map((pin) => ({
        Name: pin.Name,
        Type: pin.Type,
        Io: pin.Io,
        Fail: pin.Fail,
        Digital: [...(pin.Digital || [])],
        Analog: [...(pin.Analog || [])],
        selectLabel: pin.selectLabel,
        sortValue: pin.sortValue
      }))
    };
  }

  /**
   * 添加芯片
   */
  static async addChip(chip: ChipDB): Promise<number> {
    try {
      const id = await db.chips.add(chip);
      console.log("芯片添加成功:", id);
      return id;
    } catch (error) {
      console.error("添加芯片失败:", error);
      throw error;
    }
  }

  /**
   * 获取所有芯片
   */
  static async getAllChips(projectId: number): Promise<Chip[]> {
    try {
      return await db.chips.where("projectId").equals(projectId).toArray();
    } catch (error) {
      console.error("获取芯片列表失败:", error);
      throw error;
    }
  }

  /**
   * 根据ID获取芯片
   */
  static async getChipById(id: number): Promise<Chip | undefined> {
    try {
      return await db.chips.get(id);
    } catch (error) {
      console.error("获取芯片失败:", error);
      throw error;
    }
  }

  /**
   * 更新芯片
   */
  static async updateChip(id: number, updates: Partial<Chip>): Promise<void> {
    try {
      const cleanedUpdates = this.cleanChipData(updates);
      await db.chips.update(id, cleanedUpdates);
    } catch (error) {
      console.error("更新芯片失败:", error);
      throw error;
    }
  }

  /**
   * 批量更新芯片
   * 逻辑：
   * 1. 根据 projectId 获取该项目下的所有芯片
   * 2. 比对数据库中的 chips 和传入的 chips（比对 id）
   * 3. 如果数据库中存在的芯片在传入数组中不存在，删除该芯片
   * 4. 传入数组中存在的芯片进行更新（不考虑新增）
   */
  static async batchUpdateChips(chips: Chip[], projectId: number): Promise<void> {
    try {
      // 获取该项目下的所有芯片
      const existingChips = await db.chips.where("projectId").equals(projectId).toArray();
      const existingChipIds = new Set<number>(existingChips.map((chip) => chip.id));

      // 获取传入芯片的 id 集合（只取有 id 的）
      const incomingChipIds = new Set<number>(chips.filter((chip) => chip.id).map((chip) => chip.id! as number));

      // 找出需要删除的芯片（在数据库中存在但在传入数组中不存在）
      const chipsToDelete = Array.from(existingChipIds).filter((id) => !incomingChipIds.has(id));

      // 删除不存在的芯片
      if (chipsToDelete.length > 0) {
        await db.chips.bulkDelete(chipsToDelete);
        console.log(`删除了 ${chipsToDelete.length} 个芯片`);
      }

      // 更新传入数组中存在的芯片（不会存在新增，因为都已经有 id）
      if (chips.length > 0) {
        // 清洗数据、确保都有 id 和 projectId
        const toUpdate = chips
          .filter((chip) => chip.id)
          .map((chip) => {
            const cleaned = this.cleanChipData(chip) as ChipDB;
            // 确保 projectId 存在
            cleaned.projectId = projectId;
            return cleaned;
          });

        // bulkPut 会自动根据 id 更新
        await db.chips.bulkPut(toUpdate);
        console.log(`更新了 ${toUpdate.length} 个芯片`);
      }
    } catch (error) {
      console.error("批量更新芯片失败:", error);
      throw error;
    }
  }

  /**
   * 删除芯片
   */
  static async deleteChip(id: number): Promise<void> {
    try {
      await db.chips.delete(id);
    } catch (error) {
      console.error("删除芯片失败:", error);
      throw error;
    }
  }

  /**
   * 根据项目ID删除芯片
   */
  static async deleteChipsByProjectId(projectId: number): Promise<void> {
    try {
      await db.chips.where("projectId").equals(projectId).delete();
    } catch (error) {
      console.error("删除芯片失败:", error);
      throw error;
    }
  }
  /**
   * 批量添加芯片
   */
  static async batchAddChips(chips: Chip[], projectId: number): Promise<void> {
    try {
      const cleanedChips = chips.map((chip) => this.cleanChipData(chip) as ChipDB);
      await db.chips.bulkAdd(
        cleanedChips.map((chip) => ({
          ...chip,
          projectId
        }))
      );
    } catch (error) {
      console.error("批量添加芯片失败:", error);
      throw error;
    }
  }

  /**
   * 批量删除芯片
   */
  static async batchDeleteChips(ids: number[]): Promise<void> {
    try {
      await db.chips.bulkDelete(ids);
    } catch (error) {
      console.error("批量删除芯片失败:", error);
      throw error;
    }
  }

  /**
   * 清空所有芯片数据
   */
  static async clearAllChips(): Promise<void> {
    try {
      await db.chips.clear();
    } catch (error) {
      console.error("清空芯片数据失败:", error);
      throw error;
    }
  }
}

export default ChipService;
