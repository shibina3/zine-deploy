import { db } from '@/db/database';
import type { Customer, Employee, ItemType, PaymentMethod, Product, Service } from '@/types';
import { newId } from '@/utils/id';
import { addDaysISO, combineDateTime, dateFromEpoch, toISODate, todayISO } from '@/utils/date';
import { balanceDue, computeTotals, deriveBillStatus, type BillLineDraft } from '@/modules/billing/logic';

/**
 * Optional sample salon data, offered during first-run setup. It writes directly
 * to IndexedDB so the audit trail for real operations stays clean.
 */
export async function seedDemoData(): Promise<void> {
  if ((await db.services.count()) > 0) return;

  const now = Date.now();
  const stamp = { createdAt: now, updatedAt: now };

  const employees: Employee[] = [
    {
      id: newId(),
      ...stamp,
      name: 'Anita Rao',
      phone: '9845012301',
      designation: 'Senior Stylist',
      joinedAt: '2023-04-12',
      isActive: true,
      salaryType: 'FIXED_PLUS_COMMISSION',
      fixedSalary: 1_800_000,
      commissionRateBps: 500,
      workingDaysPerMonth: 26,
    },
    {
      id: newId(),
      ...stamp,
      name: 'Meera Nair',
      phone: '9845012302',
      designation: 'Beautician',
      joinedAt: '2024-01-08',
      isActive: true,
      salaryType: 'FIXED_PLUS_COMMISSION',
      fixedSalary: 1_500_000,
      commissionRateBps: 400,
      workingDaysPerMonth: 26,
    },
    {
      id: newId(),
      ...stamp,
      name: 'Priya Shetty',
      phone: '9845012303',
      designation: 'Makeup Artist',
      joinedAt: '2024-07-19',
      isActive: true,
      salaryType: 'COMMISSION',
      fixedSalary: 0,
      commissionRateBps: 1200,
      workingDaysPerMonth: 26,
    },
    {
      id: newId(),
      ...stamp,
      name: 'Farah Khan',
      phone: '9845012304',
      designation: 'Nail Technician',
      joinedAt: '2025-02-03',
      isActive: true,
      salaryType: 'FIXED',
      fixedSalary: 1_200_000,
      commissionRateBps: 0,
      workingDaysPerMonth: 24,
    },
  ];
  await db.employees.bulkAdd(employees);

  const serviceSpecs: Array<[string, string, number, number]> = [
    ['Hair Spa', 'Hair', 100_000, 60],
    ['Hair Wash & Blow Dry', 'Hair', 60_000, 45],
    ['Hair Cut & Styling', 'Hair', 80_000, 45],
    ['Global Hair Colour', 'Hair', 350_000, 120],
    ['Keratin Treatment', 'Hair', 600_000, 180],
    ['Classic Facial', 'Skin', 120_000, 60],
    ['Hydra Glow Facial', 'Skin', 220_000, 75],
    ['Full Face Threading', 'Threading', 35_000, 20],
    ['Full Arms Waxing', 'Waxing', 70_000, 40],
    ['Full Legs Waxing', 'Waxing', 90_000, 45],
    ['Gel Manicure', 'Nails', 150_000, 60],
    ['Party Makeup', 'Makeup', 300_000, 90],
    ['Bridal Package — Signature', 'Bridal', 2_500_000, 300],
    ['Bridal Package — Premium', 'Bridal', 4_000_000, 420],
    ['Head Massage', 'Spa', 40_000, 30],
  ];
  const services: Service[] = serviceSpecs.map(([name, category, price, durationMinutes]) => ({
    id: newId(),
    ...stamp,
    name,
    category,
    price,
    durationMinutes,
    isActive: true,
  }));
  await db.services.bulkAdd(services);

  const customerSpecs: Array<[string, string, string]> = [
    ['Sneha Kulkarni', '9900112233', 'sneha@example.com'],
    ['Divya Menon', '9900112244', ''],
    ['Aishwarya Bhat', '9900112255', ''],
    ['Ritu Sharma', '9900112266', ''],
    ['Kavya Iyer', '9900112277', ''],
    ['Neha Patil', '9900112288', ''],
  ];
  const customers: Customer[] = customerSpecs.map(([name, phone, email], index) => ({
    id: newId(),
    createdAt: now - index * 86_400_000,
    updatedAt: now,
    name,
    phone,
    email: email || undefined,
    totalSpend: 0,
  }));
  await db.customers.bulkAdd(customers);

  const supplierId = newId();
  await db.suppliers.add({
    id: supplierId,
    ...stamp,
    name: 'Beauty Essentials Wholesale',
    phone: '08022334455',
    address: 'Indiranagar, Bengaluru',
  });

  const productSpecs: Array<[string, string, string, number, number, number, number]> = [
    ['Luxury Hair Spa Cream', 'Hair care', '500 ml', 65_000, 95_000, 4, 8],
    ['Argan Hair Serum', 'Hair care', '100 ml', 42_000, 68_000, 3, 6],
    ['Hydrating Face Mask', 'Skin care', '250 ml', 55_000, 85_000, 4, 10],
    ['Gel Nail Polish — Nude', 'Nail care', '10 ml', 18_000, 35_000, 5, 12],
    ['Bridal Setting Spray', 'Makeup', '200 ml', 48_000, 75_000, 2, 5],
  ];
  const products: Product[] = productSpecs.map(
    ([name, category, unit, purchasePrice, sellingPrice, minStock, stock]) => ({
      id: newId(),
      ...stamp,
      name,
      sku: `DEMO-${name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()}`,
      category,
      supplierId,
      unit,
      purchasePrice,
      sellingPrice,
      stockCached: stock,
      minStock,
      isActive: true,
    }),
  );
  await db.products.bulkAdd(products);

  await db.stockMovements.bulkAdd(
    products.map((product) => ({
      id: newId(),
      ...stamp,
      productId: product.id,
      productName: product.name,
      type: 'PURCHASE' as const,
      quantity: product.stockCached,
      unitCost: product.purchasePrice,
      supplierId,
      invoiceRef: 'DEMO-INV-001',
      referenceType: 'PURCHASE' as const,
      occurredAt: now - 20 * 86_400_000,
      createdByName: 'Demo data',
    })),
  );

  await seedSalonActivity({ employees, services, products, customers });
}

async function seedSalonActivity(input: {
  employees: Employee[];
  services: Service[];
  products: Product[];
  customers: Customer[];
}): Promise<void> {
  const { employees, services, products, customers } = input;
  const now = Date.now();
  const stamp = { createdAt: now, updatedAt: now };
  const today = todayISO();

  const hairSpa = services.find((service) => service.name === 'Hair Spa');
  const hairWash = services.find((service) => service.name === 'Hair Wash & Blow Dry');
  const hairCut = services.find((service) => service.name === 'Hair Cut & Styling');
  const comboServiceIds = [hairSpa?.id, hairWash?.id, hairCut?.id].filter(Boolean) as string[];

  const offerId = newId();
  await db.offers.add({
    id: offerId,
    ...stamp,
    name: 'Hair Care Combo',
    description: 'Hair spa, wash and trim at one friendly price.',
    type: 'COMBO',
    serviceIds: comboServiceIds,
    originalPrice: 240_000,
    offerPrice: 199_900,
    isActive: true,
    validFrom: addDaysISO(today, -10),
    validTo: addDaysISO(today, 40),
    conditions: 'Weekdays only, prior appointment recommended.',
  });
  await db.offerServices.bulkAdd(
    comboServiceIds.map((serviceId) => ({
      id: newId(),
      ...stamp,
      offerId,
      serviceId,
      quantity: 1,
    })),
  );

  const appointmentPlans = [
    { dayOffset: 0, time: '10:30', customer: 0, service: 0, employee: 0, status: 'COMPLETED' as const },
    { dayOffset: 0, time: '12:00', customer: 1, service: 5, employee: 1, status: 'CONFIRMED' as const },
    { dayOffset: 0, time: '15:30', customer: 2, service: 6, employee: 1, status: 'CONFIRMED' as const },
    { dayOffset: 0, time: '17:00', customer: 3, service: 7, employee: 1, status: 'TENTATIVE' as const },
    { dayOffset: 1, time: '11:00', customer: 4, service: 10, employee: 3, status: 'CONFIRMED' as const },
    { dayOffset: 1, time: '13:30', customer: 5, service: 11, employee: 2, status: 'CONFIRMED' as const },
  ];

  for (const plan of appointmentPlans) {
    const service = services[plan.service];
    const customer = customers[plan.customer];
    const employee = employees[plan.employee];
    const day = addDaysISO(today, plan.dayOffset);
    const startAt = combineDateTime(day, plan.time);
    await db.appointments.add({
      id: newId(),
      ...stamp,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      serviceIds: [service.id],
      serviceNames: [service.name],
      employeeId: employee.id,
      employeeName: employee.name,
      startAt,
      endAt: startAt + service.durationMinutes * 60_000,
      estimatedTotal: service.price,
      advance: 0,
      status: plan.status,
      source: 'APPOINTMENT',
    });
  }

  const bridalService = services.find((service) => service.name.includes('Premium')) ?? services[0];
  const bridalCustomer = customers[4];
  const eventDate = addDaysISO(today, 21);
  const bridalStart = combineDateTime(eventDate, '08:00');
  const bridalEnd = combineDateTime(eventDate, '15:00');
  const bridalId = newId();
  const bridalAppointmentId = newId();
  await db.bridalBookings.add({
    id: bridalId,
    ...stamp,
    customerId: bridalCustomer.id,
    customerName: bridalCustomer.name,
    customerPhone: bridalCustomer.phone,
    eventType: 'Wedding — Reception',
    eventDate,
    startTime: '08:00',
    endTime: '15:00',
    location: 'Taj Banquet Hall, Bengaluru',
    serviceIds: [bridalService.id],
    serviceNames: [bridalService.name],
    employeeIds: [employees[2].id, employees[1].id],
    employeeNames: [`${employees[2].name}, ${employees[1].name}`],
    trialDate: addDaysISO(today, 10),
    packagePrice: 4_000_000,
    advance: 1_000_000,
    specialRequirements: 'HD makeup, hair extensions, two outfit changes.',
    status: 'CONFIRMED',
    appointmentId: bridalAppointmentId,
  });
  await db.appointments.add({
    id: bridalAppointmentId,
    ...stamp,
    customerId: bridalCustomer.id,
    customerName: bridalCustomer.name,
    customerPhone: bridalCustomer.phone,
    serviceIds: [bridalService.id],
    serviceNames: [bridalService.name],
    employeeId: employees[2].id,
    employeeName: `${employees[2].name}, ${employees[1].name}`,
    startAt: bridalStart,
    endAt: bridalEnd,
    estimatedTotal: 4_000_000,
    advance: 1_000_000,
    notes: 'Bridal Wedding — Reception',
    status: 'CONFIRMED',
    source: 'BRIDAL',
    bridalBookingId: bridalId,
  });
  await db.calendarBlocks.add({
    id: newId(),
    ...stamp,
    scope: 'SALON',
    startAt: bridalStart,
    endAt: bridalEnd,
    reason: `Bridal booking — ${bridalCustomer.name}`,
    bridalBookingId: bridalId,
  });

  await db.employeeLeaves.add({
    id: newId(),
    ...stamp,
    employeeId: employees[3].id,
    employeeName: employees[3].name,
    startDate: addDaysISO(today, 2),
    endDate: addDaysISO(today, 3),
    type: 'CASUAL',
    paid: false,
    reason: 'Family function out of town.',
    status: 'PENDING',
  });

  await seedDemoBills({ employees, services, products, customers });
}

async function seedDemoBills(input: {
  employees: Employee[];
  services: Service[];
  products: Product[];
  customers: Customer[];
}): Promise<void> {
  const { employees, services, products, customers } = input;
  const now = Date.now();
  const stamp = { createdAt: now, updatedAt: now };
  const year = new Date().getFullYear();

  const billPlans: Array<{
    daysAgo: number;
    customer: number;
    employee: number;
    services: number[];
    paidRatio: number;
    method: PaymentMethod;
  }> = [
    { daysAgo: 0, customer: 0, employee: 0, services: [0], paidRatio: 1, method: 'UPI' },
    { daysAgo: 0, customer: 1, employee: 1, services: [6], paidRatio: 0.5, method: 'CASH' },
    { daysAgo: 1, customer: 2, employee: 1, services: [5, 7], paidRatio: 1, method: 'UPI' },
    { daysAgo: 2, customer: 3, employee: 3, services: [10], paidRatio: 1, method: 'CARD' },
    { daysAgo: 3, customer: 4, employee: 0, services: [3], paidRatio: 1, method: 'UPI' },
    { daysAgo: 5, customer: 5, employee: 2, services: [11], paidRatio: 0.4, method: 'CASH' },
    { daysAgo: 8, customer: 0, employee: 1, services: [1, 8], paidRatio: 1, method: 'CASH' },
    { daysAgo: 11, customer: 1, employee: 0, services: [4], paidRatio: 1, method: 'UPI' },
  ];

  let sequence = 0;
  for (const plan of billPlans) {
    sequence += 1;
    const billDate = now - plan.daysAgo * 86_400_000;
    const customer = customers[plan.customer];
    const employee = employees[plan.employee];
    const chosen = plan.services.map((index) => services[index]);
    const billId = newId();

    const lines: BillLineDraft[] = chosen.map((service) => ({
      itemType: 'SERVICE' as ItemType,
      refId: service.id,
      name: service.name,
      category: service.category,
      quantity: 1,
      unitPrice: service.price,
      discount: 0,
    }));
    const totals = computeTotals(lines, { taxPercent: 0 });
    const paid = Math.round((totals.total * plan.paidRatio) / 100) * 100;

    await db.bills.add({
      id: billId,
      createdAt: billDate,
      updatedAt: billDate,
      billNumber: `ZN-${year}-${String(sequence).padStart(5, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      employeeId: employee.id,
      employeeName: employee.name,
      billDate,
      subtotal: totals.subtotal,
      itemDiscount: 0,
      billDiscount: 0,
      offerDiscount: 0,
      taxableAmount: totals.taxableAmount,
      taxPercent: 0,
      taxAmount: 0,
      total: totals.total,
      paid,
      refunded: 0,
      balance: balanceDue(totals.total, paid),
      status: deriveBillStatus({ total: totals.total, paid }),
    });

    await db.billItems.bulkAdd(
      lines.map((line) => ({
        id: newId(),
        ...stamp,
        billId,
        itemType: line.itemType,
        refId: line.refId,
        name: line.name,
        category: line.category,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: 0,
        lineTotal: line.unitPrice * line.quantity,
        employeeId: employee.id,
        employeeName: employee.name,
      })),
    );

    if (paid > 0) {
      await db.payments.add({
        id: newId(),
        ...stamp,
        billId,
        amount: paid,
        method: plan.method,
        paidAt: billDate + 3_600_000,
        kind: 'BILL',
        createdByName: 'Demo data',
      });
    }

    const existingCustomer = await db.customers.get(customer.id);
    if (existingCustomer) {
      await db.customers.update(customer.id, {
        totalSpend: existingCustomer.totalSpend + totals.total,
        lastVisitAt: Math.max(existingCustomer.lastVisitAt ?? 0, billDate),
        updatedAt: now,
      });
    }
  }

  const product = products[1];
  await db.stockMovements.add({
    id: newId(),
    ...stamp,
    productId: product.id,
    productName: product.name,
    type: 'SALE',
    quantity: -1,
    unitCost: product.purchasePrice,
    referenceType: 'MANUAL',
    occurredAt: now - 2 * 86_400_000,
    createdByName: 'Demo data',
  });
  await db.products.update(product.id, { stockCached: product.stockCached - 1, updatedAt: now });

  const expenseSpecs: Array<[string, string, number, number]> = [
    ['Rent', 'Salon rent — current month', 3_500_000, 6],
    ['Electricity', 'BESCOM bill', 420_000, 8],
    ['Product purchases', 'Restock hair care', 1_250_000, 9],
    ['Marketing', 'Instagram promotion', 300_000, 4],
    ['Maintenance', 'AC servicing', 180_000, 2],
  ];
  await db.expenses.bulkAdd(
    expenseSpecs.map(([category, description, amount, daysAgo]) => ({
      id: newId(),
      ...stamp,
      category,
      description,
      amount,
      date: dateFromEpoch(now - daysAgo * 86_400_000),
      method: 'UPI' as PaymentMethod,
      createdByName: 'Demo data',
    })),
  );

  await db.incomes.add({
    id: newId(),
    ...stamp,
    source: 'OTHER',
    description: 'Gift voucher sale',
    amount: 200_000,
    date: toISODate(new Date()),
    method: 'CASH',
    createdByName: 'Demo data',
  });

  await db.auditLogs.add({
    id: newId(),
    ...stamp,
    action: 'BILL_CREATE',
    entityType: 'demo',
    reason: 'Sample salon data loaded during setup',
    userName: 'System',
  });
}

