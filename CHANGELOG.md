## [1.0.1](https://github.com/wyre-technology/node-datto-saas-protection/compare/v1.0.0...v1.0.1) (2026-05-02)


### Bug Fixes

* switch base URL from dattobackup.com to datto.com ([9c8571b](https://github.com/wyre-technology/node-datto-saas-protection/commit/9c8571bd2eefdd6a9ef3ae5fef0f07c28cd04156)), closes [msp-claude-plugins#69](https://github.com/msp-claude-plugins/issues/69)

# 1.0.0 (2026-05-01)


### Features

* initial SDK scaffold for Datto SaaS Protection REST API ([dfaec84](https://github.com/wyre-technology/node-datto-saas-protection/commit/dfaec84e090840cc3e5f25645f1228aae3a5e9f5))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (BREAKING)

- Auth scheme: `Authorization: Bearer <apiKey>` → `Authorization: Basic base64(publicKey:secretKey)`. The original scaffold used a Bearer token against `/api/v1/clients` — that's Datto BCDR/PSA's API surface. Datto SaaS Protection's REST API uses HTTP Basic auth with a public/secret key pair issued from the partner portal.
- Base URL: `https://api.{us,eu}.datto.com/api/v1` → `https://api.{us,eu}.datto.com/v1/saas`. The SaaS Protection REST API is rooted at `/v1/saas`; the old prefix returned `exception.notfoundhttpexception` 404s from Datto's Symfony edge.
- Config: `DattoSaasProtectionConfig.apiKey` removed. Callers must now pass both `publicKey` and `secretKey`.

### Known issues

- Resource paths (`/clients/{id}/domains`, `/clients/{id}/activity`, etc.) were written against the same speculative spec as the auth/base-URL bugs. Only `/v1/saas/domains` is confirmed against published docs. Per-customer paths may need further correction once we have a live partner key to test against.
