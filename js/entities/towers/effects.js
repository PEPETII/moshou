// Tower：受击（仅路径塔有血量，属于敌人侧基础设施）
//
// 2026-10-20 清理：光环、召唤、影复制、轮扫射与各类特效数组随 32 座下架塔一并删除。
// 现役四塔是字形塔，血量 0，不会走到这里；保留本方法是因为敌人死亡爆炸与波次结算
// 仍会对 towers 里的塔调用 takeDamage（见 js/core/waves.js、js/entities/enemy/combat.js）。
Tower.prototype.takeDamage = function(amount) {
    this.hp -= amount;
    this.triggerShake();
    return this.hp <= 0;
};
