export function normalizeStudentSearch(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase();
}

export function matchesStudentName(name: string, query: string): boolean {
  const normalizedQuery = normalizeStudentSearch(query);
  if (!normalizedQuery) return true;
  return normalizeStudentSearch(name).includes(normalizedQuery);
}

type SearchableStudent = {
  name: string;
  contactNumber?: string | null;
};

export function matchesStudentSearch(
  student: SearchableStudent,
  query: string,
): boolean {
  const normalizedQuery = normalizeStudentSearch(query);
  if (!normalizedQuery) return true;
  if (normalizeStudentSearch(student.name).includes(normalizedQuery)) return true;

  const numberQuery = normalizedQuery.replace(/\D/g, "");
  return Boolean(
    numberQuery &&
      student.contactNumber?.replace(/\D/g, "").includes(numberQuery),
  );
}

export function filterStudentsByName<T extends SearchableStudent>(
  students: T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeStudentSearch(query);
  if (!normalizedQuery) return students;
  return students.filter((student) => matchesStudentSearch(student, normalizedQuery));
}
