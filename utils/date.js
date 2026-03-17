export const isWithin7Days = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const max = new Date(today);
  max.setDate(today.getDate() + 7);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target >= today && target <= max;
};
