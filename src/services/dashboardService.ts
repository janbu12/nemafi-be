import { prismaClient } from '../application/prisma.js';
import { Role } from '@prisma/client';

const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const CATEGORY_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#d97706', '#059669', '#dc2626', '#db2777', '#4f46e5', '#64748b'];

async function getAdminDashboardStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // 1. Fetch Package Categories
  const categories = await prismaClient.categoryPackage.findMany({
    include: {
      packages: true,
    },
    orderBy: { name: 'asc' },
  });

  // 2. Fetch Customers
  const customers = await prismaClient.user.findMany({
    where: { role: Role.CUSTOMER },
    include: {
      profile: true,
      packageHistory: {
        where: { endedAt: null },
        include: { package: { include: { category: true } } },
        orderBy: { startedAt: 'desc' },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { package: { include: { category: true } } } } },
      },
    },
  });

  const totalCustomers = customers.length;
  const newCustomers30d = customers.filter((c) => c.createdAt >= thirtyDaysAgo).length;

  // Active customers: has active PPP or active order / package history
  const activeCustomersList = customers.filter((c) => {
    if (c.profile && c.profile.isPppActive === false) return false;
    const hasActiveOrder = c.orders.some((o) =>
      ['COMPLETED', 'TECHNICIAN_ASSIGNED', 'INSTALLATION_IN_PROGRESS', 'REVIEW_APPROVED'].includes(o.status)
    );
    const hasPackage = c.packageHistory.length > 0;
    return hasActiveOrder || hasPackage;
  });
  const activeCustomersCount = activeCustomersList.length;

  // 3. Fetch Invoices
  const allInvoices = await prismaClient.billingInvoice.findMany({
    include: {
      user: {
        include: {
          packageHistory: {
            include: { package: { include: { category: true } } },
          },
          orders: {
            include: { items: { include: { package: { include: { category: true } } } } },
          },
        },
      },
    },
  });

  const paidInvoices = allInvoices.filter((inv) => inv.status === 'PAID');
  const unpaidInvoices = allInvoices.filter((inv) => ['UNPAID', 'OVERDUE'].includes(inv.status));
  const overdueInvoices = allInvoices.filter((inv) => inv.status === 'OVERDUE');
  const regularUnpaidInvoices = allInvoices.filter((inv) => inv.status === 'UNPAID');

  const invoicePaidRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalRevenue = invoicePaidRevenue;

  // This month revenue vs last month revenue for growth calculation
  const thisMonthPaid = paidInvoices
    .filter((inv) => inv.paidAt && inv.paidAt >= startOfThisMonth)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const lastMonthPaid = paidInvoices
    .filter((inv) => inv.paidAt && inv.paidAt >= startOfLastMonth && inv.paidAt <= endOfLastMonth)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const revenueGrowthPercentage =
    lastMonthPaid > 0
      ? Math.round(((thisMonthPaid - lastMonthPaid) / lastMonthPaid) * 100)
      : thisMonthPaid > 0
      ? 100
      : 0;

  const totalPaidAmount = invoicePaidRevenue;
  const paidCount = paidInvoices.length;

  const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const unpaidCount = unpaidInvoices.length;

  // Helper to extract customer's current package and category
  const getCustomerPackageAndCategory = (cust: (typeof customers)[0]) => {
    const pkg = cust.packageHistory[0]?.package || cust.orders[0]?.items[0]?.package;
    return {
      packageId: pkg?.id ?? null,
      packageName: pkg?.name || 'Tanpa Paket',
      categoryId: pkg?.category?.id ?? pkg?.categoryId ?? null,
      categoryName: pkg?.category?.name || 'Tanpa Kategori',
    };
  };

  // 4. Dynamic Breakdown per CategoryPackage from Database
  const categoriesBreakdown = categories.map((cat, index) => {
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

    const catCustomers = customers.filter((c) => {
      const info = getCustomerPackageAndCategory(c);
      return info.categoryId === cat.id;
    });

    const catActiveCustomers = catCustomers.filter((c) => {
      if (c.profile && c.profile.isPppActive === false) return false;
      const hasActiveOrder = c.orders.some((o) =>
        ['COMPLETED', 'TECHNICIAN_ASSIGNED', 'INSTALLATION_IN_PROGRESS', 'REVIEW_APPROVED'].includes(o.status)
      );
      const hasPackage = c.packageHistory.length > 0;
      return hasActiveOrder || hasPackage;
    });

    const catNewCustomers30d = catCustomers.filter((c) => c.createdAt >= thirtyDaysAgo).length;

    const catPaidInvoices = paidInvoices.filter((inv) => {
      const pkg = inv.user?.packageHistory?.[0]?.package || inv.user?.orders?.[0]?.items?.[0]?.package;
      return (pkg?.category?.id ?? pkg?.categoryId) === cat.id;
    });

    const catUnpaidInvoices = unpaidInvoices.filter((inv) => {
      const pkg = inv.user?.packageHistory?.[0]?.package || inv.user?.orders?.[0]?.items?.[0]?.package;
      return (pkg?.category?.id ?? pkg?.categoryId) === cat.id;
    });

    const catRevenue = catPaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const catUnpaidAmount = catUnpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return {
      id: cat.id,
      name: cat.name,
      color,
      packageCount: cat.packages.length,
      packages: cat.packages.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        downloadSpeed: p.downloadSpeed,
        uploadSpeed: p.uploadSpeed,
        isPopular: p.isPopular,
      })),
      totalCustomers: catCustomers.length,
      activeCustomers: catActiveCustomers.length,
      newCustomers30d: catNewCustomers30d,
      revenue: catRevenue,
      paidInvoices: {
        amount: catRevenue,
        count: catPaidInvoices.length,
      },
      unpaidInvoices: {
        amount: catUnpaidAmount,
        count: catUnpaidInvoices.length,
      },
    };
  });

  // 5. Recent Signups (from latest Orders)
  const recentOrders = await prismaClient.order.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { include: { profile: true } },
      items: { include: { package: { include: { category: true } } } },
    },
  });

  const recentSignups = recentOrders.map((order) => {
    const pkg = order.items?.[0]?.package;
    return {
      id: order.id,
      customer: order.user?.fullname || 'Pelanggan',
      email: order.user?.email || '',
      phone: order.user?.profile?.phone_number || '',
      plan: pkg?.name || 'Paket Internet',
      categoryId: pkg?.category?.id ?? pkg?.categoryId ?? null,
      category: pkg?.category?.name || 'Umum',
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
    };
  });

  // 6. Customer Locations (for Interactive Map)
  const customerLocations = customers
    .filter((c) => {
      if (!c.profile) return false;
      const lat = Number(c.profile.latitude);
      const lng = Number(c.profile.longitude);
      return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng) &&
        lng >= -180 &&
        lng <= 180 &&
        lat >= -90 &&
        lat <= 90
      );
    })
    .map((c) => {
      const info = getCustomerPackageAndCategory(c);
      const matchedCat = categoriesBreakdown.find((cat) => cat.id === info.categoryId);
      return {
        id: c.id,
        name: c.fullname,
        email: c.email,
        phone: c.profile?.phone_number || '-',
        address: c.profile?.full_address || '-',
        city: c.profile?.city || '-',
        district: c.profile?.district || '-',
        latitude: Number(c.profile!.latitude),
        longitude: Number(c.profile!.longitude),
        package: info.packageName,
        categoryId: info.categoryId,
        category: info.categoryName,
        color: matchedCat?.color || '#2563eb',
        isPppActive: c.profile?.isPppActive ?? true,
      };
    });

  // 7. Time-series Monthly Trend for Charts (Last 6 months)
  const monthlyTrends: Array<{
    month: string;
    totalRevenue: number;
    newCustomers: number;
    paidInvoicesCount: number;
    unpaidInvoicesCount: number;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLabel = `${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;

    const mPaidInvoices = paidInvoices.filter((inv) => {
      const pDate = inv.paidAt || inv.periodStart;
      return pDate >= mStart && pDate <= mEnd;
    });

    const mTotalRev = mPaidInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
    const mUnpaidCount = unpaidInvoices.filter((inv) => inv.periodStart >= mStart && inv.periodStart <= mEnd).length;
    const mNewCust = customers.filter((c) => c.createdAt >= mStart && c.createdAt <= mEnd).length;

    monthlyTrends.push({
      month: monthLabel,
      totalRevenue: mTotalRev,
      newCustomers: mNewCust,
      paidInvoicesCount: mPaidInvoices.length,
      unpaidInvoicesCount: mUnpaidCount,
    });
  }

  // Baseline fallback if all past months are empty
  const hasMonthlyRev = monthlyTrends.some((m) => m.totalRevenue > 0);
  if (!hasMonthlyRev && totalRevenue > 0) {
    const lastIndex = monthlyTrends.length - 1;
    monthlyTrends[lastIndex].totalRevenue = totalRevenue;
    monthlyTrends[lastIndex].paidInvoicesCount = paidCount;
  }

  // 8. Package Popularity Breakdown
  const packageMap = new Map<string, { name: string; count: number; category: string }>();
  customers.forEach((c) => {
    const pkg = c.packageHistory[0]?.package || c.orders[0]?.items[0]?.package;
    if (pkg?.name) {
      const existing = packageMap.get(pkg.name);
      if (existing) {
        existing.count += 1;
      } else {
        packageMap.set(pkg.name, {
          name: pkg.name,
          count: 1,
          category: pkg.category?.name || 'Umum',
        });
      }
    }
  });
  const popularPackages = Array.from(packageMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

  // 9. Category Distribution for Pie / Donut Chart
  const categoryDistribution = categoriesBreakdown
    .filter((cat) => cat.totalCustomers > 0 || cat.revenue > 0)
    .map((cat) => ({
      name: cat.name,
      value: cat.totalCustomers,
      revenue: cat.revenue,
      color: cat.color,
    }));

  return {
    overview: {
      totalRevenue,
      thisMonthRevenue: thisMonthPaid,
      revenueGrowthPercentage,
      totalCustomers,
      activeCustomers: activeCustomersCount,
      newCustomers30d,
      paidInvoices: {
        amount: totalPaidAmount,
        count: paidCount,
      },
      unpaidInvoices: {
        amount: totalUnpaidAmount,
        count: unpaidCount,
      },
    },
    categories: categoriesBreakdown,
    charts: {
      monthlyTrends,
      categoryDistribution,
      billingStatusDistribution: [
        { name: 'Lunas', value: paidCount, amount: totalPaidAmount, color: '#10b981' },
        { name: 'Belum Dibayar', value: regularUnpaidInvoices.length, amount: regularUnpaidInvoices.reduce((s, i) => s + i.amount, 0), color: '#f59e0b' },
        { name: 'Jatuh Tempo', value: overdueInvoices.length, amount: overdueInvoices.reduce((s, i) => s + i.amount, 0), color: '#ef4444' },
      ],
      popularPackages,
    },
    recentSignups,
    customerLocations,
  };
}

export default {
  getAdminDashboardStats,
};
