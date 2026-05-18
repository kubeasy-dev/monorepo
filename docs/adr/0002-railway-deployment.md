# Railway as deployment platform

All production services (API, web, proxy, OTel collector) are deployed on Railway using Railpack-generated builds. Railway was chosen for its native pnpm monorepo support, automatic HTTPS, built-in service discovery by name, and no cold-start penalty (unlike serverless platforms). The main constraint is that Railway exposes a single `PORT` per service, which drove several reverse-proxy decisions (see ADR-0009).
