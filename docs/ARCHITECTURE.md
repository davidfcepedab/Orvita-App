# Arquitectura Orvita-App

## Stack
- Next.js App Router
- TypeScript strict
- Supabase (RLS profile-based)
- GitHub Actions CI

## Seguridad
- No service role en APIs públicas
- RLS enforced
- Guard anti-mocks

## Finanzas
- API bajo /api/orbita/finanzas/*
- Cálculos tipados
- Sin multi-tenant
- Sin lógica en UI

## Convenciones
- feature/*
- release/*
- hotfix/*
- PR obligatorio hacia main
