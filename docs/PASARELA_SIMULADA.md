# Pasarela de pagos simulada

El módulo procesa únicamente **Tarjeta** y **SINPE Móvil**. La migración
idempotente está en `migrations/005_pasarela_pagos_simulada.sql`.

## Credenciales de tarjeta

### Tarjeta

Las tarjetas deben tener 16 dígitos. Visa inicia con `4`; Mastercard inicia
con `5` o `2`. Cada pago aprobado descuenta el saldo de la tarjeta simulada.
El número y el CVV se comparan mediante hashes; nunca se guardan en texto
plano en la base de datos ni se entregan mediante endpoints o componentes de
la aplicación. Las credenciales se proporcionan directamente al titular.

### SINPE Móvil

El teléfono debe contener 8 dígitos y estar activo en
`cuentas_sinpe_simuladas`. La aplicación no lista ni sugiere números
vinculados; el titular debe proporcionar el suyo.

## API bancaria simulada

- `POST /api/banco-simulado/tarjetas/validar`
- `POST /api/banco-simulado/sinpe/validar`
- `POST /api/pagos` autoriza y registra el cobro de forma atómica

Las aprobaciones y rechazos se auditan en `transacciones_pasarela`. Un pago
aprobado guarda su detalle de productos en `detalles_pago` y solo entonces
descuenta inventario y saldo bancario.
