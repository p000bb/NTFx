// #region 从excel提取的原始芯片引脚信息
export interface Chip {
  id?: number;
  name: string;
  package: string;
  pinNumber: number;
  pins: PinsType[];
}

export interface PinsType {
  Name: string;
  Type: string;
  Io: string;
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
