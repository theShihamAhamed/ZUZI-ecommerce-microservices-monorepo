const formatDeliveryDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

export const getEstimatedDeliveryText = (minDays = 5, maxDays = 7) => {
  const minDate = new Date();
  const maxDate = new Date();

  minDate.setDate(minDate.getDate() + minDays);
  maxDate.setDate(maxDate.getDate() + maxDays);

  return `Estimated delivery: ${formatDeliveryDate(minDate)} - ${formatDeliveryDate(maxDate)}`;
};
