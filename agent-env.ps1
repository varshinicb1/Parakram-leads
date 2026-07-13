# Agent-ready development shell bootstrap for this Windows workstation.
# Dot-source this file from PowerShell:
#   . "C:\Users\varsh\OneDrive\Documents\Varsh-PC\.codex-agent\agent-env.ps1"

$AgentEnvRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Add-AgentPath {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,
        [switch] $Append
    )

    $expanded = [Environment]::ExpandEnvironmentVariables($Path)
    if (-not (Test-Path -LiteralPath $expanded)) {
        return
    }

    $resolved = (Resolve-Path -LiteralPath $expanded).Path.TrimEnd('\')
    $parts = @($env:Path -split ';' | Where-Object { $_ -and $_.Trim() })
    $parts = @($parts | Where-Object {
        try {
            ((Resolve-Path -LiteralPath ([Environment]::ExpandEnvironmentVariables($_)) -ErrorAction Stop).Path.TrimEnd('\')) -ine $resolved
        } catch {
            $_.TrimEnd('\') -ine $resolved
        }
    })

    if ($Append) {
        $env:Path = (@($parts + $resolved) | Select-Object -Unique) -join ';'
    } else {
        $env:Path = (@($resolved) + $parts | Select-Object -Unique) -join ';'
    }
}

function Repair-AgentSessionPath {
    $seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $clean = foreach ($entry in ($env:Path -split ';')) {
        if (-not $entry -or -not $entry.Trim()) {
            continue
        }

        $expanded = [Environment]::ExpandEnvironmentVariables($entry.Trim())
        if (-not (Test-Path -LiteralPath $expanded)) {
            continue
        }

        $resolved = (Resolve-Path -LiteralPath $expanded).Path.TrimEnd('\')
        if ($seen.Add($resolved)) {
            $resolved
        }
    }

    $env:Path = ($clean -join ';')
}

function Initialize-AgentEnv {
    Repair-AgentSessionPath

    $env:JAVA_HOME = 'C:\Program Files\Zulu\zulu-17'
    $env:ANDROID_HOME = 'C:\Users\varsh\AppData\Local\Android\Sdk'
    $env:GOPATH = 'C:\Users\varsh\go'
    $env:NVM_HOME = 'C:\Users\varsh\AppData\Local\nvm'
    $env:NVM_SYMLINK = 'C:\nvm4w\nodejs'

    $preferredPaths = @(
        'C:\nvm4w\nodejs',
        'C:\Users\varsh\AppData\Roaming\npm',
        'C:\Users\varsh\.deno\bin',
        'C:\Users\varsh\.cargo\bin',
        'C:\Users\varsh\.dotnet\tools',
        'C:\Users\varsh\AppData\Local\Programs\Python\Python312\Scripts',
        'C:\Users\varsh\AppData\Local\Programs\Python\Python312',
        'C:\Program Files\Zulu\zulu-17\bin',
        'C:\Program Files\Git\cmd',
        'C:\Program Files\GitHub CLI',
        'C:\Program Files\dotnet',
        'C:\Program Files\Go\bin',
        'C:\Program Files\Docker\Docker\resources\bin',
        'C:\Program Files\CMake\bin',
        'C:\Program Files\PostgreSQL\18\bin',
        'C:\Users\varsh\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin',
        'C:\tools\flutter\bin',
        'C:\Users\varsh\AppData\Local\Pub\Cache\bin',
        'C:\ffmpeg\bin',
        'C:\Program Files\ImageMagick-7.1.2-Q16-HDRI',
        'C:\Users\varsh\AppData\Local\Programs\Microsoft VS Code\bin'
    )

    [array]::Reverse($preferredPaths)
    foreach ($p in $preferredPaths) {
        Add-AgentPath -Path $p
    }
}

function Get-AgentTool {
    $commands = @(
        'git','gh','node','npm','pnpm','yarn','deno','python','py','pip','uv',
        'dotnet','java','javac','go','rustc','cargo','docker','kubectl',
        'gcloud','vercel','supabase','firebase','psql','sqlcmd','code',
        'winget','choco','cmake','ffmpeg','magick','ollama','flutter','dart'
    )

    foreach ($cmd in $commands) {
        $found = Get-Command $cmd -ErrorAction SilentlyContinue
        [PSCustomObject]@{
            Command = $cmd
            Found = [bool] $found
            Source = if ($found) { $found.Source } else { '' }
        }
    }
}

function Test-AgentEnv {
    $required = @('git','node','npm','pnpm','python','py','uv','dotnet','java','go','cargo','docker','psql','gcloud')
    $tools = Get-AgentTool
    $missing = @($tools | Where-Object { $required -contains $_.Command -and -not $_.Found })

    $tools | Format-Table -AutoSize
    if ($missing.Count -gt 0) {
        Write-Warning ("Missing required tools: " + (($missing | ForEach-Object Command) -join ', '))
        return $false
    }

    Write-Host 'Agent environment check passed.' -ForegroundColor Green
    return $true
}

Set-Alias agent-tools Get-AgentTool
Set-Alias agent-env-check Test-AgentEnv

Initialize-AgentEnv
