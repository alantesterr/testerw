# Программа «Мои оценки» для StudyPlay: оценки из Platonus + расписание со ссылками из Timetable.
# Всё в одном окне: вход, подключение кнопок сайта, выбор браузера, «Получить всё».
# Запуск: двойной щелчок по StudyPlay.vbs

param(
    [string]$TestJournal,   # только для проверки: показать сохранённый journal.json
    [switch]$Auto,          # запуск кнопкой с сайта StudyPlay: получить оценки, отдать сайту и закрыться
    [switch]$Schedule       # вместе с -Auto: вместо оценок взять расписание с timetable.kgu.kz
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing, Microsoft.VisualBasic
[Windows.Forms.Application]::EnableVisualStyles()
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Base     = 'https://platonus.kgu.kz'
$TT       = 'https://timetable.kgu.kz'
$SiteUrl  = 'https://alantesterr.github.io/testerw/'
$Here     = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfgPath  = Join-Path $Here 'config.json'
$Launcher = Join-Path $Here 'StudyPlay.vbs'
$NetRx    = '\(50[234]\)|шлюз|недоступ|тайм-?аут|timed out|соедин|connect|resolve|разреш'

# ---------- настройки: логины, зашифрованные пароли, браузер ----------
# Пароли шифруются средствами Windows: расшифровать можно только под вашей учётной записью на этом ПК.
function Load-Config {
    if (Test-Path $cfgPath) { try { return (Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json) } catch {} }
    [pscustomobject]@{ login = '' }
}
function Write-Config($o) { [IO.File]::WriteAllText($cfgPath, (([pscustomobject]$o) | ConvertTo-Json), (New-Object Text.UTF8Encoding($false))) }
function Protect($pw) { ConvertTo-SecureString $pw -AsPlainText -Force | ConvertFrom-SecureString }
function Unprotect($enc) {
    if (-not $enc) { return '' }
    try {
        $sec = ConvertTo-SecureString $enc
        [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    } catch { '' }
}
# Логин и пароль для Platonus и для Timetable (по умолчанию — одни и те же)
function Get-Creds($c) {
    $pl = @{ login = [string]$c.login; pw = (Unprotect $c.savedPassword) }
    $tt = $pl
    if ($c.ttSame -eq $false) { $tt = @{ login = [string]$c.ttLogin; pw = (Unprotect $c.ttSavedPassword) } }
    @{ pl = $pl; tt = $tt }
}

# ---------- работа с сайтами ----------
function Read-Utf8($resp) {
    $ms = New-Object IO.MemoryStream
    $resp.RawContentStream.Position = 0
    $resp.RawContentStream.CopyTo($ms)
    [Text.Encoding]::UTF8.GetString($ms.ToArray()).TrimStart([char]0xFEFF)
}
function Get-Text($url) {
    Read-Utf8 (Invoke-WebRequest -UseBasicParsing -WebSession $script:Web -Headers $script:Auth $url)
}
function Post-Json($url, $obj) {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress))
    try {
        $r = Invoke-WebRequest -UseBasicParsing -WebSession $script:Web -Method Post -Uri $url `
             -ContentType 'application/json; charset=UTF-8' -Headers @{ language = '1' } -Body $bytes
        return ((Read-Utf8 $r) | ConvertFrom-Json)
    } catch {
        $msg = $_.ErrorDetails.Message
        if ($msg) { try { return ($msg | ConvertFrom-Json) } catch {} }
        throw
    }
}
function Json-Array($text) { @(($text | ConvertFrom-Json) | ForEach-Object { $_ }) }

function Clean-Name($n) { ($n -replace '\(_[^)]*\)\s*$', '').Trim() }
function Lesson-Type($n) {
    $suffix = ($n.Trim() -split '-')[-1]
    switch -Regex ($suffix) {
        '^Lab$' { 'Лабораторная' }
        '^L$'   { 'Лекция' }
        '^(P|S)$' { 'Практика' }
        '^SRO|^SRS' { 'СРО' }
        default { $n.Trim() }
    }
}
function Fmt($v) {
    if ($v -is [double] -or $v -is [decimal] -or $v -is [int]) {
        if ([math]::Floor($v) -eq $v) { return ([int]$v).ToString() }
        return ([double]$v).ToString('0.##', [Globalization.CultureInfo]::InvariantCulture)
    }
    "$v"
}
function Friendly($msg, $site) {
    if ($msg -match $NetRx) {
        if ($site -eq 'pl') { return 'Platonus сейчас не отвечает. Обычно он не работает ночью — примерно с 23:00 до 7:00.' }
        return 'Timetable сейчас не отвечает. Попробуйте позже.'
    }
    $msg
}

# ---------- откат: не чаще 1 входа в минуту на каждый сайт (защита от блокировки) ----------
$CoolSec    = 60
$lastPath   = Join-Path $Here 'last-run.txt'
$ttLastPath = Join-Path $Here 'last-run-tt.txt'
function Cooldown-Left([string]$path = $lastPath) {
    try {
        $t = [long](Get-Content $path -Raw -ErrorAction Stop).Trim()
        $left = $CoolSec - ([DateTime]::UtcNow - [DateTime]::FromBinary($t)).TotalSeconds
        if ($left -gt 0) { return [int][math]::Ceiling($left) }
    } catch {}
    0
}
function Mark-Run([string]$path = $lastPath) { [IO.File]::WriteAllText($path, [string][DateTime]::UtcNow.ToBinary()) }

# ---------- Platonus: оценки ----------
function Login-Platonus($login, $password) {
    Invoke-WebRequest -UseBasicParsing "$Base/" -SessionVariable Web | Out-Null
    $script:Web = $Web
    $resp = Post-Json "$Base/rest/api/login" @{ login = $login; iin = $null; icNumber = $null; password = $password }
    if ($resp.login_status -eq 'verificationCode') {
        $code = [Microsoft.VisualBasic.Interaction]::InputBox("На почту $($resp.email) отправлен код подтверждения. Введите 6 цифр:", 'Код подтверждения', '')
        if (-not $code) { throw 'Вход отменён: код не введён.' }
        $resp = Post-Json "$Base/rest/api/verifyCode" @{ challengeId = $resp.challengeId; code = $code.Trim() }
    }
    if ($resp.login_status -ne 'success') { throw "Не удалось войти: $($resp.message)" }
    $script:Auth = @{ token = $resp.auth_token; sid = $resp.sid; language = '1' }
    Invoke-WebRequest -UseBasicParsing -WebSession $script:Web -Headers $script:Auth "$Base/login" | Out-Null
}

# Возвращает: Info (год/период), Summary (по предметам), Current (все текущие оценки)
function Build-Result($subjects, $marksBySubject, $year, $term) {
    $examNames = New-Object System.Collections.Generic.List[string]
    foreach ($subj in $subjects) { foreach ($e in @($subj.exams)) { if ($e.name -and -not $examNames.Contains($e.name)) { $examNames.Add($e.name) } } }

    $summary = @(); $current = @()
    foreach ($subj in $subjects) {
        $name = Clean-Name $subj.subjectName
        $row = [ordered]@{ 'Предмет' = $name }
        foreach ($n in $examNames) {
            $e = @($subj.exams) | Where-Object { $_.name -eq $n } | Select-Object -First 1
            $row[$n] = if ($e -and $e.mark -ne $null) { [string]$e.mark } else { '' }
        }
        $row['Преподаватель'] = $subj.tutorList
        $summary += [pscustomobject]$row

        $list = @()
        foreach ($ct in @($marksBySubject[[string]$subj.subjectID])) {
            if (-not $ct) { continue }
            foreach ($mProp in $ct.Marks.PSObject.Properties) {
                foreach ($dProp in $mProp.Value.Marks.PSObject.Properties) {
                    foreach ($m in @($dProp.Value)) {
                        if (-not ($m.MarkType -eq 1 -or $m.MarkType -eq 17 -or $m.MarkType -ge 100)) { continue }
                        $useName = $m.MarkType -ge 100 -or (($m.Mark -eq -1 -or $m.AddMarkTypeID -ne 0) -and $m.MarkName)
                        $val = if ($useName) { $m.MarkName } elseif ($m.Mark -eq -3) { 'т' } else { Fmt $m.Mark }
                        $d = $m.MarkDate
                        $list += [pscustomobject]([ordered]@{
                            'Предмет'     = $name
                            'Вид занятия' = Lesson-Type $ct.Name
                            'Дата'        = (Get-Date -Year $d.Year -Month $d.Month -Day $d.Day).Date
                            'Оценка'      = [string]$val
                        })
                    }
                }
            }
        }
        $current += @($list | Sort-Object 'Дата')
    }
    [pscustomobject]@{ Year = $year; Term = $term; Taken = Get-Date; Summary = $summary; Current = $current }
}

function Fetch-Grades($login, $password, $status) {
    $left = Cooldown-Left
    if ($left -gt 0) { throw "Откат: ещё $left сек. Обновлять из Platonus можно не чаще раза в минуту — это защита от блокировки." }
    Mark-Run
    $status.Invoke('Вход на platonus.kgu.kz...')
    Login-Platonus $login $password
    $status.Invoke('Открываю журнал оценок...')
    $html = Get-Text "$Base/student_register"
    $studentID = [regex]::Match($html, 'name="studentID"\s+value="(\d+)"').Groups[1].Value
    $sel = { param($name)
        $s = [regex]::Match($html, "(?is)<select[^>]*name=""$name""[^>]*>(.*?)</select>").Groups[1].Value
        [regex]::Match($s, '(?i)VALUE="(-?\d+)"\s*selected').Groups[1].Value }
    $year = & $sel 'year'; $term = & $sel 'term'
    if (-not $studentID -or -not $year -or -not $term) { throw 'Не удалось определить студента или семестр на странице журнала.' }

    $subjects = Json-Array (Get-Text "$Base/journal/$year/$term/$studentID")
    $marks = @{}
    $i = 0
    foreach ($subj in $subjects) {
        $i++; $status.Invoke("Загружаю текущие оценки ($i из $($subjects.Count))...")
        try { $marks[[string]$subj.subjectID] = Json-Array (Get-Text "$Base/subject/$year/$term/$($subj.subjectID)/$studentID`?queryID=$($subj.queryID)") }
        catch { $marks[[string]$subj.subjectID] = @() }
    }
    Build-Result $subjects $marks $year $term
}

# ---------- Timetable: расписание и ссылки преподавателей ----------
# Берём последние 8 недель и следующую: расписание сайт возьмёт с текущей недели,
# а ссылки преподавателей (поле «Мессенджер») — со всех недель, по датам.
function Post-Form($url, $fields) {
    $body = ($fields.GetEnumerator() | ForEach-Object { [uri]::EscapeDataString($_.Key) + '=' + [uri]::EscapeDataString([string]$_.Value) }) -join '&'
    Read-Utf8 (Invoke-WebRequest -UseBasicParsing -WebSession $script:TtWeb -Method Post -Uri $url `
        -ContentType 'application/x-www-form-urlencoded; charset=UTF-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)))
}
function This-Monday { $t = (Get-Date).Date; $t.AddDays(-(([int]$t.DayOfWeek + 6) % 7)) }
function Timetable-Weeks($page) {
    $thisMon = This-Monday
    $all = @([regex]::Matches($page, '<option[^>]*>(\d{2})-(\d{2})-(\d{4})</option>') | ForEach-Object {
        New-Object DateTime ([int]$_.Groups[3].Value), ([int]$_.Groups[2].Value), ([int]$_.Groups[1].Value) })
    $pick = @($all | Where-Object { $_ -ge $thisMon.AddDays(-56) -and $_ -le $thisMon.AddDays(7) } | Sort-Object)
    if (-not $pick) { $pick = @($thisMon) }
    $pick
}
# Вход в Timetable; возвращает страницу «Студент сабақ кестесі» и ID студента
function Login-Timetable($login, $password) {
    Invoke-WebRequest -UseBasicParsing "$TT/index.php?page=login" -SessionVariable tw | Out-Null
    $script:TtWeb = $tw
    Post-Form "$TT/index.php?page=login" ([ordered]@{ language = '1'; username = $login; password = $password; subEnter = 'Войти' }) | Out-Null
    $page = Read-Utf8 (Invoke-WebRequest -UseBasicParsing -WebSession $script:TtWeb "$TT/index.php?page=student_timetable")
    $sid = [regex]::Match($page, 'id="STstudentID"\s+value="(\d+)"').Groups[1].Value
    if (-not $sid -or $sid -eq '0') { throw 'Не удалось войти в Timetable: проверьте логин и пароль.' }
    @{ page = $page; sid = $sid }
}
function Fetch-Timetable($login, $password, $status) {
    $left = Cooldown-Left $ttLastPath
    if ($left -gt 0) { throw "Откат: ещё $left сек. Обновлять расписание можно не чаще раза в минуту." }
    Mark-Run $ttLastPath
    $status.Invoke('Вход на timetable.kgu.kz...')
    $li = Login-Timetable $login $password
    $pick = Timetable-Weeks $li.page
    $weeks = @(); $i = 0
    foreach ($m in $pick) {
        $i++; $status.Invoke("Загружаю расписание ($i из $($pick.Count))...")
        $html = Post-Form "$TT/ajax/load_student_table.php" ([ordered]@{ studentID = $li.sid; begd = $m.ToString('dd'); begm = $m.ToString('MM'); begy = $m.ToString('yyyy') })
        $weeks += [ordered]@{ monday = $m.ToString('yyyy-MM-dd'); html = (Slim-Html $html) }
        Start-Sleep -Milliseconds 150
    }
    [ordered]@{ format = 'studyplay-timetable'; version = 1; taken = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss'); weeks = $weeks }
}
# Убираем из таблицы лишнее (скрипты кнопок, стили) — ссылка остаётся в value=""
function Slim-Html($html) { ($html -replace '\s(onclick|style)="[^"]*"', '') -replace '\s{2,}', ' ' }

# Разбор таблицы Timetable для окна: занятия текущей недели и все ссылки
function Timetable-Rows($tt) {
    $dec = { param($s) ([Net.WebUtility]::HtmlDecode([string]$s) -replace '\s+', ' ').Trim() }
    $all = @()
    foreach ($w in $tt.weeks) {
        $mon = [datetime]::ParseExact($w.monday, 'yyyy-MM-dd', $null)
        foreach ($tr in ([regex]::Split($w.html, '<tr>'))) {
            $tm = [regex]::Match($tr, '^\s*<td>\s*(\d{1,2}:\d{2}):\d{2}\s*<br>\s*(\d{1,2}:\d{2})')
            if (-not $tm.Success) { continue }
            $cells = $tr -split '<td class="mycell"'
            for ($d = 1; $d -lt $cells.Count -and $d -le 6; $d++) {
                foreach ($blk in (($cells[$d] -split '<div title=') | Select-Object -Skip 1)) {
                    $name = & $dec ([regex]::Match($blk, '(?s)<b>(.*?)</b>').Groups[1].Value)
                    if (-not $name) { continue }
                    $kind = & $dec ([regex]::Match($blk, '(?s)</b>([^<]*)<br>').Groups[1].Value)
                    $all += [pscustomobject]@{
                        Date = $mon.AddDays($d - 1); Start = $tm.Groups[1].Value; End = $tm.Groups[2].Value
                        Name = ($name + ' ' + $kind).Trim()
                        Room = & $dec ([regex]::Match($blk, '(?s)</b>[^<]*<br>([^<]*)<br>').Groups[1].Value)
                        Teacher = & $dec ([regex]::Match($blk, '(?s)<input[^>]*>\s*<br>(.*?)<a').Groups[1].Value)
                        Link = & $dec ([regex]::Match($blk, 'class="text_conf"[^>]*?value="([^"]*)"').Groups[1].Value)
                    }
                }
            }
        }
    }
    # неделя для показа — текущая, а если в ней пар нет — ближайшая следующая или последняя
    $thisMon = This-Monday
    $mons = @($all | ForEach-Object { $_.Date.AddDays(-(([int]$_.Date.DayOfWeek + 6) % 7)) } | Sort-Object -Unique)
    $show = @($mons | Where-Object { $_ -eq $thisMon }) + @($mons | Where-Object { $_ -gt $thisMon }) + @($mons | Sort-Object -Descending) | Select-Object -First 1
    $culture = [Globalization.CultureInfo]::GetCultureInfo('ru-RU')
    $row = { param($x) [pscustomobject]([ordered]@{
        'Дата' = $x.Date.ToString('dd.MM, ddd', $culture); 'Время' = "$($x.Start)–$($x.End)"; 'Предмет' = $x.Name
        'Аудитория' = $x.Room; 'Преподаватель' = $x.Teacher; 'Ссылка' = $x.Link }) }
    $week = @($all | Where-Object { $show -and $_.Date -ge $show -and $_.Date -lt $show.AddDays(7) } | Sort-Object Date, Start | ForEach-Object { & $row $_ })
    $links = @($all | Where-Object { $_.Link } | Sort-Object @{ e = 'Date'; Descending = $true }, Start | ForEach-Object { & $row $_ })
    @{ Week = $week; Links = $links }
}

# ---------- текст для мессенджера ----------
function To-Text($res) {
    $sb = New-Object Text.StringBuilder
    [void]$sb.AppendLine("Оценки на $($res.Taken.ToString('dd.MM.yyyy HH:mm')) ($($res.Year) г., период $($res.Term))")
    foreach ($s in $res.Summary) {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine("📘 $($s.'Предмет')")
        $parts = foreach ($p in $s.PSObject.Properties) {
            if ($p.Name -in 'Предмет', 'Преподаватель' -or -not $p.Value) { continue }
            "$($p.Name) $($p.Value)"
        }
        if ($parts) { [void]$sb.AppendLine(($parts -join ' | ')) }
        $cur = @($res.Current | Where-Object { $_.'Предмет' -eq $s.'Предмет' })
        if ($cur) { [void]$sb.AppendLine('Текущие: ' + (($cur | ForEach-Object { "$($_.'Дата'.ToString('dd.MM')) — $($_.'Оценка')" }) -join ', ')) }
    }
    $sb.ToString().TrimEnd()
}

# ---------- данные для сайта StudyPlay ----------
# Только оценки и расписание: логина, пароля и ID студента там нет.
function StudyPlay-Json($res, $tt) {
    $subs = foreach ($s in @($res.Summary)) {
        if (-not $s) { continue }
        $ex = [ordered]@{}
        foreach ($p in $s.PSObject.Properties) { if ($p.Name -notin 'Предмет', 'Преподаватель' -and "$($p.Value)" -ne '') { $ex[$p.Name] = [string]$p.Value } }
        $cur = @($res.Current | Where-Object { $_.'Предмет' -eq $s.'Предмет' } | ForEach-Object {
            [ordered]@{ type = $_.'Вид занятия'; date = $_.'Дата'.ToString('yyyy-MM-dd'); mark = [string]$_.'Оценка' } })
        [ordered]@{ subject = $s.'Предмет'; tutor = [string]$s.'Преподаватель'; exams = $ex; current = $cur }
    }
    $taken = if ($res) { $res.Taken } else { Get-Date }
    $o = [ordered]@{
        format = 'studyplay-grades'; version = 1
        taken = $taken.ToString('yyyy-MM-ddTHH:mm:ss'); year = [string]$res.Year; term = [string]$res.Term
        subjects = @($subs)
    }
    if ($tt) { $o.timetable = $tt }   # расписание со ссылками — сайт подхватит его вместе с оценками
    $o | ConvertTo-Json -Depth 8 -Compress
}
function Pack-B64($json) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $ms = New-Object IO.MemoryStream
    $z = New-Object IO.Compression.DeflateStream($ms, [IO.Compression.CompressionMode]::Compress)
    $z.Write($bytes, 0, $bytes.Length); $z.Close()
    [Convert]::ToBase64String($ms.ToArray()).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
function StudyPlay-B64($res) { Pack-B64 (StudyPlay-Json $res $null) }

# ---------- подключение кнопок сайта (ссылка studyplay-grades: → эта программа) ----------
# Только для текущего пользователя Windows. Работает во всех браузерах сразу:
# каждый браузер один раз спросит «Открыть приложение?».
$ProtoKey = 'HKCU:\Software\Classes\studyplay-grades'
function Link-Command { '"' + "$env:SystemRoot\System32\wscript.exe" + '" "' + $Launcher + '" -Auto "%1"' }
function Link-State {
    try { $cmd = (Get-ItemProperty "$ProtoKey\shell\open\command" -ErrorAction Stop).'(default)' } catch { return 'off' }
    if ($cmd -eq (Link-Command)) { 'on' } else { 'old' }
}
function Link-On {
    foreach ($k in $ProtoKey, "$ProtoKey\shell", "$ProtoKey\shell\open", "$ProtoKey\shell\open\command") { if (-not (Test-Path $k)) { New-Item -Path $k | Out-Null } }
    Set-ItemProperty -Path $ProtoKey -Name '(default)' -Value 'URL:StudyPlay Grades'
    New-ItemProperty -Path $ProtoKey -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
    Set-ItemProperty -Path "$ProtoKey\shell\open\command" -Name '(default)' -Value (Link-Command)
}
function Link-Off { if (Test-Path $ProtoKey) { Remove-Item -Path $ProtoKey -Recurse -Force } }

# ---------- браузеры: установленные, и какие сейчас открыты ----------
function Get-Browsers {
    $list = @(); $seen = @{}
    foreach ($root in 'HKCU:\SOFTWARE\Clients\StartMenuInternet', 'HKLM:\SOFTWARE\Clients\StartMenuInternet', 'HKLM:\SOFTWARE\WOW6432Node\Clients\StartMenuInternet') {
        foreach ($k in @(Get-ChildItem $root -ErrorAction SilentlyContinue)) {
            $cmd = (Get-ItemProperty (Join-Path $k.PSPath 'shell\open\command') -ErrorAction SilentlyContinue).'(default)'
            if (-not $cmd) { continue }
            $exe = if ($cmd -match '^\s*"([^"]+)"') { $Matches[1] } else { ($cmd -split '\s+')[0] }
            if ($exe -match 'iexplore' -or -not (Test-Path $exe) -or $seen[$exe.ToLower()]) { continue }
            $seen[$exe.ToLower()] = 1
            $name = (Get-ItemProperty $k.PSPath -ErrorAction SilentlyContinue).'(default)'; if (-not $name) { $name = $k.PSChildName }
            $wins = @(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exe)) -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle })
            $list += [pscustomobject]@{ Name = $name; Path = $exe; Open = ($wins.Count -gt 0); HasSP = [bool]@($wins | Where-Object { $_.MainWindowTitle -like '*StudyPlay*' }).Count }
        }
    }
    $list
}

# ---------- Excel ----------
function Save-Excel($sheets, $path) {
    $fill = {
        param($ws, $rows)
        if (-not $rows) { $ws.Cells.Item(1, 1) = 'Нет данных'; return }
        $cols = @($rows[0].PSObject.Properties.Name)
        $data = New-Object 'object[,]' ($rows.Count + 1), $cols.Count
        for ($c = 0; $c -lt $cols.Count; $c++) { $data[0, $c] = $cols[$c] }
        for ($r = 0; $r -lt $rows.Count; $r++) {
            for ($c = 0; $c -lt $cols.Count; $c++) {
                $v = $rows[$r].($cols[$c])
                $data[($r + 1), $c] = if ($v -is [datetime]) { $v.ToString('dd.MM.yyyy') } else { [string]$v }
            }
        }
        $ws.Range($ws.Cells.Item(1, 1), $ws.Cells.Item($rows.Count + 1, $cols.Count)).Value2 = $data
        $ws.Rows.Item(1).Font.Bold = $true
        $ws.UsedRange.Columns.AutoFit() | Out-Null
    }
    $xl = New-Object -ComObject Excel.Application
    $xl.DisplayAlerts = $false
    try {
        $wb = $xl.Workbooks.Add()
        while ($wb.Worksheets.Count -lt $sheets.Count) { $wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) | Out-Null }
        $i = 0
        foreach ($s in $sheets) { $i++; $ws = $wb.Worksheets.Item($i); $ws.Name = $s.Name; & $fill $ws @($s.Rows) }
        $wb.SaveAs($path, 51); $wb.Close()
    } finally {
        $xl.Quit()
        [Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
    }
}

# ---------- таблица для окна ----------
function To-DataTable($rows) {
    $dt = New-Object Data.DataTable
    if (-not $rows) { return ,$dt }
    foreach ($n in $rows[0].PSObject.Properties.Name) { [void]$dt.Columns.Add($n) }
    foreach ($r in $rows) {
        $dr = $dt.NewRow()
        foreach ($p in $r.PSObject.Properties) { $dr[$p.Name] = if ($p.Value -is [datetime]) { $p.Value.ToString('dd.MM.yyyy') } else { [string]$p.Value } }
        $dt.Rows.Add($dr)
    }
    ,$dt
}

# ===== Тихий запуск с сайта: пароль сохранён — окно не показываем =====
# Кнопка «Обновить из Platonus» — только оценки, «Обновить расписание» (-Schedule) — только расписание.
# Результат кладётся в буфер обмена для вкладки StudyPlay, программа закрывается.
if ($Auto) {
    $c0 = Load-Config; $cr0 = Get-Creds $c0
    $top0 = New-Object Windows.Forms.Form; $top0.TopMost = $true   # чтобы сообщения не прятались за браузер
    $who = if ($Schedule) { $cr0.tt } else { $cr0.pl }
    if ($who.login -and $who.pw) {
        if ((Cooldown-Left $(if ($Schedule) { $ttLastPath } else { $lastPath })) -gt 0) { return }   # откат ещё идёт — сайт попробует позже
        try {
            if ($Schedule) {
                $tt = Fetch-Timetable $who.login $who.pw ([Action[string]]{ param($t) })
                [Windows.Forms.Clipboard]::SetText('studyplay-timetable:' + (Pack-B64 ($tt | ConvertTo-Json -Depth 6 -Compress)))
            } else {
                $res = Fetch-Grades $who.login $who.pw ([Action[string]]{ param($t) })
                [Windows.Forms.Clipboard]::SetText('studyplay-grades:' + (StudyPlay-B64 $res))
            }
        } catch {
            # сайт не отвечает (у Platonus ночной перерыв ~23:00–7:00, 502 и т. п.) — при запуске с сайта молчим
            if ($_.Exception.Message -match $NetRx) { return }
            $what = if ($Schedule) { 'расписание' } else { 'оценки' }
            [Windows.Forms.MessageBox]::Show($top0, "Не удалось получить $($what): $($_.Exception.Message)", 'StudyPlay', 'OK', 'Warning') | Out-Null
        }
        return
    }
    if ($Schedule) {   # пароль ещё не сохранён
        [Windows.Forms.MessageBox]::Show($top0, 'Сначала откройте программу (StudyPlay.vbs), введите логин и пароль, отметьте «Запомнить пароль» и нажмите «Получить всё». После этого кнопка «Обновить расписание» заработает.', 'StudyPlay', 'OK', 'Information') | Out-Null
        return
    }
    # оценки без сохранённого пароля — покажем окно (ниже), после «Получить всё» оно закроется само
}

# ================= ОКНО =================
$cfg  = Load-Config
$font = New-Object Drawing.Font('Segoe UI', 10)
$blue = [Drawing.Color]::FromArgb(37, 99, 235)

$form = New-Object Windows.Forms.Form
$form.Text = 'StudyPlay — оценки и расписание'
$form.Size = New-Object Drawing.Size(1060, 760)
$form.MinimumSize = New-Object Drawing.Size(860, 600)
$form.StartPosition = 'CenterScreen'
$form.Font = $font

function New-Label($text) { $l = New-Object Windows.Forms.Label; $l.Text = $text; $l.AutoSize = $true; $l.Margin = New-Object Windows.Forms.Padding(0, 7, 4, 0); $l }
function New-Row { $p = New-Object Windows.Forms.FlowLayoutPanel; $p.AutoSize = $true; $p.WrapContents = $false; $p.Margin = New-Object Windows.Forms.Padding(0, 0, 0, 2); $p }
function New-Btn($text, $enabled = $true) { $b = New-Object Windows.Forms.Button; $b.Text = $text; $b.AutoSize = $true; $b.Height = 30; $b.Enabled = $enabled; $b }
function New-Group($text) {
    $g = New-Object Windows.Forms.GroupBox; $g.Text = $text; $g.Dock = 'Top'
    $g.Padding = New-Object Windows.Forms.Padding(10, 4, 10, 8)
    $s = New-Object Windows.Forms.FlowLayoutPanel; $s.FlowDirection = 'TopDown'; $s.WrapContents = $false; $s.AutoSize = $true
    $s.Location = New-Object Drawing.Point(10, 22)
    $g.Controls.Add($s); $g.Tag = $s; $g
}
# высота рамки — по содержимому (без пустого места снизу)
function Fit-Group($g) { $g.Height = $g.Tag.GetPreferredSize([Drawing.Size]::Empty).Height + 32
}

# --- 1. Вход ---
$grpLogin = New-Group '1. Вход'
$tbLogin = New-Object Windows.Forms.TextBox; $tbLogin.Width = 180; $tbLogin.Text = $cfg.login
$tbPass  = New-Object Windows.Forms.TextBox; $tbPass.Width = 140; $tbPass.UseSystemPasswordChar = $true
$tbPass.Text = Unprotect $cfg.savedPassword
$cbRemember = New-Object Windows.Forms.CheckBox; $cbRemember.Text = 'Запомнить пароль'; $cbRemember.AutoSize = $true; $cbRemember.Margin = New-Object Windows.Forms.Padding(10, 6, 0, 0)
$cbRemember.Checked = [bool]$tbPass.Text -or -not $cfg.login
$r1 = New-Row; $r1.Controls.AddRange(@((New-Label 'Platonus — логин:'), $tbLogin, (New-Label 'пароль:'), $tbPass, $cbRemember))
$cbSame = New-Object Windows.Forms.CheckBox; $cbSame.Text = 'В Timetable тот же логин и пароль'; $cbSame.AutoSize = $true; $cbSame.Margin = New-Object Windows.Forms.Padding(3, 4, 0, 0)
$cbSame.Checked = -not ($cfg.ttSame -eq $false)
$tbTtLogin = New-Object Windows.Forms.TextBox; $tbTtLogin.Width = 180; $tbTtLogin.Text = [string]$cfg.ttLogin
$tbTtPass  = New-Object Windows.Forms.TextBox; $tbTtPass.Width = 140; $tbTtPass.UseSystemPasswordChar = $true
$tbTtPass.Text = Unprotect $cfg.ttSavedPassword
$rTt = New-Row; $rTt.Controls.AddRange(@((New-Label 'Timetable — логин:'), $tbTtLogin, (New-Label 'пароль:'), $tbTtPass)); $rTt.Visible = -not $cbSame.Checked
$btnCheck = New-Btn 'Проверить вход'
$lblCheck = New-Label ''
$r3 = New-Row; $r3.Controls.AddRange(@($cbSame, $btnCheck, $lblCheck))
$grpLogin.Tag.Controls.AddRange(@($r1, $r3, $rTt))

# --- 2. Связь с сайтом ---
$grpLink = New-Group '2. Связь с сайтом StudyPlay'
$lblLink = New-Label ''; $lblLink.Font = New-Object Drawing.Font('Segoe UI', 10, [Drawing.FontStyle]::Bold)
$btnLink = New-Btn ''
$btnLnk  = New-Btn 'Ярлык на рабочий стол'
$rl1 = New-Row; $rl1.Controls.AddRange(@((New-Label 'Кнопки на сайте:'), $lblLink, $btnLink, $btnLnk))
$cbBrowser = New-Object Windows.Forms.ComboBox; $cbBrowser.DropDownStyle = 'DropDownList'; $cbBrowser.Width = 330
$btnBrRefresh = New-Btn '↻'; $btnBrRefresh.Width = 34
$btnOpen = New-Btn 'Открыть StudyPlay'
$btnOpen.BackColor = $blue; $btnOpen.ForeColor = [Drawing.Color]::White; $btnOpen.FlatStyle = 'Flat'
$rl2 = New-Row; $rl2.Controls.AddRange(@((New-Label 'Открывать StudyPlay в:'), $cbBrowser, $btnBrRefresh, $btnOpen))
$lblLinkHint = New-Label 'Кнопки «Обновить из Platonus» и «Обновить расписание» работают во всех браузерах — каждый один раз спросит «Открыть приложение?».'
$lblLinkHint.ForeColor = [Drawing.Color]::DimGray; $lblLinkHint.Margin = New-Object Windows.Forms.Padding(3, 2, 0, 2)
$grpLink.Tag.Controls.AddRange(@($rl1, $rl2, $lblLinkHint))

# --- 3. Получить всё ---
$act = New-Object Windows.Forms.FlowLayoutPanel; $act.Dock = 'Top'; $act.Height = 46; $act.WrapContents = $false; $act.Padding = New-Object Windows.Forms.Padding(8, 8, 8, 0)
$btnFetch = New-Btn 'Получить всё (оценки + расписание)'
$btnFetch.BackColor = $blue; $btnFetch.ForeColor = [Drawing.Color]::White; $btnFetch.FlatStyle = 'Flat'
$lblStatus = New-Label 'Введите логин и пароль и нажмите «Получить всё».'; $lblStatus.Margin = New-Object Windows.Forms.Padding(12, 7, 0, 0)
$act.Controls.AddRange(@($btnFetch, $lblStatus))

# --- нижняя панель ---
$bottom = New-Object Windows.Forms.FlowLayoutPanel
$bottom.Dock = 'Bottom'; $bottom.Height = 46; $bottom.Padding = New-Object Windows.Forms.Padding(8, 8, 8, 0); $bottom.WrapContents = $false
$btnSP   = New-Btn 'Файл для StudyPlay' $false
$btnSave = New-Btn 'Сохранить в Excel' $false
$btnCopy = New-Btn 'Скопировать оценки текстом' $false
$btnShow = New-Btn 'Показать файл' $false
$bottom.Controls.AddRange(@($btnSP, $btnSave, $btnCopy, $btnShow))

# --- вкладки с таблицами ---
$tabs = New-Object Windows.Forms.TabControl; $tabs.Dock = 'Fill'
function New-Grid {
    $g = New-Object Windows.Forms.DataGridView
    $g.Dock = 'Fill'; $g.ReadOnly = $true; $g.AllowUserToAddRows = $false; $g.RowHeadersVisible = $false
    $g.AutoSizeColumnsMode = 'AllCells'; $g.BackgroundColor = [Drawing.Color]::White; $g.BorderStyle = 'None'
    $g.SelectionMode = 'FullRowSelect'
    $g.ColumnHeadersDefaultCellStyle.Font = New-Object Drawing.Font('Segoe UI', 10, [Drawing.FontStyle]::Bold)
    $g
}
$gridSum = New-Grid; $gridCur = New-Grid; $gridTt = New-Grid; $gridLinks = New-Grid
foreach ($p in @(@('Итоговые (РК, экзамен)', $gridSum), @('Текущие оценки', $gridCur), @('Расписание (неделя)', $gridTt), @('Ссылки преподавателей', $gridLinks))) {
    $tp = New-Object Windows.Forms.TabPage; $tp.Text = $p[0]; $tp.Controls.Add($p[1]); $tabs.TabPages.Add($tp)
}

# порядок важен: последний добавленный «Top» оказывается выше всех
$form.Controls.Add($tabs); $form.Controls.Add($bottom); $form.Controls.Add($act); $form.Controls.Add($grpLink); $form.Controls.Add($grpLogin)
$form.AcceptButton = $btnFetch

$script:Result = $null; $script:Tt = $null; $script:TtRows = $null; $script:LastFile = $null; $script:Browsers = @()
$setStatus = [Action[string]]{ param($t) $lblStatus.Text = $t; $form.Refresh(); [Windows.Forms.Application]::DoEvents() }

# --- сохранение настроек из окна ---
function Save-Ui {
    $o = [ordered]@{ login = $tbLogin.Text.Trim(); ttSame = $cbSame.Checked }
    if ($cbRemember.Checked -and $tbPass.Text) { $o.savedPassword = Protect $tbPass.Text }
    if (-not $cbSame.Checked) {
        $o.ttLogin = $tbTtLogin.Text.Trim()
        if ($cbRemember.Checked -and $tbTtPass.Text) { $o.ttSavedPassword = Protect $tbTtPass.Text }
    }
    $b = Selected-Browser; if ($b) { $o.browser = $b.Path }
    Write-Config $o
}
function Ui-Creds {
    $pl = @{ login = $tbLogin.Text.Trim(); pw = $tbPass.Text }
    $tt = if ($cbSame.Checked) { $pl } else { @{ login = $tbTtLogin.Text.Trim(); pw = $tbTtPass.Text } }
    @{ pl = $pl; tt = $tt }
}
$cbSame.Add_CheckedChanged({ $rTt.Visible = -not $cbSame.Checked; Fit-Group $grpLogin; if (-not $cbSame.Checked -and -not $tbTtLogin.Text) { $tbTtLogin.Text = $tbLogin.Text } })

# --- связь с сайтом ---
function Show-LinkState {
    switch (Link-State) {
        'on'  { $lblLink.Text = '● подключены'; $lblLink.ForeColor = [Drawing.Color]::ForestGreen; $btnLink.Text = 'Отключить' }
        'old' { $lblLink.Text = '● подключены по-старому'; $lblLink.ForeColor = [Drawing.Color]::DarkOrange; $btnLink.Text = 'Обновить подключение' }
        default { $lblLink.Text = '● не подключены'; $lblLink.ForeColor = [Drawing.Color]::Firebrick; $btnLink.Text = 'Подключить' }
    }
}
$btnLink.Add_Click({
    try {
        if ((Link-State) -eq 'on') { Link-Off; $lblStatus.Text = 'Кнопки на сайте отключены.' }
        else { Link-On; $lblStatus.Text = 'Готово! Теперь на сайте работают «Обновить из Platonus» и «Обновить расписание».' }
    } catch { [Windows.Forms.MessageBox]::Show("Не получилось: $($_.Exception.Message)", 'StudyPlay', 'OK', 'Warning') | Out-Null }
    Show-LinkState
})
$btnLnk.Add_Click({
    try {
        $ws = New-Object -ComObject WScript.Shell
        $lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'StudyPlay — оценки и расписание.lnk'))
        $lnk.TargetPath = "$env:SystemRoot\System32\wscript.exe"; $lnk.Arguments = '"' + $Launcher + '"'
        $lnk.WorkingDirectory = $Here; $lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"; $lnk.Save()
        $lblStatus.Text = 'Ярлык «StudyPlay — оценки и расписание» добавлен на рабочий стол.'
    } catch { [Windows.Forms.MessageBox]::Show("Не получилось: $($_.Exception.Message)", 'StudyPlay', 'OK', 'Warning') | Out-Null }
})

# --- браузер: где открыт StudyPlay — тот и выбран ---
function Fill-Browsers {
    $keep = Selected-Browser
    $script:Browsers = @(Get-Browsers)
    $cbBrowser.Items.Clear(); [void]$cbBrowser.Items.Add('Браузер по умолчанию')
    foreach ($b in $script:Browsers) { [void]$cbBrowser.Items.Add($b.Name + $(if ($b.HasSP) { ' — открыт StudyPlay' } elseif ($b.Open) { ' — открыт' } else { '' })) }
    $want = if ($keep) { $keep.Path } else { [string]$cfg.browser }
    $idx = 0
    for ($i = 0; $i -lt $script:Browsers.Count; $i++) { if ($want -and $script:Browsers[$i].Path -eq $want) { $idx = $i + 1 } }
    if (-not $want) {
        $sp = [Array]::FindIndex([object[]]$script:Browsers, [Predicate[object]]{ param($b) $b.HasSP })
        $op = [Array]::FindIndex([object[]]$script:Browsers, [Predicate[object]]{ param($b) $b.Open })
        if ($sp -ge 0) { $idx = $sp + 1 } elseif ($op -ge 0) { $idx = $op + 1 }
    }
    $cbBrowser.SelectedIndex = $idx
}
function Selected-Browser { $i = $cbBrowser.SelectedIndex; if ($i -ge 1 -and $i -le $script:Browsers.Count) { $script:Browsers[$i - 1] } else { $null } }
function Open-Url($url) {
    $b = Selected-Browser
    if ($b) { Start-Process -FilePath $b.Path -ArgumentList ('"' + $url + '"') } else { Start-Process $url }
}
$btnBrRefresh.Add_Click({ Fill-Browsers })
$cbBrowser.Add_SelectionChangeCommitted({ try { Save-Ui } catch {} })

# --- показ результата ---
function Show-Result {
    if ($script:Result) {
        $gridSum.DataSource = (To-DataTable @($script:Result.Summary))
        $gridCur.DataSource = (To-DataTable @($script:Result.Current))
    }
    if ($script:Tt) {
        $script:TtRows = Timetable-Rows $script:Tt
        $gridTt.DataSource = (To-DataTable @($script:TtRows.Week))
        $gridLinks.DataSource = (To-DataTable @($script:TtRows.Links))
    }
    $any = [bool]($script:Result -or $script:Tt)
    $btnSP.Enabled = $any; $btnSave.Enabled = $any; $btnCopy.Enabled = [bool]$script:Result
}
# двойной щелчок по ссылке — открыть её
foreach ($g in $gridTt, $gridLinks) {
    $g.Add_CellDoubleClick({ param($s, $e)
        if ($e.RowIndex -lt 0 -or $e.ColumnIndex -lt 0) { return }
        if ($s.Columns[$e.ColumnIndex].Name -ne 'Ссылка') { return }
        $v = [string]$s.Rows[$e.RowIndex].Cells[$e.ColumnIndex].Value
        if ($v -match '^https?://') { Open-Url $v }
    })
}

# Запуск с сайта без сохранённого пароля: оценки кладутся в буфер обмена, вкладка StudyPlay забирает их сама
function Send-ToSite {
    [Windows.Forms.Clipboard]::SetText('studyplay-grades:' + (Pack-B64 (StudyPlay-Json $script:Result $script:Tt)))
    $lblStatus.Text = 'Готово! Возвращаю вас в StudyPlay…'
    $script:CloseTimer = New-Object Windows.Forms.Timer; $script:CloseTimer.Interval = 1500
    $script:CloseTimer.Add_Tick({ $script:CloseTimer.Stop(); $form.Close() }); $script:CloseTimer.Start()
}
if ($Auto) {
    $form.Add_Shown({
        if ($tbLogin.Text -and $tbPass.Text) { $btnFetch.PerformClick() }
        else { $lblStatus.Text = 'Введите логин и пароль, отметьте «Запомнить пароль» и нажмите «Получить всё».' }
    })
}

$btnFetch.Add_Click({
    $cr = Ui-Creds
    if (-not $cr.pl.login -or -not $cr.pl.pw -or -not $cr.tt.login -or -not $cr.tt.pw) { [Windows.Forms.MessageBox]::Show('Введите логин и пароль.', 'StudyPlay') | Out-Null; return }
    $btnFetch.Enabled = $false; $form.Cursor = 'WaitCursor'
    $errs = @()
    try {
        try { $script:Result = Fetch-Grades $cr.pl.login $cr.pl.pw $setStatus } catch { $errs += 'Оценки: ' + (Friendly $_.Exception.Message 'pl') }
        try { $script:Tt = Fetch-Timetable $cr.tt.login $cr.tt.pw $setStatus } catch { $errs += 'Расписание: ' + (Friendly $_.Exception.Message 'tt') }
        if ($errs.Count -lt 2) { Save-Ui }
        Show-Result
        $parts = @()
        if ($script:Result) { $parts += "предметов: $(@($script:Result.Summary).Count)" }
        if ($script:TtRows) { $parts += "занятий в неделю: $(@($script:TtRows.Week).Count), ссылок: $(@($script:TtRows.Links).Count)" }
        $lblStatus.Text = 'Обновлено ' + (Get-Date).ToString('dd.MM.yyyy HH:mm') + $(if ($parts) { ' · ' + ($parts -join ' · ') } else { '' })
        if ($errs) { [Windows.Forms.MessageBox]::Show(($errs -join "`n`n"), 'Не всё получилось', 'OK', 'Warning') | Out-Null }
        if ($Auto -and $script:Result) { Send-ToSite }
    } finally { $btnFetch.Enabled = $true; $form.Cursor = 'Default' }
})

$btnCheck.Add_Click({
    $cr = Ui-Creds
    if (-not $cr.pl.login -or -not $cr.pl.pw) { [Windows.Forms.MessageBox]::Show('Введите логин и пароль.', 'StudyPlay') | Out-Null; return }
    $form.Cursor = 'WaitCursor'; $lblCheck.Text = 'Проверяю…'; $form.Refresh()
    $out = @()
    $l = Cooldown-Left
    if ($l -gt 0) { $out += "Platonus: подождите $l сек" }
    else { try { Mark-Run; Login-Platonus $cr.pl.login $cr.pl.pw; $out += 'Platonus ✓' } catch { $out += 'Platonus ✗ ' + (Friendly $_.Exception.Message 'pl') } }
    $l = Cooldown-Left $ttLastPath
    if ($l -gt 0) { $out += "Timetable: подождите $l сек" }
    else { try { Mark-Run $ttLastPath; [void](Login-Timetable $cr.tt.login $cr.tt.pw); $out += 'Timetable ✓' } catch { $out += 'Timetable ✗ ' + (Friendly $_.Exception.Message 'tt') } }
    $lblCheck.Text = $out -join '   '
    if (($out -join ' ') -notmatch '✗') { try { Save-Ui } catch {} }
    $form.Cursor = 'Default'
})

$btnOpen.Add_Click({
    try {
        if ($script:Result -or $script:Tt) {
            # оценки и расписание едут в ссылке после # — эта часть никуда не отправляется
            $url = $SiteUrl + '?u=' + [DateTime]::Now.ToString('yyMMddHHmmss') + '#/grades/pl/' + (Pack-B64 (StudyPlay-Json $script:Result $script:Tt))
            if ($url.Length -gt 30000) { $url = $SiteUrl + '?u=' + [DateTime]::Now.ToString('yyMMddHHmmss') + '#/grades/pl/' + (Pack-B64 (StudyPlay-Json $script:Result $null)) }
            Open-Url $url
            $lblStatus.Text = 'Открываю StudyPlay… Данные загрузятся сами.'
        } else { Open-Url $SiteUrl }
    } catch {
        [Windows.Forms.MessageBox]::Show("Не удалось открыть сайт: $($_.Exception.Message)", 'Ошибка', 'OK', 'Warning') | Out-Null
    }
})

$btnSave.Add_Click({
    $dlg = New-Object Windows.Forms.SaveFileDialog
    $dlg.Filter = 'Книга Excel (*.xlsx)|*.xlsx'
    $dlg.FileName = 'StudyPlay_' + (Get-Date).ToString('yyyy-MM-dd') + '.xlsx'
    $dlg.InitialDirectory = [Environment]::GetFolderPath('MyDocuments')
    if ($dlg.ShowDialog($form) -ne 'OK') { return }
    $form.Cursor = 'WaitCursor'
    try {
        $setStatus.Invoke('Сохраняю в Excel...')
        $sheets = @()
        if ($script:Result) { $sheets += @{ Name = 'Итоговые'; Rows = $script:Result.Summary }, @{ Name = 'Текущие'; Rows = $script:Result.Current } }
        if ($script:TtRows) { $sheets += @{ Name = 'Расписание'; Rows = $script:TtRows.Week }, @{ Name = 'Ссылки'; Rows = $script:TtRows.Links } }
        Save-Excel $sheets $dlg.FileName
        $script:LastFile = $dlg.FileName; $btnShow.Enabled = $true
        $lblStatus.Text = "Сохранено: $($dlg.FileName)"
    } catch {
        [Windows.Forms.MessageBox]::Show("Не удалось сохранить: $($_.Exception.Message)", 'Ошибка', 'OK', 'Warning') | Out-Null
    } finally { $form.Cursor = 'Default' }
})

$btnSP.Add_Click({
    $dlg = New-Object Windows.Forms.SaveFileDialog
    $dlg.Filter = 'Файл для StudyPlay (*.json)|*.json'
    $dlg.FileName = 'studyplay_' + (Get-Date).ToString('yyyy-MM-dd') + '.json'
    $dlg.InitialDirectory = [Environment]::GetFolderPath('Desktop')
    if ($dlg.ShowDialog($form) -ne 'OK') { return }
    try {
        [IO.File]::WriteAllText($dlg.FileName, (StudyPlay-Json $script:Result $script:Tt), (New-Object Text.UTF8Encoding($false)))
        $script:LastFile = $dlg.FileName; $btnShow.Enabled = $true
        $lblStatus.Text = 'Готово! На сайте (и на телефоне): Оценки → Скачать → «Загрузить файл оценок» → этот файл.'
    } catch {
        [Windows.Forms.MessageBox]::Show("Не удалось сохранить: $($_.Exception.Message)", 'Ошибка', 'OK', 'Warning') | Out-Null
    }
})

$btnCopy.Add_Click({
    [Windows.Forms.Clipboard]::SetText((To-Text $script:Result))
    $lblStatus.Text = 'Скопировано! Вставьте в WhatsApp/Telegram через Ctrl+V.'
})

$btnShow.Add_Click({
    if ($script:LastFile -and (Test-Path $script:LastFile)) { Start-Process explorer.exe "/select,`"$($script:LastFile)`"" }
})

Show-LinkState
Fill-Browsers
Fit-Group $grpLogin; Fit-Group $grpLink

if ($TestJournal) {
    # режим проверки: показать сохранённые данные без входа на сайт
    $subjects = Json-Array ([IO.File]::ReadAllText($TestJournal, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF))
    $form.Add_Shown({ $script:Result = Build-Result $subjects @{} '2026' '1'; Show-Result })
}

[void]$form.ShowDialog()
