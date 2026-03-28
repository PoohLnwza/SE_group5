
export function calculateTotal(items: any[]) {
  return items.reduce((sum, item) => {
    return sum + (item.qty * item.unit_price);
  }, 0);
}
