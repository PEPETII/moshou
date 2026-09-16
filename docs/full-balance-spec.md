# 《墨守成规》全塔全敌数值平衡执行规格（v1）

## 1. 数据来源与口径

### 1.1 主数据源
- 本项目主数据源：`js/config.js`（唯一执行真值）。

### 1.2 外部标杆源（仅真实配置）
- `towerstorm/game`：`config/towers/*.js`、`config/minions/*.js`
- `quiver-dev/tower-defense-godot4`：`assets/scripts/global.gd`、`entities/turrets/*.tscn`、`entities/shooter.gd`
- `zupanibla/tower-defense`：`src/game.js`、`src/update-game.js`

### 1.3 统一指标
- `DPS = damage / (cooldown_ms / 1000)`（仅 `cooldown > 0`）
- `DPS效率 = DPS / cost`（仅伤害塔）
- `HP奖励比 = hp / reward`（敌人）
- 辅助/防线/经济/召唤塔不用 DPS效率，改用效用分：
  - `U_control = (控制强度 × 覆盖时长 × 影响目标数) / cost`
  - `U_aura = (增益幅度 × 光环覆盖面积系数) / cost`
  - `U_econ = 60秒期望收益增量 / cost`
  - `U_summon = (召唤体总EHP + 总伤害贡献) / cost`
  - `U_def = (承伤总量 + 反伤/阻挡收益) / cost`

### 1.4 重要语义约束
- `quiver` 的 `fire_rate` 为秒级装填时间（`Timer.start(fire_rate)`），不是每秒发射数。

### 1.5 默认假设
- 本文档为可执行规格，不直接修改 `config.js`。
- 采取“本项目风格优先”，外部仓库只提供边界与比例标杆，不照抄绝对值。

---

## 2. 当前基线快照（全量）

### 2.1 基线规模
- 炮塔：39
- 敌人：10
- 现有自动化结果（`node test-balance.js`）：炮塔平衡失败、敌人平衡失败、战斗节奏通过、融合价值通过。

### 2.2 炮塔基线（39项）

| towerKey | cost | damage | cooldown | range | 关键机制（当前） |
|---|---:|---:|---:|---:|---|
| fire | 120 | 1.0 | 900 | 4 | 基础单体追踪 |
| water | 90 | 0 | 800 | 3 | 减速40%，持续2500ms |
| mountain | 140 | 1.5 | 0 | 0 | 路径塔，hp=18，阻挡/反伤 |
| wood | 100 | 0.4 | 400 | 4 | 高频连射 |
| gold | 180 | 3.0 | 1700 | 8 | 直线穿透 |
| earth | 220 | 2.5 | 1700 | 3 | AOE，aoeRange=2 |
| xinZhongYan | 250 | 3.0 | 1500 | 6 | 灼烧，burnDamage=1 |
| ruFengSiZhen | 300 | 1.5 | 1200 | 5 | 链式弹射，chainCount=4 |
| thunder | 200 | 2.0 | 1400 | 5 | 连锁导电，chainCount=3 |
| ice | 160 | 0.8 | 1000 | 4 | 减速+冻结 |
| poison | 170 | 0.5 | 700 | 4 | 持续中毒，叠层 |
| wind | 180 | 1.2 | 1100 | 5 | 击退+驱散 |
| light | 190 | 1.5 | 1200 | 6 | 穿透+显形 |
| dark | 230 | 2.2 | 1300 | 5 | 击杀回血 |
| star | 260 | 1.8 | 1000 | 5 | 随机元素+连击加成 |
| frost | 240 | 2.0 | 1800 | 3 | 霜冻AOE+深寒加成 |
| drum | 150 | 0 | 0 | 0 | 光环：攻速+20% |
| banner | 130 | 0 | 0 | 0 | 光环：射程+1 |
| bell | 200 | 0.5 | 3000 | 3 | 周期眩晕 |
| mirror | 180 | 0 | 0 | 0 | 光环：反伤30% |
| zither | 160 | 0 | 0 | 0 | 光环：减速20% |
| talisman | 140 | 0.3 | 1500 | 5 | 易伤标记 |
| formation | 210 | 0 | 0 | 0 | 光环：DOT+减速 |
| lantern | 120 | 0 | 0 | 0 | 光环：显形 |
| wall | 180 | 0 | 0 | 0 | 路径墙体，hp=35 |
| moat | 110 | 0.3 | 0 | 0 | 路径减速壕 |
| trap | 160 | 5.0 | 0 | 0 | 路径陷阱，触发3次 |
| arrow | 160 | 1.0 | 600 | 3 | 路径自动射击 |
| bunker | 280 | 2.0 | 1200 | 2 | 路径堡垒，减伤+反伤 |
| palisade | 70 | 0.5 | 0 | 0 | 低费路径路障 |
| treasure | 100 | 0 | 0 | 0 | 每波产金 |
| healer | 150 | 0 | 0 | 0 | 每波回血 |
| soul | 220 | 0 | 8000 | 4 | 召唤灵魂守卫 |
| shadow | 200 | 0 | 0 | 0 | 复制相邻塔攻击 |
| time | 300 | 0 | 0 | 0 | 全局减速 |
| detonator | 120 | 8.0 | 0 | 3 | 手动引爆AOE |
| parasite | 190 | 0.8 | 900 | 4 | 寄生死亡爆炸 |
| wheel | 200 | 1.5 | 300 | 5 | 旋转扇扫 |
| fusion | 0 | 0 | 1000 | 0 | 融合基类占位 |

### 2.3 敌人基线（10项）

| enemyKey | hp | speed | reward | damage | HP奖励比 |
|---|---:|---:|---:|---:|---:|
| corpse | 4 | 1.0 | 12 | 1 | 0.333 |
| ghost | 3 | 1.6 | 18 | 1 | 0.167 |
| armor | 8 | 0.7 | 30 | 1 | 0.267 |
| split | 5 | 1.0 | 25 | 1 | 0.200 |
| giant | 28 | 0.7 | 75 | 2 | 0.373 |
| superGiant | 70 | 0.6 | 180 | 3 | 0.389 |
| overlord | 200 | 0.5 | 500 | 4 | 0.400 |
| shadow | 8 | 2.0 | 35 | 1 | 0.229 |
| ironArmor | 15 | 0.6 | 45 | 2 | 0.333 |
| swiftGhost | 3 | 3.0 | 25 | 1 | 0.120 |

---

## 3. 全塔目标值表（39项）

### 3.1 伤害塔分层目标（DPS效率）
- T1 快攻单体：`0.0100 - 0.0115`
- T2 穿透/多段：`0.0085 - 0.0100`
- T3 AOE/链式/状态混伤：`0.0070 - 0.0085`
- T4 强控制混伤：`0.0065 - 0.0075`

### 3.2 效用分阈值（辅助塔）
- `U_control`: `0.045 - 0.075`
- `U_aura`: `0.030 - 0.045`
- `U_econ`: `0.250 - 0.420`
- `U_summon`: `0.380 - 0.620`
- `U_def`: `0.140 - 0.280`

### 3.3 39塔逐项目标

| towerKey | 当前(cost/damage/cooldown/range/关键机制) | 目标(cost/damage/cooldown/range/关键机制) | 目标指标 | 调整原因 |
|---|---|---|---|---|
| fire | 120/1.0/900/4；基础单体 | 120/1.1/900/4.2；基础单体稳定输出 | DPS效率=0.0102 | 作为校准基准塔，轻微抬升基线DPS |
| water | 90/0/800/3；slow=0.4 | 100/0/750/3.2；slow=0.45，dur=2800 | U_control=0.052，频率=1次/0.75s | 强化控速价值，避免“0伤害低存在感” |
| mountain | 140/1.5/0/0；hp=18路径阻挡 | 150/1.8/0/0；hp=22，路径阻挡反伤强化 | U_def=0.210 | 路径塔核心承伤不足，需提高前线稳定性 |
| wood | 100/0.4/400/4；快攻 | 105/0.45/380/4.0；快攻持续输出 | DPS效率=0.0113 | 保留高频定位，略提成长上限 |
| gold | 180/3.0/1700/8；穿透 | 190/3.2/1650/7.5；穿透稳定 | DPS效率=0.0102 | 保持远程穿透特色，压缩超远射程收益 |
| earth | 220/2.5/1700/3；AOE=2 | 230/2.8/1550/3.2；AOE=2.2 | DPS效率=0.0079 | 修复现有效率偏低问题，保留AOE权重 |
| xinZhongYan | 250/3.0/1500/6；burn=1 | 260/3.2/1450/6.0；burn=1.2,dur=3200 | DPS效率=0.0085 | 强化持续灼烧风格，避免只看面板伤害 |
| ruFengSiZhen | 300/1.5/1200/5；链弹4 | 310/2.6/1100/5.2；链弹4,range=160 | DPS效率=0.0076 | 当前偏弱，提升链系清线能力 |
| thunder | 200/2.0/1400/5；导电链 | 210/2.1/1150/5.2；chain=3,decay=0.23 | DPS效率=0.0087 | 维持导电联动，改善中期输出断层 |
| ice | 160/0.8/1000/4；减速冻结 | 170/1.1/850/4.2；slow=0.38,freeze=1200 | DPS效率=0.0076 | 控制塔补足基础伤害，减少纯功能亏模 |
| poison | 170/0.5/700/4；中毒叠层 | 180/0.8/650/4.2；poison=0.35,dur=4200 | DPS效率=0.0068 | 提升毒系持续价值，避免启动慢 |
| wind | 180/1.2/1100/5；击退驱散 | 185/1.4/1000/5.2；knockback=1.2,cd=2800 | DPS效率=0.0076 | 强化功能伤害一体，减少“只控不杀” |
| light | 190/1.5/1200/6；显形穿透 | 200/1.7/1050/6.2；pierce=2,reveal=4500 | DPS效率=0.0081 | 对隐身敌人战术位保持高优先级 |
| dark | 230/2.2/1300/5；击杀回血 | 240/2.4/1200/5.2；killHeal=1.2,max=12 | DPS效率=0.0083 | 强化“续航型输出”定位 |
| star | 260/1.8/1000/5；随机元素 | 270/2.2/900/5.2；combo=0.35 | DPS效率=0.0091 | 高成本随机塔需要更稳定期望收益 |
| frost | 240/2.0/1800/3；霜冻AOE | 250/2.6/1450/3.2；aoe=2.2,slow=0.30 | DPS效率=0.0072 | 提升深寒体系可用性 |
| drum | 150/0/0/0；攻速光环20% | 155/0/0/0；auraRange=3.2,aura=18% | U_aura=0.036 | 攻速光环略降幅换取更稳定覆盖 |
| banner | 130/0/0/0；射程光环+1 | 140/0/0/0；auraRange=4.2,aura=+1.1 | U_aura=0.039 | 维持高战略价值，防止过低成本泛滥 |
| bell | 200/0.5/3000/3；群体眩晕 | 210/1.2/2200/3.5；stun=1200,stunR=3.2 | U_control=0.061，频率=1次/2.2s | 增加可感知输出并强化控制节奏 |
| mirror | 180/0/0/0；反伤光环 | 190/0/0/0；aura=0.32,range=3.2,mountainBonus=0.6 | U_aura=0.034 | 与山系联动强化，但限制泛用过强 |
| zither | 160/0/0/0；范围减速20% | 170/0/0/0；auraSlow=0.24,range=3.2 | U_aura=0.033 | 中后期减速能力略升，保留功能塔定位 |
| talisman | 140/0.3/1500/5；易伤标记 | 150/0.9/1200/5.2；mark=35%,dur=5500,count=2 | U_control=0.056，频率=1次/1.2s | 让标记塔不再成为纯亏模功能件 |
| formation | 210/0/0/0；阵法DOT+减速 | 220/0/0/0；dot=0.9,slow=0.22,range=2.2 | U_aura=0.041 | 强化阵地战价值，匹配高占地成本 |
| lantern | 120/0/0/0；显形光环 | 130/0/0/0；reveal=0.18,range=4.2 | U_aura=0.030 | 保留反隐工具属性，避免过高成本 |
| wall | 180/0/0/0；hp=35路径墙 | 190/0/0/0；hp=42,repair=0.55 | U_def=0.245 | 作为主承伤墙体，需要更稳耐久 |
| moat | 110/0.3/0/0；路径减速壕 | 120/0.35/0/0；hp=14,slow=0.38,dur=3200 | U_control=0.058 | 提升路径控制贡献，减少后期失效 |
| trap | 160/5.0/0/0；触发3次陷阱 | 170/6.0/0/0；hp=10,stun=1700,triggers=4 | U_def=0.230 | 增强爆发陷阱的实战兑现率 |
| arrow | 160/1.0/600/3；路径射击 | 180/1.1/600/3.2；hp=12,pierce=1 | DPS效率=0.0102 | 路径伤害塔作为前线补刀点 |
| bunker | 280/2.0/1200/2；减伤+反伤 | 300/2.4/1100/2.2；hp=34,reflect=2.6,dr=0.22 | U_def=0.265（且DPS效率≥0.0070） | 强化“攻防一体”但控制造价上限 |
| palisade | 70/0.5/0/0；低费路障 | 80/0.6/0/0；hp=8,repair=0.35 | U_def=0.145 | 低费塔保留早期过渡，不抢中后期位 |
| treasure | 100/0/0/0；产金25/波 | 110/0/0/0；gold=30/波,interest=6,max=2 | U_econ=0.300（60秒增益） | 经济塔提升但受数量上限约束 |
| healer | 150/0/0/0；每波回血3 | 160/0/0/0；heal=4/波,threshold=0.35,bonus=2.5 | U_def=0.180（按核心等效承伤） | 提高容错但避免无限续航 |
| soul | 220/0/8000/4；召唤守卫 | 230/0/7500/4.2；summonHp=6,damage=1.2,max=2 | U_summon=0.420，频率=1次/7.5s | 补强召唤塔的中后期作用 |
| shadow | 200/0/0/0；复制50% | 210/0/0/0；copyEfficiency=0.58 | U_aura=0.032 | 提升策略上限，避免复制塔过弱 |
| time | 300/0/0/0；全局减速15% | 320/0/0/0；globalSlow=0.18 | U_control=0.048（常驻） | 终局工具塔需可感知但不破坏节奏 |
| detonator | 120/8.0/0/3；手动引爆 | 130/9.0/0/3.2；explodeR=3.2,stun=1200 | U_control=0.070（手动触发） | 保留高爆发手操价值 |
| parasite | 190/0.8/900/4；寄生爆炸 | 200/1.1/800/4.2；parasite=6500,explode=3.5 | DPS效率=0.0069 | 提升寄生体系稳定收益 |
| wheel | 200/1.5/300/5；旋转扇扫 | 240/1.2/500/4.8；rot=66,fan=34 | DPS效率=0.0100 | 下修当前超模效率，保留清线特色 |
| fusion | 0/0/1000/0；融合占位 | 0/0/1000/0；系统占位不直出战斗值 | U_sys=1.000（固定） | 明确不参与常规平衡评分 |

---

## 4. 全敌目标值表（10项）

### 4.1 目标规则
- 普通型：`HP奖励比` 落在中位区间（约 `0.22 - 0.30`）。
- 高速脆皮：降低 `HP奖励比`（约 `0.13 - 0.20`），保速度威胁。
- 重甲/巨型/Boss：提高 `HP奖励比`（约 `0.30 - 0.36`），同时限制奖励膨胀。

### 4.2 10敌逐项目标

| enemyKey | 当前(hp/speed/reward/damage) | 目标(hp/speed/reward/damage) | 目标HP奖励比 | 调整原因 |
|---|---|---|---:|---|
| corpse | 4/1.0/12/1 | 5/1.0/18/1 | 0.278 | 普通近战基准，降低被瞬杀与经济畸形 |
| ghost | 3/1.6/18/1 | 4/1.7/24/1 | 0.167 | 高速脆皮，保持速度压迫 |
| armor | 8/0.7/30/1 | 10/0.75/34/1 | 0.294 | 重甲普通怪，提升硬度但不超奖惩 |
| split | 5/1.0/25/1 | 6/1.0/24/1 | 0.250 | 分裂怪改为中位收益，降低奖励虚高 |
| giant | 28/0.7/75/2 | 34/0.72/100/2 | 0.340 | 巨型怪应成为中后期耐久锚点 |
| superGiant | 70/0.6/180/3 | 86/0.62/250/3 | 0.344 | 强化后期压场能力，控制经济释放 |
| overlord | 200/0.5/500/4 | 240/0.52/680/4 | 0.353 | Boss维持高耐久，奖励增幅受控 |
| shadow | 8/2.0/35/1 | 10/2.2/50/1 | 0.200 | 隐身高速，保持侦测压力 |
| ironArmor | 15/0.6/45/2 | 18/0.62/60/2 | 0.300 | 铁甲抗性怪进入重甲中位区间 |
| swiftGhost | 3/3.0/25/1 | 4/3.2/30/1 | 0.133 | 极高速脆皮，主打漏怪压力而非血量 |

---

## 5. 融合公式目标参数

### 5.1 新参数（精确值）
- 成本：
  - `baseCost = round((c1Cost + c2Cost) * 0.92)`
  - 非路径融合：`cost = baseCost`
  - 路径融合：`cost = round(baseCost * 1.20)`
- 伤害：
  - `damage = round1((c1Damage + c2Damage) * 0.88 + skillFlatDamage)`
- 冷却：
  - `cooldown = clamp(round(min(c1Cooldown, c2Cooldown) * 0.92), 300, 2600)`
- 射程：
  - 路径融合：`range = round1(max(c1Range, c2Range))`
  - 非路径融合：`range = round1(max(c1Range, c2Range) + 0.4)`
- 路径生命：
  - `hp = round(c1Hp + c2Hp + 8)`（仅路径融合）

### 5.2 与当前参数对照
- 当前：`cost系数0.90`、路径乘区 `1.25`、`damage系数0.95`、`cooldown系数0.90(clamp 250~2500)`、非路径`range+0.5`、路径`hp+10`。
- 目标：更保守的融合强度（伤害/冷却略回收），并放宽极端冷却下限，降低高频融合超模概率。

### 5.3 三个样例配方演算

1. 普通伤害塔 × 伤害塔（`fire + wood`）
- 输入：`fire(120,1.0,900,4)` + `wood(100,0.4,400,4)`
- 输出：
  - `cost = round((220)*0.92)=202`
  - `damage = round1((1.0+0.4)*0.88)=1.2`
  - `cooldown = round(400*0.92)=368`
  - `range = 4 + 0.4 = 4.4`

2. 伤害塔 × 辅助塔（`fire + drum`）
- 输入：`fire(120,1.0,900,4)` + `drum(150,0,0,0)`（冷却按默认1000参与）
- 输出：
  - `cost = round((270)*0.92)=248`
  - `damage = round1((1.0+0)*0.88)=0.9`
  - `cooldown = round(min(900,1000)*0.92)=828`
  - `range = 4 + 0.4 = 4.4`

3. 路径塔 × 路径塔（`mountain + wall`）
- 输入：`mountain(140,1.5,0,0,hp18)` + `wall(180,0,0,0,hp35)`
- 输出：
  - `baseCost = round((320)*0.92)=294`
  - `cost = round(294*1.20)=353`
  - `damage = round1((1.5+0)*0.88)=1.3`
  - `cooldown = round(1000*0.92)=920`
  - `range = 0`
  - `hp = round(18+35+8)=61`

---

## 6. 验收与回归清单

### 6.1 自动化验收
- 必跑：`node test-balance.js`
- 目标通过门槛（写死）：
  - 伤害塔目标达成率（按 `DPS效率`）：`>= 90%`
  - 辅助塔目标达成率（按 `U_*`）：`>= 85%`
  - 敌人目标达成率（按 `HP奖励比`）：`>= 90%`
  - 战斗节奏：关键敌人TTK在目标窗口内（早期 3~5s，中期 5~9s，后期 9~16s）
  - 融合价值：成本节省率 `10%~22%`，且融合DPS不高于同成本专精塔 `+8%`

### 6.2 手工回归场景
1. 早期（第1~3波）：验证低费塔与路径塔组合，检查漏怪率与经济压力。
2. 中期（第4~7波）：验证控制链与AOE塔覆盖，检查重甲/隐身处理能力。
3. 后期（第8波+）：验证Boss与高压波，检查融合塔是否越界。

### 6.3 文档交付前自检（实现者执行）
1. 校验 39 塔/10 敌是否全覆盖且每项有精确目标值。
2. 校验辅助塔是否全部走效用分口径、无 DPS 强绑。
3. 校验融合章节是否只给公式参数且含 3 个演算样例。
4. 运行 `node test-balance.js`，将结果附在文档末尾“验收记录”。
5. 对照来源链接逐项抽查 10 个外部标杆字段（成本/伤害/攻速/射程/HP/速度）。

### 6.4 验收记录（当前基线，2026-04-27）
- 命令：`node test-balance.js`
- 结果摘要：
  - 炮塔平衡：`4/6`（失败）
  - 敌人平衡：`3/7`（失败）
  - 战斗节奏：通过
  - 融合价值：通过
  - 总体：失败（需按本规格落地后复测）

### 6.5 外部基准来源链接（写入文档）
- https://github.com/towerstorm/game/tree/master/config/towers
- https://github.com/towerstorm/game/tree/master/config/minions
- https://raw.githubusercontent.com/towerstorm/game/master/config/towers/turret.js
- https://raw.githubusercontent.com/towerstorm/game/master/config/towers/cannon.js
- https://raw.githubusercontent.com/towerstorm/game/master/config/minions/knight.js
- https://raw.githubusercontent.com/quiver-dev/tower-defense-godot4/refs/heads/main/assets/scripts/global.gd
- https://raw.githubusercontent.com/quiver-dev/tower-defense-godot4/refs/heads/main/entities/turrets/single/single_turret.tscn
- https://raw.githubusercontent.com/quiver-dev/tower-defense-godot4/refs/heads/main/entities/shooter.gd
- https://raw.githubusercontent.com/zupanibla/tower-defense/master/src/game.js
- https://raw.githubusercontent.com/zupanibla/tower-defense/master/src/update-game.js
