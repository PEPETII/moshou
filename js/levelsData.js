/**
 * 关卡数据配置文件
 * 5个主题，每个主题10个关卡，共50关
 * 关卡ID格式: "主题-关卡" 如 "1-1", "2-5", "5-10"
 */

const THEMES = {
  1: {
    id: 1,
    name: "初墨",
    icon: "墨",
    color: "#8a8a8a",
    desc: "水墨初染，入门试炼",
    unlockRequirement: null
  },
  2: {
    id: 2,
    name: "风林",
    icon: "风",
    color: "#81c784",
    desc: "疾风骤雨，速度试炼",
    unlockRequirement: { theme: 1, level: 5 }
  },
  3: {
    id: 3,
    name: "火山",
    icon: "火",
    color: "#ff7043",
    desc: "烈焰焚天，力量试炼",
    unlockRequirement: { theme: 1, level: 10 }
  },
  4: {
    id: 4,
    name: "玄冰",
    icon: "冰",
    color: "#4fc3f7",
    desc: "冰封千里，控制试炼",
    unlockRequirement: { theme: 2, level: 5 }
  },
  5: {
    id: 5,
    name: "终焉",
    icon: "终",
    color: "#ab47bc",
    desc: "末日降临，终极试炼",
    unlockRequirement: { theme: 3, level: 5 }
  }
};

const LEVELS_DATA = {};
