const { orders } = require('./transactional-operations.store');

function createOrderIfAbsent(orderId, data) {
  const existingOrder = orders.get(orderId);

  if (existingOrder) {
    return {
      statusCode: 200,
      body: {
        order: existingOrder,
        created: false,
        explanation: 'The unique order id makes the retry return the existing order.',
      },
    };
  }

  const order = {
    id: orderId,
    item: data.item || 'notebook',
    quantity: Number(data.quantity || 1),
    status: 'created',
  };

  orders.set(orderId, order);

  return {
    statusCode: 201,
    body: {
      order,
      created: true,
      explanation: 'A real database would protect this with a transaction and unique constraint.',
    },
  };
}

module.exports = {
  createOrderIfAbsent,
};
