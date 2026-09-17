# 功能清单

本文件用于记录已实现、计划中及已验证的功能；条目应以项目实际配置与状态为准。

## 当前状态

首页为可运行的 Next.js / React Three Fiber 微缩甜品店。静态 3D 产品场景已经完成，并已接入第一套单物体拾取与放置闭环。

## 已实现

### 草莓蛋糕拾取与桌面放置

- 状态：已实现并完成桌面端实际操作验证
- 入口：中央展示柜第三层的草莓蛋糕
- 合法目标：右侧圆桌桌面
- 状态：`idle`、`hovered`、`picked`、`carrying`、`placeable`、`placed`、`returning`
- 行为：悬停轻微上浮与缩放；拾取后通过指针射线与水平 carry plane 平滑跟随；进入桌面安全半径后吸附到桌面高度；非法释放平滑返回展示柜。
- 放置精度：独立蛋糕 GLB 的局部底面为 `y=0`，桌面 drop zone 的世界高度为 `y=1.79`，放置时直接以底面原点贴合该高度。
- 验证方式：浏览器实际完成非法释放返回和合法桌面放置；390×844 场景正常渲染；`pnpm run validate:3d` 与 `pnpm run build`。
- 相关文件：`src/components/three/interaction/`、`src/components/three/BakeryScene.tsx`、`public/models/bakery/interactive-cake.glb`

## 尚未实现

- 多物体拾取、物理与重力。
- 饮料机、草莓拆分、仓鼠行为和滚动叙事。
