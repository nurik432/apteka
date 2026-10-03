<#
    Восстанавливает раздачу интернета (ICS) с Wi-Fi на кабельный интерфейс, к которому подключена ККМ.

    Зачем: Windows отдаёт ICS только одному подключению, а виртуальный коммутатор Hyper-V
    («vEthernet (Default Switch)») забирает его при каждой загрузке. После перезагрузки раздача
    на кабель становится пустышкой: адрес 192.168.137.1 на адаптере остаётся, но DHCP не работает,
    и ККМ остаётся без адреса. Скрипт снимает раздачу со всех подключений и включает нужную пару заново.

    Запуск без параметров — применить сейчас. С ключом -Install — ещё и поставить задачу на вход в систему.
#>
param(
    # Имена подключений как в ncpa.cpl
    [string]$Public  = 'Беспроводная сеть',
    [string]$Private = 'Ethernet',
    # При входе в систему Wi-Fi поднимается не сразу — ждём его
    [int]$WaitSeconds = 60,
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$logFile = Join-Path $PSScriptRoot 'database\ics.log'

function Write-Log($message) {
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
    Write-Host $line
    try {
        New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null
        Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
    } catch { }
}

function Assert-Admin {
    $identity = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    if (-not $identity.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Log 'ОШИБКА: нужны права администратора.'
        exit 1
    }
}

function Install-Task {
    $taskName = 'Аптека — сеть ККМ'
    $argument = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $PSCommandPath
    $action   = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument
    # Задержка нужна, чтобы Hyper-V успел поднять свой коммутатор: иначе он заберёт ICS после нас
    $trigger  = New-ScheduledTaskTrigger -AtLogOn
    $trigger.Delay = 'PT45S'
    $principal = New-ScheduledTaskPrincipal -UserId ('{0}\{1}' -f $env:USERDOMAIN, $env:USERNAME) -RunLevel Highest
    $settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
        -Principal $principal -Settings $settings -Force | Out-Null
    Write-Log "Задача «$taskName» поставлена на вход в систему (запуск через 45 секунд после входа)."
}

function Enable-Ics {
    # Ждём, пока появится источник интернета
    for ($i = 0; $i -lt $WaitSeconds; $i++) {
        $adapter = Get-NetAdapter -Name $Public -ErrorAction SilentlyContinue
        if ($adapter -and $adapter.Status -eq 'Up') { break }
        Start-Sleep -Seconds 1
    }

    $share = New-Object -ComObject HNetCfg.HNetShare
    $connections = @{}
    foreach ($connection in $share.EnumEveryConnection) {
        $name = $share.NetConnectionProps($connection).Name
        $connections[$name] = $share.INetSharingConfigurationForINetConnection($connection)
    }

    foreach ($name in @($Public, $Private)) {
        if (-not $connections.ContainsKey($name)) {
            Write-Log "ОШИБКА: подключение «$name» не найдено. Доступные: $($connections.Keys -join ', ')"
            exit 1
        }
    }

    # Снимаем раздачу отовсюду: Windows разрешает только одну пару, и занимает её обычно Hyper-V
    foreach ($entry in $connections.GetEnumerator()) {
        if ($entry.Value.SharingEnabled) {
            $entry.Value.DisableSharing()
            Write-Log "Снята раздача с «$($entry.Key)»."
        }
    }

    $connections[$Public].EnableSharing(0)   # 0 — источник интернета
    $connections[$Private].EnableSharing(1)  # 1 — сеть, куда раздаём
    Write-Log "Раздача включена: «$Public» → «$Private»."

    $address = Get-NetIPAddress -InterfaceAlias $Private -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '169.254.*' }
    if ($address) {
        Write-Log "Адрес на «$Private»: $($address.IPAddress)/$($address.PrefixLength)."
    } else {
        Write-Log "ВНИМАНИЕ: на «$Private» нет рабочего адреса."
    }
}

Assert-Admin
if ($Install) { Install-Task }
Enable-Ics
