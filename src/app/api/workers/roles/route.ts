import { NextResponse } from 'next/server';

// GET available user roles
export async function GET() {
  try {
    const roles = [
      { value: 'admin', label: 'Admin' },
      { value: 'product_manager', label: 'Product Manager' },
      { value: 'site_manager', label: 'Site Manager' },
      { value: 'offer_manager', label: 'Offer Manager' },
      { value: 'order_manager', label: 'Order Manager' },
      { value: 'website_manager', label: 'Website Manager' },
      { value: 'sales_agent', label: 'Sales Agent' },
      { value: 'office_employee', label: 'Office Employee' },
      { value: 'worker', label: 'Worker' },
      { value: 'website_user', label: 'Website User' },
    ];

    return NextResponse.json({ roles }, { status: 200 });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
