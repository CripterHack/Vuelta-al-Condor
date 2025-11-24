<?php
// Colector simple de reportes CSP
// - Acepta "application/csp-report" (report-uri)
// - Acepta "application/reports+json" (Report-To / Reporting API)
// Guarda como JSON Lines por día: reports/csp-violations-YYYY-MM-DD.jsonl

date_default_timezone_set('UTC');

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST', true, 405);
    exit;
}

$raw = file_get_contents('php://input');
$contentType = strtolower(trim($_SERVER['CONTENT_TYPE'] ?? ''));
$entries = [];

// Modo report-uri (application/csp-report)
if (strpos($contentType, 'application/csp-report') !== false || strpos($raw, '"csp-report"') !== false) {
    $json = json_decode($raw, true);
    if (isset($json['csp-report']) && is_array($json['csp-report'])) {
        $r = $json['csp-report'];
        $entries[] = [
            'type' => 'csp-report',
            'time' => gmdate('c'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'document-uri' => $r['document-uri'] ?? null,
            'referrer' => $r['referrer'] ?? null,
            'violated-directive' => $r['violated-directive'] ?? null,
            'effective-directive' => $r['effective-directive'] ?? null,
            'blocked-uri' => $r['blocked-uri'] ?? null,
            'source-file' => $r['source-file'] ?? null,
            'line-number' => $r['line-number'] ?? null,
            'column-number' => $r['column-number'] ?? null,
            'original-policy' => $r['original-policy'] ?? null,
        ];
    }
} else {
    // Modo Report-To / Reporting API (application/reports+json)
    $json = json_decode($raw, true);
    if (is_array($json)) {
        foreach ($json as $item) {
            if (($item['type'] ?? '') === 'csp-violation') {
                $b = $item['body'] ?? [];
                $entries[] = [
                    'type' => 'csp-violation',
                    'time' => gmdate('c'),
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                    'url' => $item['url'] ?? null,
                    'disposition' => $b['disposition'] ?? null,
                    'document-uri' => $b['document-uri'] ?? null,
                    'referrer' => $b['referrer'] ?? null,
                    'effective-directive' => $b['effective-directive'] ?? null,
                    'violated-directive' => $b['violated-directive'] ?? null,
                    'blocked-uri' => $b['blocked-uri'] ?? null,
                    'source-file' => $b['source-file'] ?? null,
                    'line-number' => $b['line-number'] ?? null,
                    'column-number' => $b['column-number'] ?? null,
                    'status-code' => $b['status-code'] ?? null,
                    'original-policy' => $b['original-policy'] ?? null,
                ];
            }
        }
    }
}

// Si no pudimos parsear nada, responder 204 para no romper el flujo del navegador
if (!$entries) {
    http_response_code(204);
    exit;
}

// Rotación diaria del log
$date = gmdate('Y-m-d');
$log = __DIR__ . DIRECTORY_SEPARATOR . 'csp-violations-' . $date . '.jsonl';

$fh = @fopen($log, 'ab');
if ($fh) {
    foreach ($entries as $entry) {
        fwrite($fh, json_encode($entry, JSON_UNESCAPED_SLASHES) . "\n");
    }
    fclose($fh);
    http_response_code(204);
} else {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unable to open log file.';
}

// Fin
?>