/**
 * 关卡数据配置文件
 * 塔防 4 个大关卡（主题），每个 5 个小关卡，共 20 关（2026-10-21 四大关卡与敌人扩充）。
 * 关卡ID格式: "主题-关卡" 如 "1-1", "4-5"
 * 主题表是唯一数据源：LevelManager 与选关界面都从这里读取。
 * unlockRequirement 字段保留但不再参与判断：所有关卡全部解锁（决策 E7）。
 */

const THEMES = {
  1: { id: 1, name: "初墨", icon: "墨", color: "#6a6459", desc: "荒村夜路，初识妖异", unlockRequirement: null },
  2: { id: 2, name: "墨泽", icon: "泽", color: "#4f6f80", desc: "水乡烟雨，潜影难寻", unlockRequirement: null },
  3: { id: 3, name: "铁砚", icon: "砚", color: "#55595e", desc: "关隘重甲，步步为营", unlockRequirement: null },
  4: { id: 4, name: "焚卷", icon: "焚", color: "#8a4a2a", desc: "卷焚劫起，万妖归位", unlockRequirement: null },
};

const LEVELS_DATA = {};
