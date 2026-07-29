# Tipo de cambio para Tarjeta y SINPE

RetroGarage consulta:

`https://api.hacienda.go.cr/indicadores/tc`

La integración se utiliza únicamente como referencia informativa en los pagos
locales con Tarjeta y SINPE. Esos métodos continúan debitando y registrando el
monto completo en colones.

## Flujo

1. El usuario selecciona Tarjeta o SINPE.
2. El frontend llama `GET /api/pagos/tipo-cambio`.
3. El backend consulta Hacienda o reutiliza la tasa en caché.
4. Se devuelve la tasa de venta del dólar.
5. El frontend calcula `monto CRC / tasa de venta`.
6. La pantalla muestra el equivalente estimado en USD.
7. El pago real se procesa en CRC y no se modifica por esa equivalencia.

## Configuración

```env
TIPO_CAMBIO_API_URL=https://api.hacienda.go.cr/indicadores/tc
TIPO_CAMBIO_CACHE_MS=1800000
TIPO_CAMBIO_RESPALDO_CRC_USD=500
```

La respuesta se conserva durante 30 minutos. Si Hacienda no está disponible,
el servicio reutiliza la última tasa obtenida. Si todavía no existe una tasa en
caché, utiliza `TIPO_CAMBIO_RESPALDO_CRC_USD` como respaldo técnico.

## Separación de PayPal

PayPal no consulta este endpoint. Su conversión continúa usando únicamente la
tasa fija `PAYPAL_CRC_PER_USD`, tal como estaba antes de integrar Hacienda.
