/**
 * 关卡数据配置文件
 * 实验阶段：仅保留主题 1（初墨）与 2 关；其余主题与关卡已删除（工单 02）
 * 关卡ID格式: "主题-关卡" 如 "1-1", "2-5", "5-10"
 */

const THEMES = {
  1: {
    id: 1,
    name: "初墨",
    icon: "墨",
    color: "#6a6459",
    desc: "水墨初染，入门试炼",
    unlockRequirement: null
  }
};

const LEVELS_DATA = {};
