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
            rows="2"
            :placeholder="$t('project.remarkPlaceholder')"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          ></textarea>
        </div>

        <!-- 数据源 -->
        <!-- #region 数据源（模板下载 + Excel 上传 + 解析结果列表） -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">数据源</label>
          <div class="flex items-center gap-3 mb-3">
            <button
              type="button"
              @click="downloadTemplate"
              class="w-36 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg border border-blue-700 transition-colors text-sm inline-flex items-center justify-center"
            >
              <FileDown class="w-4 h-4 mr-2" />
              {{ $t("project.downloadTemplate") }}
            </button>

            <FileSelect type="button" @fileParsed="fileParsed" @error="error" />
          </div>

          <!-- 解析后的芯片列表 -->
          <div v-if="chipList.length" class="space-y-1.5 max-h-[250px] overflow-y-auto">
            <div
              v-for="(chip, index) in chipList"
              :key="chip.id || index"
              class="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md"
            >
              <input
                v-model="chip.name"
                type="text"
                class="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                :placeholder="$t('common.placeholder')"
              />
              <span class="text-xs text-gray-600 whitespace-nowrap"
                >{{ $t("project.pinNumber") }}:{{ chip.pinNumber ?? 0 }}</span
              >
              <button
                type="button"
                class="p-1.5 text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                @click="confirmRemove({ ...chip, index })"
                :aria-label="$t('project.delete')"
                :title="$t('project.delete')"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <!-- #endregion -->

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
import { Project, Chip } from "@/types/chip";
import message from "@/utils/message";
import FileSelect from "@/components/FileSelect/index.vue";
import ChipService from "@/services/chipService";
import { confirm } from "@/utils/confirm";
import { FileDown, Trash2 } from "lucide-vue-next";
import { formatChipData } from "@/utils";

const { t } = useI18n();

// #region 响应式数据
const visible = ref(false);
const form = ref<Project>({
  name: "",
  remark: ""
});
const dialogTitle = ref<string>("");
// #endregion

// #region 数据源-本地状态
const chipList = ref<Chip[]>([]);
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
    form.value = project;
    dialogTitle.value = t("project.editProject");

    try {
      const chips = await ChipService.getAllChips(id);
      chipList.value = chips || [];
    } catch (e) {
      chipList.value = [];
    }
  } else {
    dialogTitle.value = t("project.addProject");
    chipList.value = [];
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
  let projectId: number;
  try {
    if (form.value.id) {
      await ProjectService.updateProject(form.value);
      projectId = form.value.id;
    } else {
      projectId = Number(await ProjectService.addProject(form.value));
    }

    const oldList = chipList.value.filter((item) => item.id);
    const newList = chipList.value.filter((item) => !item.id);

    if (oldList.length) {
      await ChipService.batchUpdateChips(oldList);
    }
    if (newList.length) {
      await ChipService.batchAddChips(newList, Number(projectId));
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

// #region 数据源-交互与占位方法
const downloadTemplate = () => {
  const link = document.createElement("a");
  link.href = "/template.xlsx"; // 放置于 public/template.xlsx
  link.download = "template.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const fileParsed = (data: any[]) => {
  try {
    // 1. 格式化数据
    const formattedChips = formatChipData(data) || [];
    chipList.value = chipList.value.concat(formattedChips);
    console.log(chipList.value);
  } catch (error) {
    console.error("文件解析或保存失败:", error);
    message.error("文件解析或保存失败，请重试");
  }
};

const error = (_message: string) => {
  message.error(_message);
};

// 本地操作：删除列表项
const confirmRemove = async (chip: Chip & { index: number }) => {
  try {
    await confirm({
      title: t("common.tip"),
      content: t("project.confirmDelete"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel")
    });

    if (chip?.id) {
      await ChipService.deleteChip(chip.id);
    } else {
      chipList.value.splice(chip.index, 1);
    }
  } catch {}
};
// #endregion

// #region 芯片名修改watch自动保存
// #endregion

// #region 暴露方法
defineExpose({
  open,
  visible
});
// #endregion
</script>

<style scoped></style>
