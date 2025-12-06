export type Project = {
  id: string;
  name: string;
  code: string;
  color: string;
};

// Placeholder data until backend CRUD is wired up.
export const demoProjects: Project[] = [
  { id: 'core', name: 'Structura Core', code: 'SC', color: '#2563eb' },
  { id: 'gateway', name: 'API Gateway', code: 'AG', color: '#9333ea' },
  { id: 'mobile', name: 'Mobile App', code: 'MA', color: '#16a34a' },
  { id: 'docs', name: 'Documentation Site', code: 'DS', color: '#f97316' },
];
