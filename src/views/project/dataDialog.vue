<template>
  <Modal v-model="visible" :title="dialogTitle">
    <div class="p-6">
      <!-- 表单内容 -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 项目名称 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ $t("project.projectName") }} <span class="text-red-500">{{ $t("project.required") }}</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="$t('project.namePlaceholder')"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- 项目备注 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t("project.projectRemark") }}</label>
          <textarea
            v-model="form.remark"
            rows="4"
            :placeholder="$t('project.remarkPlaceholder')"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          ></textarea>
        </div>

        <!-- 按钮区域 -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {{ $t("project.cancel") }}
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            {{ $t("project.confirm") }}
          </button>
        </div>
      </form>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Modal from "@/components/Modal/index.vue";
import { useI18n } from "vue-i18n";
import ProjectService from "@/services/projectService";
import { Project } from "@/types/chip";
import message from "@/utils/message";

const { t } = useI18n();

// #region 响应式数据
const visible = ref(false);
const form = ref<Project>({
  name: "",
  remark: ""
});
const dialogTitle = ref<string>("");
// #endregion

// #region 事件定义
const emit = defineEmits<{
  getDataList: [];
}>();
// #endregion

// #region 方法
// 打开弹窗
const open = async (id?: number) => {
  if (id) {
    const project = await ProjectService.getProjectById(id);
    console.log(project, id);
    form.value = project;
    dialogTitle.value = t("project.editProject");
  } else {
    dialogTitle.value = t("project.addProject");
  }

  visible.value = true;
};

// 关闭弹窗
const close = () => {
  visible.value = false;
  form.value = {
    name: "",
    remark: ""
  };
};

// 提交表单
const handleSubmit = async () => {
  try {
    if (form.value.id) {
      await ProjectService.updateProject(form.value);
    } else {
      await ProjectService.addProject(form.value);
    }
    message.success(t("common.optionSuccess"));
  } catch (error) {
    console.error("操作失败:", error);
    message.error(t("common.optionError"));
  } finally {
    close();
    emit("getDataList");
  }
};
// #endregion

// #region 暴露方法
defineExpose({
  open,
  visible
});
// #endregion
</script>

<style scoped></style>
