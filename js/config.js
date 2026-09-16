// 配置兼容入口：领域配置在后续脚本中按依赖顺序注册。
const configHost = typeof window !== "undefined" ? window : globalThis;
if (configHost.CONFIG) console.warn("CONFIG already defined, extending existing configuration");
const CONFIG = configHost.CONFIG || {};
configHost.CONFIG = CONFIG;
