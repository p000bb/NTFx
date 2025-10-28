<template>
  <div class="relative w-full min-h-screen bg-gray-50 p-6">
    <!-- 头部区域 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ $t("project.title") }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ $t("project.subtitle") }}</p>
    </div>

    <!-- 工具栏 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            v-model="searchKeyword"
            type="text"
            :placeholder="$t('project.searchPlaceholder')"
            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <span class="text-sm text-gray-500">{{ filteredProjects.length }}{{ $t("project.projects") }}</span>
      </div>
      <button
        @click="handleAdd"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus :size="18" />
        {{ $t("project.addProject") }}
      </button>
    </div>

    <!-- 项目列表 -->
    <TransitionGroup
      name="list"
      tag="div"
      v-if="filteredProjects.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="bg-white rounded-lg shadow-sm hover:shadow-xl border border-gray-200 p-5 ease-in-out hover:-translate-y-1 transition-all duration-300 hover:cursor-pointer"
        @click="preview(project?.id)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-800 mb-1">{{ project.name }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click.stop="handleEdit(project?.id)"
              class="p-1 hover:bg-blue-50 rounded transition-colors text-blue-400 hover:text-blue-500"
              :title="$t('project.edit')"
            >
              <Edit :size="16" />
            </button>
            <button
              @click.stop="handleDelete(project)"
              class="p-1 hover:bg-red-50 rounded transition-colors text-red-500 hover:text-red-600"
              :title="$t('project.delete')"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <p v-if="project.remark" class="text-sm text-gray-600 line-clamp-2 mb-3">{{ project.remark }}</p>
        <p v-else class="text-sm text-gray-400 italic mb-3">{{ $t("project.noRemark") }}</p>

        <div class="flex items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span>{{ $t("project.updatedAt") }}{{ formatDate(project.updateTime) }}</span>
        </div>
      </div>
    </TransitionGroup>

    <!-- 空状态 -->
    <div
      v-else
      class="absolute top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-center pointer-events-none"
    >
      <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <FolderOpen :size="48" class="text-blue-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">{{ $t("project.noProjects") }}</h3>
      <p class="text-sm text-gray-500 mb-6">{{ $t("project.noProjectsDesc") }}</p>
    </div>

    <!-- 数据弹窗 -->
    <DataDialog ref="dataDialogRef" @getDataList="getDataList" />
  </div>
</template>

<script setup lang="ts">
// #region 导入
import { ref, computed, onMounted, watch } from "vue";
import { Plus, Search, Trash2, FolderOpen, Edit } from "lucide-vue-next";
import { confirm } from "@/utils/confirm";
import DataDialog from "./dataDialog.vue";
import { useI18n } from "vue-i18n";
import ProjectService from "@/services/projectService";
import message from "@/utils/message";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import "dayjs/locale/en";
import { ProjectDB } from "@/types/chip";
import { useRouter } from "vue-router";

// dayjs 配置
dayjs.extend(relativeTime);
// #endregion

// #region I18n
const { t, locale } = useI18n();

// 设置 dayjs 语言
watch(
  locale,
  (newLocale) => {
    dayjs.locale(newLocale === "zh-CN" ? "zh-cn" : "en");
  },
  { immediate: true }
);
// #endregion

// #region 响应式数据
const searchKeyword = ref("");
const dataDialogRef = ref<InstanceType<typeof DataDialog> | null>(null);
const projects = ref<ProjectDB[]>([]);
const loading = ref(false);
// #endregion

// #region 数据获取
const getDataList = async () => {
  loading.value = true;
  try {
    const data = await ProjectService.getAllProjects();
    projects.value = data;
  } catch (error) {
    console.error("加载项目失败:", error);
    message.error("加载项目失败");
  } finally {
    loading.value = false;
  }
};
// #endregion

// #region 计算属性
const filteredProjects = computed(() => {
  if (!searchKeyword.value) {
    return projects.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return projects.value.filter(
    (project) => project.name.toLowerCase().includes(keyword) || project.remark.toLowerCase().includes(keyword)
  );
});
// #endregion

// #region 方法
// 新增项目
const handleAdd = () => {
  dataDialogRef.value?.open();
};

// 编辑项目
const handleEdit = (id: number | undefined) => {
  id && dataDialogRef.value?.open(id);
};

// 删除项目
const handleDelete = async (project: ProjectDB) => {
  try {
    const content = `${t("project.deleteContent")}<br><br>${t("project.projectNameLabel")}: <span style="font-weight: bold; color: #dc2626;">${project.name}</span>`;
    await confirm({
      title: t("project.confirmDelete"),
      content: content,
      okText: t("project.deleteText"),
      cancelText: t("project.cancel")
    });

    await ProjectService.deleteProject(project.id);
    message.success(t("project.deleteSuccess") || "删除成功");
    // 重新加载数据
    await getDataList();
  } catch {
    // 用户取消操作
  }
};

// 格式化日期
const formatDate = (timestamp: string): string => {
  return dayjs(timestamp).fromNow();
};
// #endregion

// #region 路由
const router = useRouter();
const preview = (id: number | undefined) => {
  if (id) {
    const routeData = router.resolve(`/preview/${id}`);
    window.open(routeData.href, "_blank");
  }
};
// #endregion

// #region 生命周期
onMounted(() => {
  getDataList();
});
// #endregion
</script>

<style scoped></style>
