// En web mantenemos un esquema claro estable para evitar
// diferencias entre el renderizado inicial y la hidratación.

export function useColorScheme() {
  return 'light' as const;
}