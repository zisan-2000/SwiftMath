export function normalizeStudentSearch(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase();
}

export function matchesStudentName(name: string, query: string): boolean {
  const normalizedQuery = normalizeStudentSearch(query);
  if (!normalizedQuery) return true;
  return normalizeStudentSearch(name).includes(normalizedQuery);
}

export function filterStudentsByName<T extends { name: string }>(
  students: T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeStudentSearch(query);
  if (!normalizedQuery) return students;
  return students.filter((student) =>
    normalizeStudentSearch(student.name).includes(normalizedQuery),
  );
}
