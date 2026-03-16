/**
 * Mock 开关：开发阶段默认走 mock。
 * 后端接口就绪后，可以把该值改为 false 或改为读取环境变量。
 */
export const USE_MOCK = true;

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
