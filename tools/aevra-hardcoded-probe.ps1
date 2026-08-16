$ErrorActionPreference = 'Stop'
Invoke-RestMethod -Method Post -Uri 'https://atxthpnnyqjfgjxbtizr.supabase.co/functions/v1/aevra-local-status-20260816?token=4f11da70321bb7376ec451f61c8d34523c8ec8083b74faa419174621c40916eb&run_id=hardcoded-probe&stage=probe&status=ok' -ContentType 'application/json' -Body '{"detail":{"message":"runner-executed","computer":"John-PC"}}' | Out-Null
