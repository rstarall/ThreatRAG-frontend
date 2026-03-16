export default function Default() {
  // 平行路由 slot `sideContainer` 在非 /chat 页面不应该强制出现。
  // 返回 null 代表该 slot 默认不渲染任何内容。
  return null;
}
