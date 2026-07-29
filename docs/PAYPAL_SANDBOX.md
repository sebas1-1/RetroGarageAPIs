# Integración PayPal

RetroGarage utiliza PayPal Orders v2 con intención `CAPTURE`.

## Flujo

1. El frontend solicita al backend crear una orden.
2. El backend calcula nuevamente el total y crea una orden pendiente local.
3. El backend crea la orden en PayPal y devuelve el enlace de aprobación.
4. El comprador inicia sesión directamente en PayPal y aprueba.
5. PayPal devuelve al comprador a `/pagos/paypal-retorno`.
6. El frontend solicita al backend capturar la orden.
7. El backend vuelve a validar cita y stock, captura en PayPal y registra:
   - pago y factura;
   - transacción de pasarela;
   - detalles del pago;
   - movimientos y descuento de inventario;
   - cita completada, cuando corresponda.

Crear o cancelar una orden no genera factura ni descuenta inventario.

## Configuración

Copiar `.env.example` como `.env` y completar las credenciales. El Secret solo
debe existir en el backend.

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=TU_CLIENT_ID_SANDBOX
PAYPAL_CLIENT_SECRET=TU_SECRET_SANDBOX
PAYPAL_CURRENCY=USD
PAYPAL_CRC_PER_USD=500
PAYPAL_RETURN_URL=http://localhost:8081/pagos/paypal-retorno
PAYPAL_CANCEL_URL=http://localhost:8081/pagos/paypal-retorno
PAYPAL_SANDBOX_MOCK_ERROR=
```

PayPal no procesa CRC en esta integración. El pago se conserva en colones en
RetroGarage y se envía a PayPal en USD usando la tasa fija configurada en
`PAYPAL_CRC_PER_USD`. La API de Hacienda no participa en el flujo PayPal.

### Probar fondos rechazados

Sandbox sigue una ruta exitosa por defecto y una cuenta compradora puede usar
fuentes ficticias adicionales al saldo visible. El comercio no puede ni debe
consultar el saldo del comprador.

Para forzar temporalmente un rechazo de la fuente de fondos:

```env
PAYPAL_SANDBOX_MOCK_ERROR=INSTRUMENT_DECLINED
```

Reiniciar el backend, aprobar una orden nueva y comprobar que no se genera pago
ni se descuenta inventario. Después de la prueba, volver a dejar la variable
vacía. Este encabezado de prueba se ignora cuando `PAYPAL_MODE=live`.

## Base de datos

Ejecutar `migrations/007_paypal_sandbox.sql`. La migración agrega:

- método `PAYPAL`;
- tabla `ordenes_paypal`;
- tabla `detalles_orden_paypal`;
- campos externos en `transacciones_pasarela`.

## Paso a producción

Antes de habilitar pagos reales:

1. Usar credenciales Live nuevas y `PAYPAL_MODE=live`.
2. Configurar URLs HTTPS públicas para retorno y cancelación.
3. Definir una fuente de tipo de cambio aprobada por el negocio.
4. Rotar cualquier credencial que haya sido publicada.
5. Añadir webhooks de PayPal para conciliación y recuperación ante fallos.
