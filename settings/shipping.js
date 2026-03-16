function calculateShippingPrice(items) {
  let weight = 0;
  for (let i = 0; i < items.length; i++) {
    weight += items[i].weight * items[i].quantity;
  }
  weight = weight / 1000;
  if (weight <= 5) { return 185; }
  if (weight <= 10) { return 220; }
  if (weight < 15) { return 280; }
  return 0;
}
