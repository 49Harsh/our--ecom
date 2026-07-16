export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  ORDER: 'order',
  ABANDONED_CART: 'abandoned-cart',
  INVOICE: 'invoice',
  SEARCH_INDEX: 'search-index',
} as const;

export const JOB_NAMES = {
  SEND_EMAIL: 'send-email',
  SEND_PUSH: 'send-push',
  PROCESS_ORDER: 'process-order',
  SEND_ABANDONED_CART: 'send-abandoned-cart',
  GENERATE_INVOICE: 'generate-invoice',
  INDEX_PRODUCT: 'index-product',
  REMOVE_PRODUCT: 'remove-product',
} as const;
