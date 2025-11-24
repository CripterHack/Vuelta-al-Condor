### CSP Reports

Este directorio contiene el colector y los logs de violaciones de la Content Security Policy.

- Endpoint: `reports/csp-report.php`
- Logs: `reports/csp-violations-YYYY-MM-DD.jsonl` (JSON Lines por día)
- Acceso directo a los logs denegado por `.htaccess`

Pruebas (ya en producción con Apache):

1) Enviar un ejemplo de `report-uri`:

```
curl -X POST \
  -H "Content-Type: application/csp-report" \
  --data '{"csp-report":{"document-uri":"https://condor.izignamx.com/","violated-directive":"script-src","effective-directive":"script-src","blocked-uri":"inline","original-policy":"default-src 'self'"}}' \
  https://condor.izignamx.com/reports/csp-report.php -i
```

2) Enviar un ejemplo de `Report-To` (Reporting API):

```
curl -X POST \
  -H "Content-Type: application/reports+json" \
  --data '[{"type":"csp-violation","age":0,"url":"https://condor.izignamx.com/","user_agent":"curl","body":{"document-uri":"https://condor.izignamx.com/","effective-directive":"script-src","violated-directive":"script-src","blocked-uri":"inline","original-policy":"default-src 'self'","disposition":"report"}}]' \
  https://condor.izignamx.com/reports/csp-report.php -i
```

Lectura en servidor (PowerShell):

```
Get-Content reports/csp-violations-$(Get-Date -Format yyyy-MM-dd).jsonl -Tail 50 -Wait
```

Consejos:

- Filtra por `effective-directive` y `blocked-uri` para priorizar.
- Considera rotación de logs externa si el sitio tiene tráfico alto.
- Usa `Report-Only` para observar antes de endurecer la política.