export const formatDate = (inputDate) => {
  const date = new Date(inputDate);
  const options = { month: '2-digit', day: '2-digit', year: 'numeric' };
  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
  return formattedDate;
}