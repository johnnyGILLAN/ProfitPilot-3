[CmdletBinding()]
param(
    [string]$CommandFile = 'C:\Users\jagma\start_aevra_strict_gate.cmd'
)

$process = Start-Process `
    -FilePath 'cmd.exe' `
    -ArgumentList @('/d', '/c', ('"{0}"' -f $CommandFile)) `
    -Wait `
    -PassThru `
    -NoNewWindow

exit $process.ExitCode
