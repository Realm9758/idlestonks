export interface TenantDef {
  id: string;
  name: string;
  emoji: string;
  reliability: number; // 0–1 chance of paying rent each day
}

export const TENANTS: Record<string, TenantDef> = {
  student:   { id: 'student',   name: 'Student',            emoji: '🎓', reliability: 0.75 },
  young_pro: { id: 'young_pro', name: 'Young Professional', emoji: '💼', reliability: 0.90 },
  startup:   { id: 'startup',   name: 'Startup Founder',    emoji: '🚀', reliability: 0.70 },
  celebrity: { id: 'celebrity', name: 'Celebrity',          emoji: '⭐', reliability: 0.50 },
  corporate: { id: 'corporate', name: 'Corporate Tenant',   emoji: '🏦', reliability: 0.92 },
};

export interface PropertyConfig {
  id: string;
  name: string;
  emoji: string;
  value: number;
  rentPerDay: number;
  upkeepPerDay: number;
  tenantId: string;
  description: string;
  upgradeMax: number;
  upgradeRentBonus: number;
  upgradeReliabilityBonus: number;
}

export const PROPERTY_CATALOG: PropertyConfig[] = [
  {
    id: 'studio_apt',
    name: 'Studio Apartment',
    emoji: '🏠',
    value: 5_000,
    rentPerDay: 35,
    upkeepPerDay: 8,
    tenantId: 'student',
    description: 'A cozy student rental. Reliable enough... most of the time.',
    upgradeMax: 3,
    upgradeRentBonus: 10,
    upgradeReliabilityBonus: 0.05,
  },
  {
    id: 'city_apt',
    name: 'City Apartment',
    emoji: '🏢',
    value: 18_000,
    rentPerDay: 90,
    upkeepPerDay: 18,
    tenantId: 'young_pro',
    description: 'Central location attracts reliable professionals.',
    upgradeMax: 3,
    upgradeRentBonus: 25,
    upgradeReliabilityBonus: 0.03,
  },
  {
    id: 'suburban_house',
    name: 'Suburban House',
    emoji: '🏡',
    value: 50_000,
    rentPerDay: 150,
    upkeepPerDay: 30,
    tenantId: 'startup',
    description: 'A startup founder uses it as a live-work space.',
    upgradeMax: 3,
    upgradeRentBonus: 40,
    upgradeReliabilityBonus: 0.07,
  },
  {
    id: 'downtown_office',
    name: 'Downtown Office',
    emoji: '🏦',
    value: 120_000,
    rentPerDay: 320,
    upkeepPerDay: 65,
    tenantId: 'corporate',
    description: 'Prime real estate. Corporate tenants pay reliably.',
    upgradeMax: 3,
    upgradeRentBonus: 80,
    upgradeReliabilityBonus: 0.02,
  },
  {
    id: 'luxury_villa',
    name: 'Luxury Villa',
    emoji: '🏰',
    value: 300_000,
    rentPerDay: 500,
    upkeepPerDay: 100,
    tenantId: 'celebrity',
    description: 'Your celebrity tenant pays huge rent... when they remember.',
    upgradeMax: 3,
    upgradeRentBonus: 120,
    upgradeReliabilityBonus: 0.10,
  },
  {
    id: 'commercial_tower',
    name: 'Commercial Tower',
    emoji: '🗼',
    value: 750_000,
    rentPerDay: 1_200,
    upkeepPerDay: 250,
    tenantId: 'corporate',
    description: 'A full commercial building. Maximum passive income.',
    upgradeMax: 3,
    upgradeRentBonus: 300,
    upgradeReliabilityBonus: 0.01,
  },
];

export interface OwnedProperty {
  configId: string;
  upgradeLevel: number;
  missedRentStreak: number;
}

export interface PropertyEvent {
  propertyName: string;
  emoji: string;
  message: string;
  type: 'income' | 'expense' | 'info';
}

export interface PropertyDayResult {
  income: number;
  events: PropertyEvent[];
}

export class PropertySystem {
  private owned: OwnedProperty[] = [];

  get properties(): OwnedProperty[] { return this.owned; }

  canBuy(configId: string): boolean {
    return !this.owned.some(p => p.configId === configId);
  }

  buy(configId: string, playerCash: number): { success: boolean; cost: number; message: string } {
    const config = PROPERTY_CATALOG.find(p => p.id === configId);
    if (!config) return { success: false, cost: 0, message: 'Property not found.' };
    if (!this.canBuy(configId)) return { success: false, cost: 0, message: `You already own ${config.name}.` };
    if (playerCash < config.value) {
      return { success: false, cost: 0, message: `Need $${config.value.toLocaleString()} to buy ${config.name}.` };
    }
    this.owned.push({ configId, upgradeLevel: 0, missedRentStreak: 0 });
    const netPerDay = config.rentPerDay - config.upkeepPerDay;
    return { success: true, cost: config.value, message: `🏠 Purchased ${config.name}! +$${netPerDay}/day net income.` };
  }

  getUpgradeCost(configId: string, currentLevel: number): number {
    const config = PROPERTY_CATALOG.find(p => p.id === configId);
    if (!config) return Infinity;
    return Math.round(config.value * 0.25 * (currentLevel + 1));
  }

  upgrade(configId: string, playerCash: number): { success: boolean; cost: number; message: string } {
    const op = this.owned.find(p => p.configId === configId);
    const config = PROPERTY_CATALOG.find(p => p.id === configId);
    if (!op || !config) return { success: false, cost: 0, message: 'Property not owned.' };
    if (op.upgradeLevel >= config.upgradeMax) return { success: false, cost: 0, message: 'Already at max level.' };
    const cost = this.getUpgradeCost(configId, op.upgradeLevel);
    if (playerCash < cost) return { success: false, cost: 0, message: `Need $${cost.toLocaleString()} to upgrade.` };
    op.upgradeLevel++;
    const newRent = this.getEffectiveRent(config, op);
    return { success: true, cost, message: `⬆️ ${config.name} upgraded to Lv.${op.upgradeLevel}! Rent now $${newRent}/day.` };
  }

  getEffectiveRent(config: PropertyConfig, op: OwnedProperty): number {
    return config.rentPerDay + config.upgradeRentBonus * op.upgradeLevel;
  }

  getEffectiveReliability(config: PropertyConfig, op: OwnedProperty): number {
    const tenant = TENANTS[config.tenantId];
    return Math.min(0.99, tenant.reliability + config.upgradeReliabilityBonus * op.upgradeLevel);
  }

  dayTick(): PropertyDayResult {
    let totalIncome = 0;
    const events: PropertyEvent[] = [];

    for (const op of this.owned) {
      const config = PROPERTY_CATALOG.find(p => p.id === op.configId);
      if (!config) continue;

      const rent = this.getEffectiveRent(config, op);
      const upkeep = config.upkeepPerDay;
      const reliability = this.getEffectiveReliability(config, op);
      const roll = Math.random();

      if (roll < 0.03) {
        // Urgent repair
        const repairCost = Math.round(upkeep * 3);
        totalIncome -= repairCost;
        events.push({
          propertyName: config.name, emoji: config.emoji,
          message: `${config.emoji} ${config.name}: Urgent repair! -$${repairCost.toLocaleString()} emergency cost`,
          type: 'expense',
        });
      } else if (roll < 0.06) {
        // Rent bonus event
        const bonus = Math.round(rent * 0.1);
        totalIncome += rent + bonus - upkeep;
        events.push({
          propertyName: config.name, emoji: config.emoji,
          message: `${config.emoji} ${config.name}: Tenant agreed to +10% rent! +$${(rent + bonus - upkeep).toLocaleString()} today`,
          type: 'income',
        });
      } else {
        // Normal: roll reliability
        if (Math.random() < reliability) {
          op.missedRentStreak = 0;
          totalIncome += rent - upkeep;
        } else {
          op.missedRentStreak++;
          totalIncome -= upkeep;
          events.push({
            propertyName: config.name, emoji: config.emoji,
            message: `${config.emoji} ${config.name}: Tenant missed rent! Only paid upkeep (-$${upkeep}/day)`,
            type: 'expense',
          });
        }
      }
    }

    return { income: Math.round(totalIncome), events };
  }

  getTotalDailyNet(): number {
    let total = 0;
    for (const op of this.owned) {
      const config = PROPERTY_CATALOG.find(p => p.id === op.configId);
      if (!config) continue;
      const tenant = TENANTS[config.tenantId];
      const reliability = this.getEffectiveReliability(config, op);
      total += (this.getEffectiveRent(config, op) - config.upkeepPerDay) * reliability;
    }
    return Math.round(total);
  }

  saveState(): OwnedProperty[] {
    return this.owned.map(p => ({ ...p }));
  }

  loadState(data: unknown): void {
    if (!Array.isArray(data)) return;
    this.owned = (data as OwnedProperty[]).filter(p =>
      typeof p.configId === 'string' &&
      PROPERTY_CATALOG.some(c => c.id === p.configId)
    ).map(p => ({
      configId: p.configId,
      upgradeLevel: p.upgradeLevel ?? 0,
      missedRentStreak: p.missedRentStreak ?? 0,
    }));
  }
}
