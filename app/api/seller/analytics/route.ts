import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    const userId = session.user.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get business for user
    const { data: business } = await supabaseServer
      .from('businesses')
      .select('id, name, is_verified, created_at')
      .eq('user_id', userId)
      .single();

    if (!business) {
      return NextResponse.json({ 
        error: 'No business found',
        stats: getEmptyStats() 
      }, { status: 200 });
    }

    const businessId = business.id;

    // Get all orders for this business
    const { data: orders } = await supabaseServer
      .from('orders')
      .select(`
        id,
        status,
        total_amount,
        created_at,
        items:order_items(
          id,
          quantity,
          total_price,
          product:products(id, name)
        )
      `)
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Get all products for this business
    const { data: products } = await supabaseServer
      .from('products')
      .select('id, name, price, is_available, category, created_at')
      .eq('business_id', businessId);

    // Get inquiries/quotes
    const { data: inquiries } = await supabaseServer
      .from('product_inquiries')
      .select(`
        id,
        type,
        status,
        created_at,
        product:products(id, name)
      `)
      .eq('product.business_id', businessId)
      .gte('created_at', startDate.toISOString());

    // Calculate stats
    const totalRevenue = orders
      ?.filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const confirmedOrders = orders?.filter(o => o.status === 'confirmed').length || 0;
    const shippedOrders = orders?.filter(o => o.status === 'shipped').length || 0;
    const deliveredOrders = orders?.filter(o => o.status === 'delivered').length || 0;

    const totalOrders = orders?.length || 0;
    const avgOrderValue = totalOrders > 0 ? (orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0) / totalOrders : 0;

    const pendingInquiries = inquiries?.filter(i => i.status === 'pending').length || 0;
    const respondedInquiries = inquiries?.filter(i => i.status !== 'pending').length || 0;

    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.is_available).length || 0;

    // Daily revenue for chart
    const dailyRevenue: Record<string, number> = {};
    const dailyOrders: Record<string, number> = {};
    
    orders?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.status === 'delivered' ? (order.total_amount || 0) : 0);
      dailyOrders[date] = (dailyOrders[date] || 0) + 1;
    });

    // Top products by revenue
    const productRevenue: Record<string, { name: string; revenue: number; quantity: number }> = {};
    orders?.forEach(order => {
      order.items?.forEach((item: any) => {
        const productName = item.product?.name || 'Unknown';
        if (!productRevenue[productName]) {
          productRevenue[productName] = { name: productName, revenue: 0, quantity: 0 };
        }
        productRevenue[productName].revenue += item.total_price || 0;
        productRevenue[productName].quantity += item.quantity || 0;
      });
    });

    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Followers count
    const { count: followersCount } = await supabaseServer
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', businessId);

    // Health score calculation
    const responseRate = inquiries?.length > 0 
      ? Math.round((respondedInquiries / inquiries.length) * 100) 
      : 100;
    const fulfillmentRate = totalOrders > 0 
      ? Math.round(((deliveredOrders + confirmedOrders) / totalOrders) * 100) 
      : 100;
    const productAvailability = totalProducts > 0 
      ? Math.round((activeProducts / totalProducts) * 100) 
      : 0;
    
    const healthScore = Math.round(
      (responseRate * 0.3) + 
      (fulfillmentRate * 0.3) + 
      (productAvailability * 0.2) + 
      (business.is_verified ? 20 : 0)
    );

    // Recent orders
    const recentOrders = orders?.slice(0, 5).map(order => ({
      id: order.id,
      status: order.status,
      total: order.total_amount,
      items: order.items?.length || 0,
      date: order.created_at
    })) || [];

    // This week's stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekOrders = orders?.filter(o => new Date(o.created_at) >= weekStart) || [];
    const weekRevenue = weekOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    // Previous period comparison
    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(period) * 2);
    const prevEndDate = new Date();
    prevEndDate.setDate(prevEndDate.getDate() - parseInt(period));

    const { data: prevOrders } = await supabaseServer
      .from('orders')
      .select('total_amount, status')
      .eq('business_id', businessId)
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', prevEndDate.toISOString());

    const prevRevenue = prevOrders
      ?.filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    const prevOrdersCount = prevOrders?.length || 0;
    
    const revenueChange = prevRevenue > 0 
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
      : (totalRevenue > 0 ? 100 : 0);
    
    const ordersChange = prevOrdersCount > 0 
      ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 
      : (totalOrders > 0 ? 100 : 0);

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        isVerified: business.is_verified,
        createdAt: business.created_at
      },
      stats: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        avgOrderValue,
        weekRevenue,
        totalProducts,
        activeProducts,
        pendingInquiries,
        respondedInquiries,
        followersCount: followersCount || 0,
        healthScore
      },
      charts: {
        dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
        dailyOrders: Object.entries(dailyOrders).map(([date, count]) => ({ date, count }))
      },
      topProducts,
      recentOrders,
      comparison: {
        revenueChange: Math.round(revenueChange),
        ordersChange: Math.round(ordersChange)
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getEmptyStats() {
  return {
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    avgOrderValue: 0,
    weekRevenue: 0,
    totalProducts: 0,
    activeProducts: 0,
    pendingInquiries: 0,
    respondedInquiries: 0,
    followersCount: 0,
    healthScore: 0
  };
}
