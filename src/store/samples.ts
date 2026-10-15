export const SAMPLES = {
  json: JSON.stringify(
    {
      project: 'dev-workbench',
      version: '1.0.0',
      offline: true,
      stars: 5000,
      maintainers: [{ name: 'Ada Lovelace', role: 'core', since: '2026-01-04T09:00:00Z' }],
      users: [
        { id: 1, name: 'Grace Hopper', email: 'grace@navy.mil', roles: ['admin', 'compiler'], verified: true },
        { id: 2, name: 'Linus Torvalds', email: 'linus@kernel.org', roles: ['maintainer'], verified: true, team: 'kernel' },
        { id: 3, name: 'Margaret Hamilton', email: 'margaret@nasa.gov', roles: [], verified: false, lastLogin: null },
      ],
      settings: { theme: 'system', shortcuts: { palette: 'mod+k', share: 'mod+shift+s' } },
    },
    null,
    2,
  ),
  regex: {
    pattern: '(?<user>[\\w.+-]+)@(?<domain>[\\w-]+\\.[\\w.-]+)',
    flags: 'gi',
    input: [
      'Release notes — contact the maintainers:',
      '  • ada@lovelace.dev (core)',
      '  • grace.hopper+bugs@navy.mil (compilers)',
      '  • not-an-email@, @missing-user.org',
      'Escalations: linus@kernel.org',
    ].join('\n'),
  },
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzhmMmEiLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwicm9sZSI6Im1haW50YWluZXIiLCJzY29wZSI6InJlYWQ6cmVwb3Mgd3JpdGU6c3RhcnMiLCJpc3MiOiJodHRwczovL2F1dGguZGV2LXdvcmtiZW5jaC5kZXYiLCJhdWQiOiJkZXYtd29ya2JlbmNoIiwiaWF0IjoxNzYwMDAwMDAwLCJleHAiOjE5MjQ5OTIwMDB9.8JpKWlHNnuV2Ul102wJK4tHKpe8CTPAOXhOB6PWB5SE',
  diff: {
    left: [
      'export async function fetchUser(id) {',
      '  const res = await fetch(`/api/users/${id}`)',
      '  const data = await res.json()',
      '  return data',
      '}',
      '',
      'export const TIMEOUT = 5000',
    ].join('\n'),
    right: [
      'export async function fetchUser(id: string): Promise<User> {',
      '  const res = await fetch(`/api/v2/users/${id}`)',
      '  if (!res.ok) throw new HttpError(res.status)',
      '  return res.json()',
      '}',
      '',
      'export const TIMEOUT = 5000',
    ].join('\n'),
  },
  codec: 'https://example.com/search?q=offline%20first%20tools&lang=en&tag=json&tag=regex',
}
