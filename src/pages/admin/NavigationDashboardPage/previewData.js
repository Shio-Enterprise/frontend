const camiseta = '11111111-1111-4111-8111-111111111111';
const bone = '22222222-2222-4222-8222-222222222222';
const calca = '33333333-3333-4333-8333-333333333333';

export const previewProducts = [
  { id: camiseta, name: 'Camiseta Preta' },
  { id: bone, name: 'Boné' },
  { id: calca, name: 'Calça Reta' },
];

export const previewAccounts = [
  { id: 7, email: 'joao@shio.com' },
  { id: 8, email: 'maria@shio.com' },
  { id: 11, email: 'ana@shio.com' },
];

const octoberInterest = [
  {
    product_id: camiseta,
    name: 'Camiseta Preta',
    accounts: 3,
    anonymous: 2,
    users: [
      { id: 11, email: 'ana@shio.com', interest: 'PURCHASE' },
      { id: 7, email: 'joao@shio.com', interest: 'ADD_TO_CART' },
      { id: 8, email: 'maria@shio.com', interest: 'REMOVE_FROM_CART' },
    ],
  },
  {
    product_id: bone,
    name: 'Boné',
    accounts: 2,
    anonymous: 1,
    users: [
      { id: 11, email: 'ana@shio.com', interest: 'CHECKOUT_STARTED' },
      { id: 7, email: 'joao@shio.com', interest: 'PRODUCT_VIEW' },
    ],
  },
];

const userProducts = {
  7: [
    {
      product_id: camiseta,
      name: 'Camiseta Preta',
      views: 4,
      added_to_cart: 1,
      removed_from_cart: 0,
      checkouts: 0,
      purchases: 0,
      last_access: '2026-10-06T15:04:00Z',
    },
    {
      product_id: bone,
      name: 'Boné',
      views: 2,
      added_to_cart: 0,
      removed_from_cart: 0,
      checkouts: 0,
      purchases: 0,
      last_access: '2026-10-05T18:10:00Z',
    },
  ],
  8: [
    {
      product_id: camiseta,
      name: 'Camiseta Preta',
      views: 1,
      added_to_cart: 0,
      removed_from_cart: 1,
      checkouts: 0,
      purchases: 0,
      last_access: '2026-10-05T17:22:00Z',
    },
  ],
  11: [
    {
      product_id: camiseta,
      name: 'Camiseta Preta',
      views: 3,
      added_to_cart: 1,
      removed_from_cart: 0,
      checkouts: 1,
      purchases: 1,
      last_access: '2026-10-06T16:40:00Z',
    },
    {
      product_id: bone,
      name: 'Boné',
      views: 2,
      added_to_cart: 1,
      removed_from_cart: 0,
      checkouts: 1,
      purchases: 0,
      last_access: '2026-10-03T11:05:00Z',
    },
  ],
};

const accesses = {
  [camiseta]: {
    product_id: camiseta,
    name: 'Camiseta Preta',
    count: 5,
    totals: {
      PRODUCT_VIEW: 2,
      ADD_TO_CART: 1,
      REMOVE_FROM_CART: 1,
      CHECKOUT_STARTED: 0,
      PURCHASE: 1,
    },
    accesses: [
      {
        id: 'a-1',
        event_type: 'PURCHASE',
        occurred_at: '2026-10-06T16:40:00Z',
        path: '/checkout/sucesso',
        email: 'ana@shio.com',
        variation: 'M / Preto',
      },
      {
        id: 'a-5',
        event_type: 'REMOVE_FROM_CART',
        occurred_at: '2026-10-05T17:22:00Z',
        path: '/carrinho',
        email: 'maria@shio.com',
        variation: 'M / Preto',
      },
      {
        id: 'a-2',
        event_type: 'ADD_TO_CART',
        occurred_at: '2026-10-06T15:04:00Z',
        path: '/produto/camiseta-preta',
        email: 'joao@shio.com',
        variation: 'G / Preto',
      },
      {
        id: 'a-3',
        event_type: 'PRODUCT_VIEW',
        occurred_at: '2026-10-04T13:20:00Z',
        path: '/produto/camiseta-preta',
        email: 'maria@shio.com',
        variation: 'M / Preto',
      },
      {
        id: 'a-4',
        event_type: 'PRODUCT_VIEW',
        occurred_at: '2026-10-02T19:12:00Z',
        path: '/produto/camiseta-preta',
        email: null,
        variation: 'P / Preto',
      },
    ],
  },
  [bone]: {
    product_id: bone,
    name: 'Boné',
    count: 2,
    totals: {
      PRODUCT_VIEW: 1,
      ADD_TO_CART: 0,
      REMOVE_FROM_CART: 0,
      CHECKOUT_STARTED: 1,
      PURCHASE: 0,
    },
    accesses: [
      {
        id: 'b-1',
        event_type: 'CHECKOUT_STARTED',
        occurred_at: '2026-10-03T11:05:00Z',
        path: '/checkout',
        email: 'ana@shio.com',
        variation: 'Único / Preto',
      },
      {
        id: 'b-2',
        event_type: 'PRODUCT_VIEW',
        occurred_at: '2026-10-05T18:10:00Z',
        path: '/produto/bone',
        email: 'joao@shio.com',
        variation: 'Único / Preto',
      },
    ],
  },
  [calca]: {
    product_id: calca,
    name: 'Calça Reta',
    count: 1,
    totals: {
      PRODUCT_VIEW: 1,
      ADD_TO_CART: 0,
      REMOVE_FROM_CART: 0,
      CHECKOUT_STARTED: 0,
      PURCHASE: 0,
    },
    accesses: [
      {
        id: 'c-1',
        event_type: 'PRODUCT_VIEW',
        occurred_at: '2026-10-01T10:00:00Z',
        path: '/produto/calca-reta',
        email: 'maria@shio.com',
        variation: '38 / Areia',
      },
    ],
  },
};

const septemberInterest = [
  {
    product_id: bone,
    name: 'Boné',
    accounts: 2,
    anonymous: 1,
    users: [
      { id: 7, email: 'joao@shio.com', interest: 'REMOVE_FROM_CART' },
      { id: 11, email: 'ana@shio.com', interest: 'PRODUCT_VIEW' },
    ],
  },
  {
    product_id: calca,
    name: 'Calça Reta',
    accounts: 1,
    anonymous: 0,
    users: [
      { id: 8, email: 'maria@shio.com', interest: 'ADD_TO_CART' },
    ],
  },
];

const septemberUserProducts = {
  7: [
    {
      product_id: bone,
      name: 'Boné',
      views: 1,
      added_to_cart: 1,
      removed_from_cart: 1,
      checkouts: 0,
      purchases: 0,
      last_access: '2026-09-14T16:30:00Z',
    },
  ],
  8: [
    {
      product_id: calca,
      name: 'Calça Reta',
      views: 2,
      added_to_cart: 1,
      removed_from_cart: 0,
      checkouts: 0,
      purchases: 0,
      last_access: '2026-09-21T12:15:00Z',
    },
  ],
  11: [
    {
      product_id: bone,
      name: 'Boné',
      views: 1,
      added_to_cart: 0,
      removed_from_cart: 0,
      checkouts: 0,
      purchases: 0,
      last_access: '2026-09-08T19:40:00Z',
    },
  ],
};

const septemberAccesses = {
  [bone]: {
    product_id: bone,
    name: 'Boné',
    count: 2,
    totals: {
      PRODUCT_VIEW: 1,
      ADD_TO_CART: 0,
      REMOVE_FROM_CART: 1,
      CHECKOUT_STARTED: 0,
      PURCHASE: 0,
    },
    accesses: [
      {
        id: 's-b-1',
        event_type: 'REMOVE_FROM_CART',
        occurred_at: '2026-09-14T16:30:00Z',
        path: '/carrinho',
        email: 'joao@shio.com',
        variation: 'Único / Preto',
      },
      {
        id: 's-b-2',
        event_type: 'PRODUCT_VIEW',
        occurred_at: '2026-09-08T19:40:00Z',
        path: '/produto/bone',
        email: 'ana@shio.com',
        variation: 'Único / Preto',
      },
    ],
  },
  [calca]: {
    product_id: calca,
    name: 'Calça Reta',
    count: 1,
    totals: {
      PRODUCT_VIEW: 0,
      ADD_TO_CART: 1,
      REMOVE_FROM_CART: 0,
      CHECKOUT_STARTED: 0,
      PURCHASE: 0,
    },
    accesses: [
      {
        id: 's-c-1',
        event_type: 'ADD_TO_CART',
        occurred_at: '2026-09-21T12:15:00Z',
        path: '/produto/calca-reta',
        email: 'maria@shio.com',
        variation: '38 / Areia',
      },
    ],
  },
};

const octoberOverview = {
  visitors: { registered: 4, anonymous: 9 },
  events_by_type: {
    PAGE_VIEW: 20,
    PRODUCT_VIEW: 8,
    ADD_TO_CART: 3,
    REMOVE_FROM_CART: 1,
    CHECKOUT_STARTED: 2,
    PURCHASE: 1,
  },
  series: [
    { date: '2026-10-04', total: 3 },
    { date: '2026-10-05', total: 2 },
    { date: '2026-10-06', total: 6 },
  ],
};

const septemberOverview = {
  visitors: { registered: 3, anonymous: 5 },
  events_by_type: {
    PAGE_VIEW: 11,
    PRODUCT_VIEW: 4,
    ADD_TO_CART: 2,
    REMOVE_FROM_CART: 1,
    CHECKOUT_STARTED: 0,
    PURCHASE: 0,
  },
  series: [
    { date: '2026-09-08', total: 4 },
    { date: '2026-09-14', total: 7 },
    { date: '2026-09-21', total: 5 },
  ],
};

const INTEREST_RANK = {
  PRODUCT_VIEW: 1,
  REMOVE_FROM_CART: 2,
  ADD_TO_CART: 3,
  CHECKOUT_STARTED: 4,
  PURCHASE: 5,
};

function sliceKey(period, year, month) {
  if (year !== 2026) return 'empty';
  if (period === 'anual') return 'year';
  if (month === 10) return 'october';
  if (month === 9) return 'september';
  return 'empty';
}

function emptyOverview(period) {
  return {
    period,
    group_by: period === 'anual' ? 'month' : 'day',
    visitors: { registered: 0, anonymous: 0 },
    events_by_type: {
      PAGE_VIEW: 0,
      PRODUCT_VIEW: 0,
      ADD_TO_CART: 0,
      REMOVE_FROM_CART: 0,
      CHECKOUT_STARTED: 0,
      PURCHASE: 0,
    },
    series: [],
    top_products: [],
  };
}

function mergeInterest(lists) {
  const byProduct = new Map();
  lists.flat().forEach((product) => {
    const current = byProduct.get(product.product_id) ?? {
      product_id: product.product_id,
      name: product.name,
      accounts: 0,
      anonymous: 0,
      users: [],
    };
    current.anonymous += product.anonymous;
    product.users.forEach((user) => {
      const existing = current.users.find((item) => item.id === user.id);
      if (!existing) current.users.push({ ...user });
      else if (INTEREST_RANK[user.interest] > INTEREST_RANK[existing.interest]) existing.interest = user.interest;
    });
    current.accounts = current.users.length;
    byProduct.set(product.product_id, current);
  });
  return [...byProduct.values()].sort((left, right) => right.accounts - left.accounts || left.name.localeCompare(right.name));
}

function mergeUserProducts(lists) {
  const byProduct = new Map();
  lists.flat().forEach((product) => {
    const current = byProduct.get(product.product_id);
    if (!current) {
      byProduct.set(product.product_id, { ...product });
      return;
    }
    current.views += product.views;
    current.added_to_cart += product.added_to_cart;
    current.removed_from_cart += product.removed_from_cart;
    current.checkouts += product.checkouts;
    current.purchases += product.purchases;
    if (product.last_access > current.last_access) current.last_access = product.last_access;
  });
  return [...byProduct.values()];
}

function mergeAccess(productId, lists) {
  const pages = lists.filter(Boolean);
  if (pages.length === 0) {
    return {
      product_id: productId,
      name: 'Produto',
      count: 0,
      totals: {},
      accesses: [],
    };
  }
  const totals = {};
  const rows = [];
  pages.forEach((page) => {
    Object.entries(page.totals).forEach(([type, total]) => {
      totals[type] = (totals[type] || 0) + total;
    });
    rows.push(...page.accesses);
  });
  rows.sort((left, right) => right.occurred_at.localeCompare(left.occurred_at));
  return {
    product_id: productId,
    name: pages[0].name,
    count: rows.length,
    totals,
    accesses: rows,
  };
}

export function previewOverview(period, year, month) {
  const key = sliceKey(period, year, month);
  if (key === 'empty') return emptyOverview(period);
  if (key === 'september') {
    return { period, group_by: 'day', ...septemberOverview, top_products: [] };
  }
  if (key === 'october') {
    return { period, group_by: 'day', ...octoberOverview, top_products: [] };
  }
  return {
    period,
    group_by: 'month',
    visitors: { registered: 6, anonymous: 12 },
    events_by_type: {
      PAGE_VIEW: octoberOverview.events_by_type.PAGE_VIEW + septemberOverview.events_by_type.PAGE_VIEW,
      PRODUCT_VIEW: octoberOverview.events_by_type.PRODUCT_VIEW + septemberOverview.events_by_type.PRODUCT_VIEW,
      ADD_TO_CART: octoberOverview.events_by_type.ADD_TO_CART + septemberOverview.events_by_type.ADD_TO_CART,
      REMOVE_FROM_CART: octoberOverview.events_by_type.REMOVE_FROM_CART + septemberOverview.events_by_type.REMOVE_FROM_CART,
      CHECKOUT_STARTED: octoberOverview.events_by_type.CHECKOUT_STARTED + septemberOverview.events_by_type.CHECKOUT_STARTED,
      PURCHASE: octoberOverview.events_by_type.PURCHASE + septemberOverview.events_by_type.PURCHASE,
    },
    series: [
      { date: '2026-08-01', total: 12 },
      { date: '2026-09-01', total: 16 },
      { date: '2026-10-01', total: 11 },
    ],
    top_products: [],
  };
}

export function previewInterest(period, year, month) {
  const key = sliceKey(period, year, month);
  if (key === 'september') return septemberInterest;
  if (key === 'october') return octoberInterest;
  if (key === 'year') return mergeInterest([octoberInterest, septemberInterest]);
  return [];
}

export function previewProductAccess(productId, period, year, month) {
  const key = sliceKey(period, year, month);
  if (key === 'september') return septemberAccesses[productId] ?? mergeAccess(productId, []);
  if (key === 'october') return accesses[productId] ?? mergeAccess(productId, []);
  if (key === 'year') return mergeAccess(productId, [accesses[productId], septemberAccesses[productId]]);
  return mergeAccess(productId, []);
}

export function previewUserProducts(userId, period, year, month) {
  const key = sliceKey(period, year, month);
  if (key === 'september') return septemberUserProducts[userId] ?? [];
  if (key === 'october') return userProducts[userId] ?? [];
  if (key === 'year') return mergeUserProducts([userProducts[userId] ?? [], septemberUserProducts[userId] ?? []]);
  return [];
}
