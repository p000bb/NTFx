import type { ChipDB, ProjectDB } from "@/types/chip";
import Dexie, { Table } from "dexie";

// 定义数据库接口
export interface Database extends Dexie {
  chips: Table<ChipDB>;
  projects: Table<ProjectDB>;
}

// 创建数据库实例
export const db = new Dexie("NTFxDatabase") as Database;

// 定义数据库版本和表结构
db.version(1).stores({
  // 芯片数据表
  chips: "++id, projectId",
  // 项目数据表
  projects: "++id, name"
});

// 导出数据库实例
export default db;
