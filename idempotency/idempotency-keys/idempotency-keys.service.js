const crypto = require('node:crypto');
const { payments, idempotencyRecords } = require('./idempotency-keys.store');

function fingerprintPaymentRequest(payment) {
  return JSON.stringify({
    amount: Number(payment.amount),
    currency: payment.currency,
    customerId: payment.customerId,
  });
}

function createPayment(payment, idempotencyKey) {
  if (!idempotencyKey) {
    return {
      statusCode: 400,
      body: { error: 'Idempotency-Key header is required' },
    };
  }

  const fingerprint = fingerprintPaymentRequest(payment);
  const existingRecord = idempotencyRecords.get(idempotencyKey);

  if (existingRecord && existingRecord.fingerprint !== fingerprint) {
    return {
      statusCode: 409,
      body: {
        error: 'This Idempotency-Key was already used for a different request',
      },
    };
  }

  if (existingRecord) {
    return {
      statusCode: 200,
      body: {
        ...existingRecord.response,
        replayed: true,
        explanation: 'Same key and same request body returned the saved result.',
      },
    };
  }

  const response = {
    payment: {
      id: crypto.randomUUID(),
      amount: Number(payment.amount),
      currency: payment.currency || 'USD',
      customerId: payment.customerId || 'guest',
      status: 'charged',
    },
  };

  payments.set(response.payment.id, response.payment);
  idempotencyRecords.set(idempotencyKey, {
    fingerprint,
    response,
  });

  return {
    statusCode: 201,
    body: {
      ...response,
      replayed: false,
      explanation: 'First request created the payment and saved the response by key.',
    },
  };
}

module.exports = {
  createPayment,
};
