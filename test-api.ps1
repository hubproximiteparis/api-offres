$uri = "http://localhost:3000/submit"

$body = @{
    email       = "test@test.com"
    nom         = "Test"
    prenom      = "User"
    metier      = "Dev"
    code_postal = "75000"
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
    -Uri $uri `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
