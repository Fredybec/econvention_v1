
export const getAcademicYear = (date: Date = new Date()): string => {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  if (month >= 9) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};
