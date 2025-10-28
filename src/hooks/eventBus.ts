import { onBeforeUnmount } from "vue";
import mitt, { type Handler } from "mitt";
import { Chip, PinType } from "@/types/chip";

/**
 * 事件类型声明（支持泛型参数化）
 */
type EventHandler<T> = (payload: T) => void;

// 默认总线类型示例
export type AppEvents = {
  "register:add": { id: string; name: string; icon: string };
  "register:remove": string;
  "chip:search": string;
  "svg:get": (cb: (svg: SVGSVGElement | null) => void) => void;
  "restore:chip": undefined;
  "check:conflict": (val: PinType[]) => void;
  "pin:update": { pinName: string; newLabel: string };
  "clear:all:conflicts": undefined;
  "chip:get": (cb: (chips: Chip) => void) => void;
};

// mitt 实例全局唯一
const emitter = mitt<AppEvents>();

/**
 * 通用 useEventBus，支持类型和事件名
 * @param type - 事件名
 */
export function useEventBus<K extends keyof AppEvents>(type: K) {
  const callbackList: EventHandler<AppEvents[K]>[] = [];
  // 事件监听
  function on(cb: EventHandler<AppEvents[K]>, immediate = false, latestValue?: AppEvents[K]) {
    callbackList.push(cb);
    emitter.on(type, cb as Handler);
    if (immediate && latestValue !== undefined) {
      cb(latestValue);
    }
  }
  // 事件解绑
  function off(cb: EventHandler<AppEvents[K]>) {
    emitter.off(type, cb as Handler);
  }
  // 触发事件
  function emit(payload: AppEvents[K]) {
    emitter.emit(type, payload);
  }
  // 自动移除
  onBeforeUnmount(() => {
    callbackList.forEach((cb) => off(cb));
  });
  return { on, off, emit };
}

// 兼容一步到位需求额外提供全局 bus
export { emitter as eventBus };
