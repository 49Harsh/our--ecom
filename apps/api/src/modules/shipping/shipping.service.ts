import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private readonly configService: ConfigService) {}

  // ─── Shiprocket Auth ──────────────────────────────────────────────────────
  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    const response = await axios.post(
      `${this.configService.get('SHIPROCKET_BASE_URL')}/auth/login`,
      {
        email: this.configService.get('SHIPROCKET_EMAIL'),
        password: this.configService.get('SHIPROCKET_PASSWORD'),
      },
    );

    this.token = response.data.token;
    // Token expires in 10 days, refresh every 9
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 9);
    this.tokenExpiry = expiry;

    return this.token!;
  }

  private async shiprocketRequest(method: string, endpoint: string, data?: unknown) {
    const token = await this.getToken();
    const baseUrl = this.configService.get('SHIPROCKET_BASE_URL');
    try {
      const res = await axios({
        method,
        url: `${baseUrl}${endpoint}`,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data,
      });
      return res.data;
    } catch (err: any) {
      this.logger.error(`Shiprocket error: ${err.response?.data?.message || err.message}`);
      throw err;
    }
  }

  // ─── Get Shipping Rates ───────────────────────────────────────────────────
  async getShippingRates(params: {
    pickupPostcode: string;
    deliveryPostcode: string;
    weight: number;
    cod?: boolean;
  }) {
    return this.shiprocketRequest('GET', '/courier/serviceability/', {
      pickup_postcode: params.pickupPostcode,
      delivery_postcode: params.deliveryPostcode,
      weight: params.weight,
      cod: params.cod ? 1 : 0,
    });
  }

  // ─── Create Shipment ──────────────────────────────────────────────────────
  async createShipment(orderId: string, orderData: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryState: string;
    deliveryPincode: string;
    items: { name: string; sku: string; units: number; sellingPrice: number }[];
    weight: number;
    paymentMethod: string;
    subTotal: number;
  }) {
    const payload = {
      order_id: orderData.orderNumber,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: 'Primary',
      billing_customer_name: orderData.customerName,
      billing_phone: orderData.customerPhone,
      billing_address: orderData.deliveryAddress,
      billing_city: orderData.deliveryCity,
      billing_state: orderData.deliveryState,
      billing_pincode: orderData.deliveryPincode,
      billing_country: 'India',
      shipping_is_billing: true,
      order_items: orderData.items,
      payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: orderData.subTotal,
      weight: orderData.weight,
    };

    const result = await this.shiprocketRequest('POST', '/orders/create/adhoc', payload);

    // Store AWB / tracking info
    return result;
  }

  // ─── Track Shipment ───────────────────────────────────────────────────────
  async trackShipment(awbCode: string) {
    return this.shiprocketRequest('GET', `/courier/track?awb=${awbCode}`);
  }

  // ─── Cancel Shipment ──────────────────────────────────────────────────────
  async cancelShipment(awbCodes: string[]) {
    return this.shiprocketRequest('POST', '/orders/cancel/shipment/awbs', { awbs: awbCodes });
  }
}
