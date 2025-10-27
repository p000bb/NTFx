import { Chip } from "@/types/chip";
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
        Digital: [...(pin.Digital || [])],
        Analog: [...(pin.Analog || [])],
        selectLabel: pin.selectLabel
      }))
    };
  }

  /**
   * 添加芯片
   */
  static async addChip(chip: Chip): Promise<number> {
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
  static async getAllChips(): Promise<Chip[]> {
    try {
      return await db.chips.toArray();
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
   * 根据名称搜索芯片
   */
  static async searchChipsByName(name: string): Promise<Chip[]> {
    try {
      return await db.chips.where("name").startsWithIgnoreCase(name).toArray();
    } catch (error) {
      console.error("搜索芯片失败:", error);
      throw error;
    }
  }

  /**
   * 根据名称获取芯片（精确匹配）
   */
  static async getChipByName(name: string): Promise<Chip | undefined> {
    try {
      return await db.chips.where("name").equals(name).first();
    } catch (error) {
      console.error("根据名称获取芯片失败:", error);
      throw error;
    }
  }

  /**
   * 根据引脚数量搜索芯片
   */
  static async getChipsByPinNumber(pinNumber: number): Promise<Chip[]> {
    try {
      return await db.chips.where("pinNumber").equals(pinNumber).toArray();
    } catch (error) {
      console.error("根据引脚数量搜索芯片失败:", error);
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
   * 批量添加芯片
   */
  static async batchAddChips(chips: Chip[]): Promise<void> {
    try {
      const cleanedChips = chips.map((chip) => this.cleanChipData(chip) as Chip);
      await db.chips.bulkAdd(cleanedChips);
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
