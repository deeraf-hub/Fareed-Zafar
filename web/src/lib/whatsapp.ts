import { WHATSAPP_NUMBER, siteConfig } from '../config/site';
import { formatPKR } from './format';
import type { Order, Product } from '../types';

/** Builds a wa.me link for the configured business number. */
export const whatsappLink = (message: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const productInquiryMessage = (product: Product): string =>
  `Hello ${siteConfig.name}, I am interested in ${product.name}. Price: ${formatPKR(product.price)}. Is this product available?`;

export const productInquiryLink = (product: Product): string => whatsappLink(productInquiryMessage(product));

export const generalInquiryLink = (): string =>
  whatsappLink(`Hello ${siteConfig.name}, I would like to ask about a motorcycle spare part.`);

export const orderInquiryLink = (order: Order): string =>
  whatsappLink(
    `Hello ${siteConfig.name}, I placed order ${order.orderNumber} for ${formatPKR(order.total)}. I would like to check its status.`,
  );

export const stockInquiryLink = (product: Product): string =>
  whatsappLink(
    `Hello ${siteConfig.name}, ${product.name} (SKU ${product.sku}) is showing out of stock. When will it be available?`,
  );
