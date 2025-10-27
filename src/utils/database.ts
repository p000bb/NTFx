import Dexie, { Table } from "dexie";

import type { Chip } from "@/types/chip";

// 定义数据库接口
export interface Database extends Dexie {
  chips: Table<Chip>;
}

// 创建数据库实例
export const db = new Dexie("NTFxDatabase") as Database;

// 定义数据库版本和表结构
db.version(1).stores({
  // 芯片数据表
  chips: "++id, name"
});

// 导出数据库实例
export default db;
