$schemaCsv = Import-Csv -Path "database/seed/destinations/sample.schema.csv"
$demoCsv = Import-Csv -Path "database/seed/destinations/demo_destinations_seed.csv"

Write-Host "=== 1. HEADER INTEGRITY CHECK ==="
$schemaHeaders = ($schemaCsv[0].PSObject.Properties.Name) -join ","
$demoHeaders = ($demoCsv[0].PSObject.Properties.Name) -join ","
if ($schemaHeaders -eq $demoHeaders) {
    Write-Host "SUCCESS: Headers match perfectly:"
    Write-Host "  $demoHeaders"
} else {
    Write-Host "FAILURE: Headers mismatch!"
    exit 1
}

Write-Host ""
Write-Host "=== 2. LOCALITY DISTRIBUTION CHECK ==="
Write-Host "Total records: $($demoCsv.Count)"
$groups = $demoCsv | Group-Object province
foreach ($g in $groups) {
    Write-Host "  * $($g.Name): $($g.Count) destinations"
}

Write-Host ""
Write-Host "=== 3. RECORD DATA INTEGRITY CHECK ==="
$errors = 0
foreach ($row in $demoCsv) {
    $lat = [double]$row.latitude
    $lng = [double]$row.longitude
    if ($lat -lt 8.0 -or $lat -gt 24.0 -or $lng -lt 102.0 -or $lng -gt 110.0) {
        Write-Host "ERROR: Coords outside VN in: $($row.name) ($lat, $lng)"
        $errors++
    }

    $pMin = [decimal]$row.price_min
    $pMax = [decimal]$row.price_max
    if ($pMin -lt 0 -or $pMax -lt $pMin) {
        Write-Host "ERROR: Invalid price in: $($row.name) (min: $pMin, max: $pMax)"
        $errors++
    }

    try {
        $json = $row.opening_hours | ConvertFrom-Json
        if (-not $json.mon -or -not $json.sun) {
            Write-Host "ERROR: Incomplete 7-day opening_hours in: $($row.name)"
            $errors++
        }
    } catch {
        Write-Host "ERROR: Invalid JSON in: $($row.name)"
        $errors++
    }

    if (-not $row.source_url.StartsWith("http")) {
        Write-Host "ERROR: Invalid URL in: $($row.name) ($($row.source_url))"
        $errors++
    }

    if (-not $row.verified_at) {
        Write-Host "ERROR: Missing verified_at in: $($row.name)"
        $errors++
    }
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "=== RESULT: ALL $($demoCsv.Count) RECORDS PASSED ALL INTEGRITY & VALIDATION TESTS! ==="
} else {
    Write-Host "=== RESULT: FOUND $errors INTEGRITY ISSUES! ==="
    exit 1
}
