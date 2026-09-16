/**
 * 融合塔配置构建器：
 * 1. 按文档首次出现优先，构建 39 条无序配方；
 * 2. 数值采用统一推导公式；
 * 3. 追加同类型二阶段进化白名单配方。
 */
(function buildFusionConfig() {
  const PATH_COMPONENTS = new Set([
    'mountain', 'wall', 'bunker', 'moat', 'trap', 'arrow', 'palisade',
  ]);

  const BASE_FUSION_DESIGNS = [
    { key: 'fire+fire', name: '炎', desc: '强化火焰攻击，持续灼烧', components: ['fire', 'fire'] },
    { key: 'water+water', name: '淼', desc: '强化水流攻击，持续减速', components: ['water', 'water'] },
    { key: 'mountain+mountain', name: '岳', desc: '强化山脉，高血量阻挡', components: ['mountain', 'mountain'] },
    { key: 'wood+wood', name: '林', desc: '强化木塔，持续中毒', components: ['wood', 'wood'] },
    { key: 'gold+gold', name: '鑫', desc: '强化金塔，穿透攻击', components: ['gold', 'gold'] },
    { key: 'thunder+thunder', name: '霆', desc: '强化连锁效果', components: ['thunder', 'thunder'] },
    { key: 'ice+ice', name: '凌', desc: '强化冻结效果', components: ['ice', 'ice'] },
    { key: 'poison+poison', name: '蛊', desc: '强化中毒效果', components: ['poison', 'poison'] },
    { key: 'wind+wind', name: '岚', desc: '强化击退效果', components: ['wind', 'wind'] },
    { key: 'light+light', name: '辉', desc: '强化穿透效果', components: ['light', 'light'] },
    { key: 'dark+dark', name: '冥', desc: '强化生命偷取', components: ['dark', 'dark'] },
    { key: 'fire+water', name: '水火不容', desc: '高伤害+范围效果', components: ['water', 'fire'] },
    { key: 'gold+wood', name: '金枝玉叶', desc: '穿透攻击+持续伤害', components: ['gold', 'wood'] },
    { key: 'mountain+water', name: '山清水秀', desc: '阻挡+减速', components: ['mountain', 'water'] },
    { key: 'thunder+wind', name: '风雷激荡', desc: '连锁攻击+击退', components: ['wind', 'thunder'] },
    { key: 'dark+light', name: '阴阳调和', desc: '显形+生命偷取', components: ['light', 'dark'] },
    { key: 'earth+fire', name: '火土相生', desc: '高伤害+范围效果', components: ['fire', 'earth'] },
    { key: 'fire+gold', name: '真金烈火', desc: '穿透攻击+灼烧', components: ['gold', 'fire'] },
    { key: 'fire+wood', name: '钻木取火', desc: '快速攻击+持续伤害', components: ['wood', 'fire'] },
    { key: 'fire+thunder', name: '闪电', desc: '高伤害+连锁', components: ['thunder', 'fire'] },
    { key: 'fire+wind', name: '烈火', desc: '快速攻击+扩散', components: ['wind', 'fire'] },
    { key: 'ice+wind', name: '寒风', desc: '深度减速+范围效果', components: ['ice', 'wind'] },
    { key: 'fire+poison', name: '毒火', desc: '持续伤害+扩散', components: ['poison', 'fire'] },
    { key: 'ice+water', name: '冰霜', desc: '深度减速+冻结', components: ['water', 'ice'] },
    { key: 'thunder+water', name: '雷电', desc: '连锁攻击+减速', components: ['thunder', 'water'] },
    { key: 'water+wind', name: '风暴', desc: '范围伤害+减速', components: ['wind', 'water'] },
    { key: 'ice+thunder', name: '雷暴', desc: '高伤害+冻结', components: ['ice', 'thunder'] },
    { key: 'fire+mountain', name: '火山', desc: '发射火球并阻挡敌人', components: ['fire', 'mountain'] },
    { key: 'earth+water', name: '泥沼', desc: '减速+持续伤害', components: ['earth', 'water'] },
    { key: 'earth+wood', name: '根须', desc: '持续伤害+减速', components: ['earth', 'wood'] },
    { key: 'earth+gold', name: '金石', desc: '高伤害+穿透', components: ['gold', 'earth'] },
    { key: 'earth+ice', name: '冰岩', desc: '减速+阻挡', components: ['ice', 'earth'] },
    { key: 'thunder+wood', name: '雷击木', desc: '自行决定', components: ['thunder', 'wood'] },
    { key: 'banner+drum', name: '鼓旗', desc: '攻速+射程双增益', components: ['drum', 'banner'] },
    { key: 'mirror+wall', name: '壁上观', desc: '高HP阻挡+伤害反射', components: ['wall', 'mirror'] },
    { key: 'bunker+drum', name: '碉鼓', desc: '阻挡+攻速加成', components: ['bunker', 'drum'] },
    { key: 'parasite+poison', name: '蛊毒', desc: '寄生+腐蚀连锁', components: ['parasite', 'poison'] },
    { key: 'bell+drum', name: '鼓舞', desc: '攻速加成+眩晕', components: ['drum', 'bell'] },
    { key: 'banner+mirror', name: '旗帜鲜明', desc: '射程加成+反射', components: ['banner', 'mirror'] },
  ];

  // 同类型链式进化：仅白名单允许
  const EVOLUTION_DESIGNS = [
    { from: 'fire+fire', base: 'fire', char: '焱', desc: '炎火再聚，灼烧爆发' },
    { from: 'water+water', base: 'water', char: '沧', desc: '巨浪席卷，极寒水压' },
    { from: 'wood+wood', base: 'wood', char: '森', desc: '万木丛生，毒藤缠绕' },
    { from: 'gold+gold', base: 'gold', char: '鎏', desc: '鎏金贯杀，穿透增强' },
    { from: 'earth+earth', base: 'earth', char: '垚', desc: '厚土壁垒，极高阻挡' },
  ];

  // 仅用于土系链式进化入口（不计入文档 39 组统计）
  BASE_FUSION_DESIGNS.push({
    key: 'earth+earth',
    name: '圭',
    desc: '双土相叠，形成坚固土垒',
    components: ['earth', 'earth'],
  });

  function normalizeKey(a, b) {
    return [a, b].sort().join('+');
  }

  function round1(val) {
    return Math.round(val * 10) / 10;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseHex(hex) {
    const v = hex.replace('#', '');
    const value = v.length === 3 ? v.split('').map((ch) => ch + ch).join('') : v;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function mixHex(c1, c2) {
    const a = parseHex(c1);
    const b = parseHex(c2);
    const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');
    return `#${toHex((a.r + b.r) / 2)}${toHex((a.g + b.g) / 2)}${toHex((a.b + b.b) / 2)}`;
  }

  function towerSnapshot(type, fusionRecipeMap) {
    if (CONFIG.TOWERS[type]) {
      return CONFIG.TOWERS[type];
    }
    return fusionRecipeMap[type] || null;
  }

  function computeSkillFlatDamage(desc, components) {
    let bonus = 0;
    if (desc.includes('高伤害')) bonus += 1.2;
    if (desc.includes('持续伤害')) bonus += 0.5;
    if (desc.includes('扩散')) bonus += 0.3;
    if (components.includes('thunder')) bonus += 0.4;
    return bonus;
  }

  function resolveActions(components, desc) {
    const attackComponents = new Set([
      'fire', 'water', 'wood', 'gold', 'earth', 'thunder',
      'ice', 'poison', 'wind', 'light', 'dark', 'bell', 'parasite',
    ]);
    const actions = [];
    for (const component of components) {
      if (attackComponents.has(component)) actions.push(component);
    }
    if (actions.length === 0) {
      if (desc.includes('阻挡')) actions.push('arrow');
      else actions.push('wood');
    }
    return actions;
  }

  function resolveAuras(components) {
    const extraAuras = [];
    for (const component of components) {
      if (component === 'drum') extraAuras.push({ type: 'attackSpeed', value: 0.2 });
      if (component === 'banner') extraAuras.push({ type: 'range', value: 0.2 });
      if (component === 'mirror') extraAuras.push({ type: 'reflect', value: 1.5 });
    }
    return extraAuras;
  }

  function buildRecipe(definition, tier, fusionRecipeMap, options) {
    const { isEvolution, evolutionFrom, evolutionBase } = options || {};
    const c1 = towerSnapshot(definition.components[0], fusionRecipeMap);
    const c2 = towerSnapshot(definition.components[1], fusionRecipeMap);
    if (!c1 || !c2) return null;

    const c1Cost = c1.cost || 0;
    const c2Cost = c2.cost || 0;
    const c1Damage = c1.damage || 0;
    const c2Damage = c2.damage || 0;
    const c1Range = c1.range || 0;
    const c2Range = c2.range || 0;
    const c1Cooldown = c1.cooldown || 1000;
    const c2Cooldown = c2.cooldown || 1000;
    const c1Hp = c1.hp || 0;
    const c2Hp = c2.hp || 0;

    const skillFlatDamage = computeSkillFlatDamage(definition.desc, definition.components);
    const onPath = definition.components.some((type) => {
      if (PATH_COMPONENTS.has(type)) return true;
      const snap = towerSnapshot(type, fusionRecipeMap);
      return !!snap?.onPath;
    });

    let cost = Math.round((c1Cost + c2Cost) * 0.92);
    if (isEvolution) {
      cost = Math.round(cost * 1.20);
    }

    const damage = round1((c1Damage + c2Damage) * 0.88 + skillFlatDamage);
    const cooldown = clamp(Math.round(Math.min(c1Cooldown, c2Cooldown) * 0.92), 300, 2600);
    const range = onPath ? round1(Math.max(c1Range, c2Range)) : round1(Math.max(c1Range, c2Range) + 0.4);
    const hp = onPath ? Math.round(c1Hp + c2Hp + 8) : 0;

    const color1 = CONFIG.COLORS[definition.components[0]] || CONFIG.COLORS.tower;
    const color2 = CONFIG.COLORS[definition.components[1]] || CONFIG.COLORS.tower;
    const actions = resolveActions(definition.components, definition.desc);
    const extraAuras = resolveAuras(definition.components);
    const passive = definition.desc.includes('增益') || definition.desc.includes('双增益');

    const recipe = {
      char: definition.name,
      components: definition.components.slice(),
      cost,
      damage,
      range,
      cooldown: passive ? 999999 : cooldown,
      onPath,
      hp: onPath ? hp : undefined,
      desc: definition.desc,
      color: mixHex(color1, color2),
      skillId: `fusion_${definition.key.replace(/\+/g, '_')}`,
      skillParams: {
        actions,
        damageMultiplier: tier >= 2 ? 1.25 : 1,
        extraAuras,
        passive,
      },
      tier,
      isEvolution: !!isEvolution,
      evolutionFrom: evolutionFrom || null,
      evolutionBase: evolutionBase || null,
    };

    if (extraAuras.length > 0) {
      recipe.aura = true;
      recipe.auraRange = Math.max(2, range || 0);
      recipe.auraType = extraAuras[0].type;
      recipe.auraValue = extraAuras[0].value;
      recipe.extraAuras = extraAuras.slice(1);
    }

    return recipe;
  }

  const fusionRecipeMap = {};
  for (const design of BASE_FUSION_DESIGNS) {
    const recipe = buildRecipe(design, 1, fusionRecipeMap, { isEvolution: false });
    if (recipe) {
      fusionRecipeMap[design.key] = recipe;
    }
  }

  const evolutionWhitelist = {};
  for (const evo of EVOLUTION_DESIGNS) {
    const key = normalizeKey(evo.from, evo.base);
    const source = fusionRecipeMap[evo.from];
    const baseTower = CONFIG.TOWERS[evo.base];
    if (!source || !baseTower) continue;

    const evolved = buildRecipe({
      key,
      name: evo.char,
      desc: evo.desc,
      components: [evo.from, evo.base],
    }, 2, fusionRecipeMap, {
      isEvolution: true,
      evolutionFrom: evo.from,
      evolutionBase: evo.base,
    });

    if (evolved) {
      evolved.skillId = `fusion_evo_${evo.from.replace(/\+/g, '_')}_${evo.base}`;
      evolved.skillParams.actions = Array.from(new Set([
        ...(source.skillParams?.actions || []),
        evo.base,
      ]));
      evolved.skillParams.repeat = 2;
      fusionRecipeMap[key] = evolved;
      evolutionWhitelist[key] = {
        from: evo.from,
        base: evo.base,
      };
    }
  }

  CONFIG.FUSION_TOWERS = fusionRecipeMap;
  CONFIG.FUSION_EVOLUTION_RECIPES = evolutionWhitelist;
})();
