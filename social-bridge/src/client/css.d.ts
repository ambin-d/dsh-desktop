/** CSS 模块声明：构建时以文本内联，运行期由入口 apply() 注入 <style>。 */
declare module '*.css' {
  const content: string
  export default content
}
