<template>
  <div class="w-48">
    <FileSelect @fileParsed="fileParsed" @fileSelected="fileSelected" @error="error" />
  </div>
</template>

<script lang="ts" setup name="Config">
import FileSelect from "@/components/FileSelect/index.vue";

const fileParsed = (data: any[]) => {
  const filteredData = data;
  console.log(filteredData);
  // 处理数据
  if (filteredData.length === 0) return;

  // 2. 从第一项中获取到Name之前的所有keys（只获取Package列）
  const prefixKeys = Object.keys(filteredData[0]).filter(
    (key) => !["Analog", "Digital", "Fail-safe", "Function selection", "IO", "Pin name", "Type"].includes(key)
  );

  // 3. 生成结果数组，每个prefix key对应一个对象
  const result = prefixKeys.map((key) => ({
    name: key,
    package: key,
    pinNumber: 0,
    pins: [] as Array<{
      Name: string;
      Type: string;
      Io: string;
      Digital: string[];
      Analog: string[];
      sortValue: string; // 添加排序值字段
    }>
  }));

  // 4. 循环一次filteredData来填充数据
  filteredData.forEach((item) => {
    // 遍历每个prefix key
    prefixKeys.forEach((prefixKey, index) => {
      const prefixValue = item[prefixKey];

      // 处理Package列的值：去除括号内容并转换为数字
      let processedValue = null;
      if (prefixValue) {
        // 去除括号及括号内容，例如 "28(1)" -> "28"
        const cleanValue = String(prefixValue)
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
        const digitalArray = item.Digital ? item.Digital.split("\r\n").filter((d) => d.trim() !== "") : [];

        // 处理Analog字段，按\r\n分割
        const analogArray = item.Analog ? item.Analog.split("\r\n").filter((a) => a.trim() !== "") : [];

        // 创建pin对象，包含排序值
        const pinData = {
          Name: item["Pin name"],
          Type: item.Type,
          Io: item.IO || "",
          Digital: digitalArray,
          Analog: analogArray,
          sortValue: String(processedValue) // 保存排序值
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
      return a.sortValue.localeCompare(b.sortValue);
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
