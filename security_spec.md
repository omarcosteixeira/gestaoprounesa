# Security Specification - Comercial Rules

## Data Invariants
1. A Lead or Base must have a `unidade` field.
2. A Promotor created by an FDV must have `linkadoA` set to that FDV's UID.
3. User documents in `users` collection must have `role` and `unidade` fields.
4. "Campanhas" and "Bom Dia" (Rotina) are common information for all authenticated users.

## Access Control Matrix (ABAC)

| Role | Access Level | Restrictions |
|---|---|---|
| Admin Master | Full | None |
| Gerente Comercial | Full | None |
| Gestor Comercial | Full | None |
| Gestor Unidade | Restricted | Can see `users`, `leads`, `bases` where `unidade` matches AND (for users) role is FDV/Promotor. |
| FDV (Comercial) | Restricted | Can see their own data, data where `linkadoA == uid`, or data where `unidade` matches. |
| Promotor / Rua | Restricted | Can see their own data or data they created (`promotorId == uid`). |

## Dirty Dozen Payloads (Rejection Targets)

1. **Identity Spoofing**: FDV A tries to update a lead's `unidade` to FDV B's unit.
2. **Privilege Escalation**: Promotor tries to update their own `role` to 'Admin Master'.
3. **Cross-Unit Access**: Gestor Unidade A tries to read leads from Unidade B.
4. **Unlinked Access**: FDV A tries to read data from a Promotor linked to FDV B (if not in the same unit).
5. **Unauthorized Write**: Promotor tries to delete a lead (if rule says only Lider/FDV/Admin can).
6. **Data Poisoning**: Creating a user with a 1MB string as `name`.
7. **Bypassing Invariants**: Creating a lead without `unidade`.
8. **Shadow Field Injection**: Adding `isAdmin: true` to a lead document.
9. **Role Hijacking**: A normal user tries to list ALL users in the system.
10. **Terminal State Break**: Trying to update a lead that is marked as 'Finalizado' (if applicable).
11. **PII Leak**: Non-admin/non-owner trying to 'get' a user document with phone/email.
12. **Recursive Attack**: Querying leads without a `where` clause on `unidade` (should be rejected by query enforcer rules).

## Rules Implementation Strategy
1. Use `getUserData()` to fetch current user's role and unit.
2. Implement `isComercial()` to cover Gerente/Gestor Comercial.
3. Implement `canAccessLead(data)` helper.
4. Secure collections: `leads`, `bases`, `users`, `gap_academico`, `isencoes`, `evasao`.
5. Open collections: `campanhas`, `bom_dia`.
