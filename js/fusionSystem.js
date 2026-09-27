class FusionSystem {
  constructor() {
    this._recipes = new Map();
    this._componentIndex = new Map();
    this._fusionGraph = new Map();
    this._previewCache = new Map();
    this._validators = [];
    this._dirty = true;
  }

  register(key, recipe) {
    const normalizedKey = this._normalizeKey(key);
    this._recipes.set(normalizedKey, recipe);

    const components = recipe.components || this._parseComponents(key);
    for (const comp of components) {
      if (!this._componentIndex.has(comp)) {
        this._componentIndex.set(comp, []);
      }
      this._componentIndex.get(comp).push(normalizedKey);
    }

    this._dirty = true;
    this._previewCache.clear();
  }

  registerBatch(recipes) {
    for (const [key, recipe] of Object.entries(recipes)) {
      this.register(key, recipe);
    }
  }

  addValidator(validator) {
    this._validators.push(validator);
  }

  canFuse(type1, type2, context) {
    const key = this._makeKey(type1, type2);
    const recipe = this._recipes.get(key);
    if (!recipe) return { canFuse: false, reason: 'no_recipe' };

    for (const validator of this._validators) {
      const result = validator(recipe, context);
      if (!result.valid) {
        return { canFuse: false, reason: result.reason };
      }
    }

    return { canFuse: true, recipe, key };
  }

  getFusionType(type1, type2) {
    const key = this._makeKey(type1, type2);
    return this._recipes.has(key) ? key : null;
  }

  getRecipe(key) {
    return this._recipes.get(this._normalizeKey(key));
  }

  getPreview(type1, type2, ink) {
    const cacheKey = `${type1}|${type2}|${ink}`;
    if (this._previewCache.has(cacheKey)) {
      return this._previewCache.get(cacheKey);
    }

    const key = this._makeKey(type1, type2);
    const recipe = this._recipes.get(key);

    if (!recipe) {
      this._previewCache.set(cacheKey, null);
      return null;
    }

    const preview = {
      type: key,
      char: recipe.char,
      cost: recipe.cost,
      desc: recipe.desc,
      canAfford: ink >= recipe.cost,
      color: recipe.color,
      components: recipe.components,
      tier: recipe.tier || 1,
      skillId: recipe.skillId || '',
      isEvolution: !!recipe.isEvolution,
      evolutionFrom: recipe.evolutionFrom || null,
      onPath: !!recipe.onPath,
    };

    this._previewCache.set(cacheKey, preview);
    return preview;
  }

  getFusionsForType(type) {
    this._ensureGraph();
    return this._fusionGraph.get(type) || [];
  }

  getAllRecipes() {
    return Array.from(this._recipes.entries()).map(([key, recipe]) => ({
      key,
      ...recipe
    }));
  }

  getComponentTypes() {
    this._ensureGraph();
    return Array.from(this._componentIndex.keys());
  }

  clearCache() {
    this._previewCache.clear();
  }

  _makeKey(type1, type2) {
    return [type1, type2].sort().join('+');
  }

  _normalizeKey(key) {
    const parts = key.split('+');
    if (parts.length === 2) {
      return [parts[0], parts[1]].sort().join('+');
    }
    return key;
  }

  _parseComponents(key) {
    return key.split('+');
  }

  _ensureGraph() {
    if (!this._dirty) return;

    this._fusionGraph.clear();

    for (const [key, recipe] of this._recipes.entries()) {
      const components = recipe.components || this._parseComponents(key);
      for (const comp of components) {
        if (!this._fusionGraph.has(comp)) {
          this._fusionGraph.set(comp, []);
        }
        this._fusionGraph.get(comp).push({
          fusionKey: key,
          partner: components.find(c => c !== comp) || components[0],
          recipe: recipe
        });
      }
    }

    this._dirty = false;
  }
}

const fusionSystem = new FusionSystem();

fusionSystem.registerBatch(CONFIG.FUSION_TOWERS);

// 验证器 1: 墨水验证（最快，优先执行）
fusionSystem.addValidator((recipe, context) => {
  if (!context || context.ink === undefined) return { valid: true };
  if (context.ink < recipe.cost) {
    return { valid: false, reason: 'insufficient_ink' };
  }
  return { valid: true };
});

// 验证器 2: 路径位置验证（中等复杂度）
fusionSystem.addValidator((recipe, context) => {
  if (!context || !recipe.onPath) return { valid: true };
  if (!context.path) return { valid: true };

  const paths = Array.isArray(context.path[0]) ? context.path : [context.path];
  let hasValidPosition = false;

  const onPathTower = context.tower1?.onPath ? context.tower1 :
                      context.tower2?.onPath ? context.tower2 : null;
  if (!onPathTower) {
    return { valid: false, reason: 'on_path_anchor_missing' };
  }

  for (const p of paths) {
    for (const point of p) {
      if (onPathTower.gx === point.x && onPathTower.gy === point.y) {
        hasValidPosition = true;
        break;
      }
    }
    if (hasValidPosition) break;
  }

  return hasValidPosition ? { valid: true } : { valid: false, reason: 'on_path_not_on_road' };
});

// 验证器 3: 进化合法性验证（最复杂，最后执行）
fusionSystem.addValidator((recipe, context) => {
  if (!context) return { valid: true };

  const tower1Fusion = !!context.tower1?.isFusion;
  const tower2Fusion = !!context.tower2?.isFusion;
  if (!tower1Fusion && !tower2Fusion) return { valid: true };

  // 只允许命中白名单的二阶段进化
  if (!recipe?.isEvolution) {
    return { valid: false, reason: 'already_fused' };
  }

  // 二阶段仅允许"一个融合塔 + 一个基础塔"，且匹配 from/base
  if (tower1Fusion && tower2Fusion) {
    return { valid: false, reason: 'double_fusion_forbidden' };
  }

  const types = [context.tower1?.type, context.tower2?.type];
  const hasFrom = types.includes(recipe.evolutionFrom);
  const hasBase = types.includes(recipe.evolutionBase);
  if (!hasFrom || !hasBase) {
    return { valid: false, reason: 'invalid_evolution_pair' };
  }

  return { valid: true };
});
