export const setRole = (role: string) => {
  localStorage.setItem('role', role);
};

export const getRole = () => {
  return localStorage.getItem('role');
};