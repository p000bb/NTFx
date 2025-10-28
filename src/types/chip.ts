// #region 从excel提取的原始芯片引脚信息
export interface Chip {
  id?: number;
  name: string;
  package: string;
  pinNumber: number;
  pins: PinsType[];
}

export interface ChipDB extends Omit<Chip, "id"> {
  id: number;
  projectId: number;
}
export interface PinsType {
  Name: string;
  Type: string;
  Io: string;
  Fail: string;
  Digital: string[];
  Analog: string[];
  selectLabel: string;
}
// #endregion

// #region 处理后的芯片引脚信息
export interface ChipInfo extends Omit<Chip, "pins"> {
  pins: PinType[];
}

export interface PinType extends Omit<PinsType, "Name"> {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  side: "" | "top" | "bottom" | "left" | "right";
  selectLabel: string;
  conflict: boolean;
}
// #endregion

// #region 下拉菜单信息
export interface Dropdown {
  visible: boolean;
  index: number;
  x: number;
  y: number;
  optionHeight: number;
  optionWidth: number;
  fontSize: number;
  fontScale: number;
}
// #endregion

// #region 项目信息
export interface Project {
  id?: number;
  name: string;
  remark: string;
}

export interface ProjectDB extends Omit<Project, "id"> {
  id: number;
  createTime: string;
  updateTime: string;
}
// #endregion
