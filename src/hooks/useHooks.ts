import { useBreakpoints } from "@vueuse/core";

export function useIsMobile() {
  const breakpoints = useBreakpoints({ md: 768 });
  const isMobile = breakpoints.smaller("md");
  return { isMobile };
}
