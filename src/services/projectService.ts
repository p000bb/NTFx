import { Project, ProjectDB } from "@/types/chip";

import dayjs from "dayjs";
import { db } from "@/utils/database";

export class ProjectService {
  /**
   * 清理项目数据，确保可以被 IndexedDB 序列化
   */
  private static cleanProjectData(project: Partial<ProjectDB>): Partial<ProjectDB> {
    return {
      ...project,
      name: project.name || "",
      remark: project.remark || ""
    };
  }

  /**
   * 添加项目
   */
  static async addProject(project: Project): Promise<string> {
    try {
      const now = dayjs().toISOString();
      const newProject = {
        name: project.name,
        remark: project.remark,
        createTime: now,
        updateTime: now
      };

      // @ts-ignore
      const id = await db.projects.add(newProject);
      console.log("项目添加成功:", id);
      return id;
    } catch (error) {
      console.error("添加项目失败:", error);
      throw error;
    }
  }

  /**
   * 获取所有项目
   */
  static async getAllProjects(): Promise<any[]> {
    try {
      const projects = await db.projects.toArray();
      // 转换数据格式以兼容页面使用
      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        remark: p.remark,
        createTime: dayjs(p.createTime).valueOf(),
        updateTime: dayjs(p.updateTime).valueOf()
      }));
    } catch (error) {
      console.error("获取项目列表失败:", error);
      throw error;
    }
  }

  /**
   * 根据ID获取项目
   */
  static async getProjectById(id: number): Promise<any | undefined> {
    try {
      const project = await db.projects.get(id);
      if (!project) return undefined;

      return {
        id: project.id,
        name: project.name,
        remark: project.remark,
        createTime: dayjs(project.createTime).valueOf(),
        updateTime: dayjs(project.updateTime).valueOf()
      };
    } catch (error) {
      console.error("获取项目失败:", error);
      throw error;
    }
  }

  /**
   * 根据名称搜索项目
   */
  static async searchProjectsByName(name: string): Promise<any[]> {
    try {
      const projects = await db.projects.filter((p) => p.name.toLowerCase().includes(name.toLowerCase())).toArray();

      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        remark: p.remark,
        createTime: dayjs(p.createTime).valueOf(),
        updateTime: dayjs(p.updateTime).valueOf()
      }));
    } catch (error) {
      console.error("搜索项目失败:", error);
      throw error;
    }
  }

  /**
   * 根据名称获取项目（精确匹配）
   */
  static async getProjectByName(name: string): Promise<any | undefined> {
    try {
      const project = await db.projects.where("name").equals(name).first();
      if (!project) return undefined;

      return {
        id: project.id,
        name: project.name,
        remark: project.remark,
        createTime: dayjs(project.createTime).valueOf(),
        updateTime: dayjs(project.updateTime).valueOf()
      };
    } catch (error) {
      console.error("根据名称获取项目失败:", error);
      throw error;
    }
  }

  /**
   * 更新项目
   */
  static async updateProject(updates: Project): Promise<void> {
    try {
      const cleanedUpdates = this.cleanProjectData(updates);
      cleanedUpdates.updateTime = dayjs().toISOString();
      await db.projects.update(Number(updates.id), cleanedUpdates);
    } catch (error) {
      console.error("更新项目失败:", error);
      throw error;
    }
  }

  /**
   * 删除项目
   */
  static async deleteProject(id: number): Promise<void> {
    try {
      await db.projects.delete(id);
    } catch (error) {
      console.error("删除项目失败:", error);
      throw error;
    }
  }

  /**
   * 批量添加项目
   */
  static async batchAddProjects(projects: { name: string; remark: string }[]): Promise<void> {
    try {
      const now = dayjs().toISOString();
      const cleanedProjects = projects.map((project) => ({
        ...this.cleanProjectData(project),
        createTime: now,
        updateTime: now
      })) as ProjectDB[];

      await db.projects.bulkAdd(cleanedProjects);
    } catch (error) {
      console.error("批量添加项目失败:", error);
      throw error;
    }
  }

  /**
   * 批量删除项目
   */
  static async batchDeleteProjects(ids: number[]): Promise<void> {
    try {
      await db.projects.bulkDelete(ids);
    } catch (error) {
      console.error("批量删除项目失败:", error);
      throw error;
    }
  }

  /**
   * 清空所有项目数据
   */
  static async clearAllProjects(): Promise<void> {
    try {
      await db.projects.clear();
    } catch (error) {
      console.error("清空项目数据失败:", error);
      throw error;
    }
  }

  /**
   * 获取项目数量
   */
  static async getProjectCount(): Promise<number> {
    try {
      return await db.projects.count();
    } catch (error) {
      console.error("获取项目数量失败:", error);
      throw error;
    }
  }
}

export default ProjectService;
