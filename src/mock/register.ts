export interface RegisterItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export interface ModuleItem {
  id: string;
  name: string;
  desc: string;
  registers: RegisterItem[];
}

export const registerModules: ModuleItem[] = [
  {
    id: "tim",
    name: "ATIM",
    desc: "高级定时器（如TIM1/TIM8），支持高级PWm、互补输出等",
    registers: [
      {
        id: "tim1",
        name: "TIM1",
        icon: "Timer",
        desc: "高级定时器1，具备PWM与死区控制，适用于电机应用。"
      },
      {
        id: "tim8",
        name: "TIM8",
        icon: "Timer",
        desc: "高级定时器8，支持计数模式和复位触发，精度更高。"
      }
    ]
  },
  {
    id: "spi",
    name: "SPI",
    desc: "串行外设接口（SPI），用于高速设备通信",
    registers: [
      {
        id: "spi1",
        name: "SPI1",
        icon: "Send",
        desc: "SPI1主控通道，适合外接高速Flash存储。"
      },
      {
        id: "spi2",
        name: "SPI2",
        icon: "Send",
        desc: "SPI2可用于低速外设，支持全双工通信。"
      }
    ]
  },
  {
    id: "usart",
    name: "USART",
    desc: "通用同步/异步收发器，串口通讯",
    registers: [
      {
        id: "usart1",
        name: "USART1",
        icon: "SquareTerminal",
        desc: "USART1支持高速串口通信，常用于调试和外设互联。"
      }
    ]
  }
];

export const outputRegisterList = [
  { id: "comp3", name: "COMP3", icon: "Minus", fixed: true },
  { id: "opamp1", name: "OPAMP1", icon: "ArrowBigRight", fixed: true }
];
