/**
 * Fluid heatmap size control — decide which tiles remain readable and which
 * "leave" (rolled into an Other bucket or hidden by pixel area).
 *
 * Two layers:
 *  1. Data prune  — relative share of parent + max leaf count (membership)
 *  2. Render thresholds — ECharts visibleMin / label min size (pixels)
 */

/** @typedef {{ id: string, label: string, desc: string, visibleMin: number, childrenVisibleMin: number, labelMinWidth: number, labelMinHeight: number, minShareOfParent: number, minKeepPerParent: number, maxLeavesPerParent: number }} DensityPreset */

/** @type {Record<string, DensityPreset>} */
export const DENSITY_PRESETS = {
  dense: {
    id: 'dense',
    label: 'Dense',
    desc: 'Keep more small names; busier map',
    visibleMin: 20,
    childrenVisibleMin: 56,
    labelMinWidth: 34,
    labelMinHeight: 14,
    minShareOfParent: 0.0006, // 0.06% of parent
    minKeepPerParent: 10,
    maxLeavesPerParent: 80,
  },
  auto: {
    id: 'auto',
    label: 'Auto',
    desc: 'Balance coverage and readability (default)',
    visibleMin: 56,
    childrenVisibleMin: 140,
    labelMinWidth: 44,
    labelMinHeight: 16,
    minShareOfParent: 0.0015, // 0.15% of parent
    minKeepPerParent: 6,
    maxLeavesPerParent: 40,
  },
  sparse: {
    id: 'sparse',
    label: 'Sparse',
    desc: 'Only large names; cleaner map',
    visibleMin: 100,
    childrenVisibleMin: 240,
    labelMinWidth: 52,
    labelMinHeight: 18,
    minShareOfParent: 0.004, // 0.4% of parent
    minKeepPerParent: 4,
    maxLeavesPerParent: 18,
  },
};

export function getDensityPreset(id) {
  return DENSITY_PRESETS[id] || DENSITY_PRESETS.auto;
}

function leafSize(node) {
  const v = Number(node?.metricValue ?? node?.adjustedValue ?? node?.value ?? node?.marketCap ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Prune direct children of one parent: keep large leaves, roll the rest into Other.
 * Recursive groups (regions / sectors) are processed depth-first first.
 *
 * @param {object[]} children
 * @param {DensityPreset} preset
 * @returns {{ children: object[], stats: { kept: number, rolled: number } }}
 */
export function pruneChildren(children, preset) {
  if (!Array.isArray(children) || children.length === 0) {
    return { children: [], stats: { kept: 0, rolled: 0 } };
  }

  // Recurse into group nodes first (regions → sectors → leaves)
  let rolledDeep = 0;
  let keptDeep = 0;
  const processed = children.map((child) => {
    if (child?.children?.length) {
      const inner = pruneChildren(child.children, preset);
      rolledDeep += inner.stats.rolled;
      keptDeep += inner.stats.kept;
      return { ...child, children: inner.children };
    }
    return child;
  });

  const leaves = processed.filter((c) => !c?.children?.length);
  const groups = processed.filter((c) => c?.children?.length);

  if (leaves.length === 0) {
    return {
      children: groups,
      stats: { kept: keptDeep, rolled: rolledDeep },
    };
  }

  const total = leaves.reduce((s, n) => s + leafSize(n), 0) || 1;
  const sorted = [...leaves].sort((a, b) => leafSize(b) - leafSize(a));

  const keep = [];
  const roll = [];

  sorted.forEach((node, idx) => {
    const share = leafSize(node) / total;
    const withinMax = keep.length < preset.maxLeavesPerParent;
    const forcedKeep = idx < preset.minKeepPerParent;
    const bigEnough = share >= preset.minShareOfParent;

    if (withinMax && (forcedKeep || bigEnough)) {
      keep.push(node);
    } else {
      roll.push(node);
    }
  });

  // If everything would roll, keep the largest minKeep
  if (keep.length === 0 && sorted.length) {
    keep.push(...sorted.slice(0, Math.min(preset.minKeepPerParent, sorted.length)));
    roll.length = 0;
    roll.push(...sorted.slice(keep.length));
  }

  const out = [...groups, ...keep];
  if (roll.length > 0) {
    const rollSum = roll.reduce((s, n) => s + leafSize(n), 0);
    out.push({
      name: `Other (${roll.length})`,
      fullName: `${roll.length} smaller names under size threshold`,
      value: Math.max(rollSum, 0.01),
      marketCap: rollSum,
      metricValue: rollSum,
      adjustedValue: rollSum,
      sector: 'Other',
      isOtherBucket: true,
      otherTickers: roll.map((n) => n.name || n.ticker).filter(Boolean),
      itemStyle: {
        color: 'rgba(100, 116, 139, 0.55)',
        borderColor: '#475569',
        borderWidth: 1,
        borderType: 'dashed',
      },
    });
  }

  return {
    children: out,
    stats: {
      kept: keptDeep + keep.length,
      rolled: rolledDeep + roll.length,
    },
  };
}

/**
 * Apply size control across a forest of region/sector roots.
 * @param {object[]} tree
 * @param {DensityPreset|string} presetOrId
 */
export function applySizeControlToTree(tree, presetOrId = 'auto') {
  const preset = typeof presetOrId === 'string' ? getDensityPreset(presetOrId) : presetOrId;
  if (!Array.isArray(tree)) {
    return { tree: [], stats: { kept: 0, rolled: 0, shown: 0, totalLeaves: 0 } };
  }

  let kept = 0;
  let rolled = 0;
  let totalLeaves = 0;

  const countLeavesDeep = (nodes) => {
    let n = 0;
    for (const node of nodes || []) {
      if (node?.children?.length) n += countLeavesDeep(node.children);
      else if (!node?.isOtherBucket) n += 1;
    }
    return n;
  };
  totalLeaves = countLeavesDeep(tree);

  const next = tree.map((root) => {
    if (!root?.children?.length) return root;
    const { children, stats } = pruneChildren(root.children, preset);
    kept += stats.kept;
    rolled += stats.rolled;
    const value = children.reduce((s, c) => {
      if (c.children?.length) {
        return s + c.children.reduce((ss, cc) => ss + leafSize(cc), 0);
      }
      return s + leafSize(c);
    }, 0);
    return {
      ...root,
      children,
      value: value || root.value,
    };
  });

  const shown = countLeavesDeep(next);
  return {
    tree: next,
    stats: { kept, rolled, shown, totalLeaves, preset: preset.id },
  };
}

/**
 * ECharts treemap level config driven by density preset.
 */
export function buildTreemapLevels(groupBy, preset) {
  const p = typeof preset === 'string' ? getDensityPreset(preset) : preset;
  const leaf = {
    visibleMin: p.visibleMin,
    itemStyle: { borderWidth: 1, gapWidth: 1 },
    label: { show: true },
  };
  const mid = {
    visibleMin: Math.max(p.visibleMin, 8),
    itemStyle: { borderWidth: 2, gapWidth: 2 },
    upperLabel: { show: true, height: 20, fontSize: 10 },
  };
  const root = {
    visibleMin: Math.max(p.visibleMin, 8),
    itemStyle: { borderWidth: 3, gapWidth: 3 },
    upperLabel: { show: true },
  };

  if (groupBy === 'sectorInMarket') return [root, mid, leaf];
  if (groupBy === 'sectorGlobal') return [root, leaf];
  return [root, leaf];
}
