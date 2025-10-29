<template>
  <div class="w-48">
    <FileSelect @fileParsed="fileParsed" @fileSelected="fileSelected" @error="error" />
  </div>
</template>

<script lang="ts" setup name="Config">
import FileSelect from "@/components/FileSelect/index.vue";

const fileParsed = (data: any[]) => {
  const filteredData = data;
  // 处理数据
  if (filteredData.length === 0) return;

  // 2. 从第一项中获取到所有package_开头的keys
  const prefixKeys = Object.keys(filteredData[0]).filter((key) => key.startsWith("package_"));

  // 提取原始列名（去掉package_前缀）
  const columnNames = prefixKeys.map((key) => key.replace("package_", ""));

  // 3. 生成结果数组，每个columnName对应一个对象
  const result = columnNames.map((name) => ({
    name: name,
    package: name,
    pinNumber: 0,
    pins: [] as Array<{
      Name: string;
      Type: string;
      Io: string;
      Digital: string[];
      Analog: string[];
      Fail: string;
      selectLabel: string;
      sortValue: number; // 添加排序值字段
    }>
  }));

  // 4. 循环一次filteredData来填充数据
  filteredData.forEach((item) => {
    // 遍历每个prefix key
    prefixKeys.forEach((prefixKey, index) => {
      const packageValue = item[prefixKey];
      const columnName = columnNames[index];
      const selectKey = `select_${columnName}`;
      const selectValue = item[selectKey];

      // 处理Package列的值：去除括号内容并转换为数字
      let processedValue = null;
      if (packageValue) {
        // 去除括号及括号内容，例如 "28(1)" -> "28"
        const cleanValue = String(packageValue)
          .replace(/\([^)]*\)/g, "")
          .trim();
        // 转换为数字
        const numericValue = Number(cleanValue);
        if (!isNaN(numericValue)) {
          processedValue = numericValue;
        }
      }

      // 如果处理后的值为有效数字，则添加到对应的pins中
      if (processedValue !== null) {
        // 处理Digital字段，按\r\n分割
        const digitalArray = item.Digital
          ? item.Digital.split("\r\n").filter((d: string) => d.trim() !== "" && d.trim() !== "-" && d.trim() !== "一")
          : [];

        // 处理Analog字段，按\r\n分割
        const analogArray = item.Analog
          ? item.Analog.split("\r\n").filter((a: string) => a.trim() !== "" && a.trim() !== "-" && a.trim() !== "一")
          : [];

        // 创建pin对象，包含排序值和selectLabel
        const pinData = {
          Name: item["Pin name"],
          Type: item.Type,
          Io: item.IO || "",
          Digital: digitalArray,
          Analog: analogArray,
          sortValue: Number(processedValue), // 保存排序值
          Fail: item["Fail-safe"] || "",
          selectLabel: selectValue || "" // 添加selectLabel字段
        };

        // 添加到对应的pins数组中
        result[index].pins.push(pinData);
      }
    });
  });

  // 5. 对每个prefix key的pins按照对应的值排序
  result.forEach((item) => {
    item.pins.sort((a, b) => {
      // 尝试将排序值转换为数字进行比较
      const aNum = Number(a.sortValue);
      const bNum = Number(b.sortValue);

      // 如果两个值都是有效数字，按数字大小排序
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }

      // 否则按字符串排序
      return aNum - bNum;
    });
  });

  // 6. 为每个对象添加pinNumber字段
  result.forEach((item) => {
    item.pinNumber = item.pins.length;
  });

  // 7. 过滤掉pins长度为0的项
  const filteredResult = result.filter((item) => item.pins.length > 0);

  console.log("最终结果:", filteredResult);
  return filteredResult;
};
const fileSelected = (file: File) => {
  console.log(file);
};
const error = (message: string) => {
  console.log(message);
};
</script>

<style></style>
