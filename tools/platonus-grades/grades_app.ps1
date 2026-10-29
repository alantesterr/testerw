# Окно «Мои оценки»: получает актуальные оценки из Platonus (platonus.kgu.kz),
# показывает их, сохраняет в Excel и копирует текстом для мессенджеров.
# Запуск: двойной клик по «Оценки.bat»

param(
    [string]$TestJournal,   # только для проверки: показать сохранённый journal.json
    [switch]$Auto           # запуск кнопкой с сайта StudyPlay: получить оценки, отдать сайту и закрыться
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing, Microsoft.VisualBasic
[Windows.Forms.Application]::EnableVisualStyles()
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Base    = 'https://platonus.kgu.kz'
$Here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfgPath = Join-Path $Here 'config.json'

# ---------- настройки (логин и зашифрованный пароль) ----------
function Load-Config {
    if (Test-Path $cfgPath) { try { return (Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json) } catch {} }
    [pscustomobject]@{ login = '' }
}
function Save-Config($login, $password, $remember) {
    $o = [ordered]@{ login = $login }
    if ($remember -and $password) {
        # шифруется средствами Windows: расшифровать можно только под вашей учётной записью на этом ПК
        $o.savedPassword = ConvertTo-SecureString $password -AsPlainText -Force | ConvertFrom-SecureString
    }
    [IO.File]::WriteAllText($cfgPath, (([pscustomobject]$o) | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
}
function Unprotect($enc) {
    try {
        $sec = ConvertTo-SecureString $enc
        [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    } catch { '' }
}

# ---------- работа с сайтом ----------
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

# ---------- откат: не чаще 1 входа в Platonus в минуту (защита от блокировки) ----------
$CoolSec  = 60
$lastPath = Join-Path $Here 'last-run.txt'
function Cooldown-Left {
    try {
        $t = [long](Get-Content $lastPath -Raw -ErrorAction Stop).Trim()
        $left = $CoolSec - ([DateTime]::UtcNow - [DateTime]::FromBinary($t)).TotalSeconds
        if ($left -gt 0) { return [int][math]::Ceiling($left) }
    } catch {}
    0
}
function Mark-Run { [IO.File]::WriteAllText($lastPath, [string][DateTime]::UtcNow.ToBinary()) }

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

# ---------- файл для сайта StudyPlay ----------
# Только оценки: логина, пароля и ID студента в файле нет.
function Save-StudyPlay($res, $path) {
    [IO.File]::WriteAllText($path, (StudyPlay-Json $res), (New-Object Text.UTF8Encoding($false)))
}
function StudyPlay-Json($res) {
    $subs = foreach ($s in $res.Summary) {
        $ex = [ordered]@{}
        foreach ($p in $s.PSObject.Properties) { if ($p.Name -notin 'Предмет', 'Преподаватель' -and "$($p.Value)" -ne '') { $ex[$p.Name] = [string]$p.Value } }
        $cur = @($res.Current | Where-Object { $_.'Предмет' -eq $s.'Предмет' } | ForEach-Object {
            [ordered]@{ type = $_.'Вид занятия'; date = $_.'Дата'.ToString('yyyy-MM-dd'); mark = [string]$_.'Оценка' } })
        [ordered]@{ subject = $s.'Предмет'; tutor = [string]$s.'Преподаватель'; exams = $ex; current = $cur }
    }
    $o = [ordered]@{
        format = 'studyplay-grades'; version = 1
        taken = $res.Taken.ToString('yyyy-MM-ddTHH:mm:ss'); year = [string]$res.Year; term = [string]$res.Term
        subjects = @($subs)
    }
    $o | ConvertTo-Json -Depth 8 -Compress
}
# В каком браузере открыть сайт:
# 1) где сейчас открыт StudyPlay (видно по заголовку окна);
# 2) иначе — любой уже запущенный браузер; 3) иначе — браузер по умолчанию (вернёт $null).
function Find-Browser {
    $known = [ordered]@{ chrome = 'Google Chrome'; browser = 'Яндекс Браузер'; msedge = 'Microsoft Edge'; firefox = 'Firefox'; opera = 'Opera' }
    $wins = foreach ($k in $known.Keys) {
        Get-Process -Name $k -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and $_.Path } |
            ForEach-Object { [pscustomobject]@{ Name = $known[$k]; Path = $_.Path; Title = $_.MainWindowTitle } }
    }
    $hit = @($wins | Where-Object { $_.Title -like '*StudyPlay*' }) | Select-Object -First 1
    if ($hit) { return $hit }
    @($wins) | Select-Object -First 1
}

# Открыть сайт StudyPlay и сразу передать оценки в ссылке (после #, на сервер не уходит)
$SiteUrl = 'https://alantesterr.github.io/testerw/'
function StudyPlay-B64($res) {
    $bytes = [Text.Encoding]::UTF8.GetBytes((StudyPlay-Json $res))
    $ms = New-Object IO.MemoryStream
    $z = New-Object IO.Compression.DeflateStream($ms, [IO.Compression.CompressionMode]::Compress)
    $z.Write($bytes, 0, $bytes.Length); $z.Close()
    [Convert]::ToBase64String($ms.ToArray()).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
function StudyPlay-Link($res) {
    $b64 = StudyPlay-B64 $res
    # ?u=время — чтобы браузер точно открыл свежую версию сайта, а не старую из кэша
    $SiteUrl + '?u=' + [DateTime]::Now.ToString('yyMMddHHmmss') + '#/grades/pl/' + $b64
}

# ---------- Excel ----------
function Save-Excel($res, $path) {
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
        while ($wb.Worksheets.Count -lt 2) { $wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) | Out-Null }
        $ws1 = $wb.Worksheets.Item(1); $ws1.Name = 'Итоговые'; & $fill $ws1 @($res.Summary)
        $ws2 = $wb.Worksheets.Item(2); $ws2.Name = 'Текущие';  & $fill $ws2 @($res.Current)
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
# Получаем оценки, кладём их в буфер обмена для вкладки StudyPlay и выходим.
# Если пароля нет — откроется обычное окно (ниже), а после «Получить оценки» оно закроется само.
if ($Auto) {
    $c0 = Load-Config
    $pw0 = if ($c0.savedPassword) { Unprotect $c0.savedPassword } else { '' }
    if ($c0.login -and $pw0) {
        if ((Cooldown-Left) -gt 0) { return }   # откат ещё идёт — тихо пропускаем, сайт попробует позже
        try {
            $script:Result = Fetch-Grades $c0.login $pw0 ([Action[string]]{ param($t) })
            [Windows.Forms.Clipboard]::SetText('studyplay-grades:' + (StudyPlay-B64 $script:Result))
        } catch {
            # Platonus не отвечает (ночной перерыв ~23:00–7:00, 502 и т. п.) — при запуске с сайта молчим
            if ($_.Exception.Message -match '\(50[234]\)|шлюз|недоступ|тайм-?аут|timed out|соедин|connect|resolve|разреш') { return }
            $top0 = New-Object Windows.Forms.Form; $top0.TopMost = $true   # чтобы сообщение не спряталось за браузер
            [Windows.Forms.MessageBox]::Show($top0, "Не удалось получить оценки: $($_.Exception.Message)", 'Мои оценки', 'OK', 'Warning') | Out-Null
        }
        return
    }
}

# ================= ОКНО =================
$cfg  = Load-Config
$font = New-Object Drawing.Font('Segoe UI', 10)

$form = New-Object Windows.Forms.Form
$form.Text = 'Мои оценки — Platonus'
$form.Size = New-Object Drawing.Size(1000, 640)
$form.MinimumSize = New-Object Drawing.Size(760, 480)
$form.StartPosition = 'CenterScreen'
$form.Font = $font

# верхняя панель: логин, пароль, кнопка
$top = New-Object Windows.Forms.FlowLayoutPanel
$top.Dock = 'Top'; $top.Height = 48; $top.Padding = New-Object Windows.Forms.Padding(8, 10, 8, 0); $top.WrapContents = $false

function New-Label($text) { $l = New-Object Windows.Forms.Label; $l.Text = $text; $l.AutoSize = $true; $l.Margin = New-Object Windows.Forms.Padding(0, 6, 4, 0); $l }
$tbLogin = New-Object Windows.Forms.TextBox; $tbLogin.Width = 170; $tbLogin.Text = $cfg.login
$tbPass  = New-Object Windows.Forms.TextBox; $tbPass.Width = 130; $tbPass.UseSystemPasswordChar = $true
$cbRemember = New-Object Windows.Forms.CheckBox; $cbRemember.Text = 'Запомнить пароль'; $cbRemember.AutoSize = $true; $cbRemember.Margin = New-Object Windows.Forms.Padding(8, 5, 8, 0)
if ($cfg.savedPassword) { $tbPass.Text = Unprotect $cfg.savedPassword; $cbRemember.Checked = [bool]$tbPass.Text }

$btnFetch = New-Object Windows.Forms.Button; $btnFetch.Text = '🔄 Получить оценки'; $btnFetch.AutoSize = $true; $btnFetch.Height = 30
$btnFetch.BackColor = [Drawing.Color]::FromArgb(37, 99, 235); $btnFetch.ForeColor = [Drawing.Color]::White; $btnFetch.FlatStyle = 'Flat'
$top.Controls.AddRange(@((New-Label 'Логин:'), $tbLogin, (New-Label 'Пароль:'), $tbPass, $cbRemember, $btnFetch))

# нижняя панель: сохранить, скопировать, показать файл + статус
$bottom = New-Object Windows.Forms.FlowLayoutPanel
$bottom.Dock = 'Bottom'; $bottom.Height = 48; $bottom.Padding = New-Object Windows.Forms.Padding(8, 8, 8, 0); $bottom.WrapContents = $false
function New-Btn($text) { $b = New-Object Windows.Forms.Button; $b.Text = $text; $b.AutoSize = $true; $b.Height = 30; $b.Enabled = $false; $b }
$btnSave = New-Btn '💾 Сохранить в Excel'
$btnCopy = New-Btn '📋 Скопировать текстом'
$btnShow = New-Btn '📂 Показать файл'
$btnSP   = New-Btn '🎓 Сохранить для StudyPlay'
$btnOpen = New-Btn '🌐 Открыть в StudyPlay'
$btnOpen.BackColor = [Drawing.Color]::FromArgb(37, 99, 235); $btnOpen.ForeColor = [Drawing.Color]::White; $btnOpen.FlatStyle = 'Flat'
$lblStatus = New-Label 'Введите пароль и нажмите «Получить оценки».'; $lblStatus.Margin = New-Object Windows.Forms.Padding(12, 6, 0, 0)
$bottom.Controls.AddRange(@($btnOpen, $btnSP, $btnSave, $btnCopy, $btnShow, $lblStatus))

# вкладки с таблицами
$tabs = New-Object Windows.Forms.TabControl; $tabs.Dock = 'Fill'
function New-Grid {
    $g = New-Object Windows.Forms.DataGridView
    $g.Dock = 'Fill'; $g.ReadOnly = $true; $g.AllowUserToAddRows = $false; $g.RowHeadersVisible = $false
    $g.AutoSizeColumnsMode = 'AllCells'; $g.BackgroundColor = [Drawing.Color]::White; $g.BorderStyle = 'None'
    $g.SelectionMode = 'FullRowSelect'
    $g.ColumnHeadersDefaultCellStyle.Font = New-Object Drawing.Font('Segoe UI', 10, [Drawing.FontStyle]::Bold)
    $g
}
$gridSum = New-Grid; $gridCur = New-Grid
$tab1 = New-Object Windows.Forms.TabPage; $tab1.Text = 'Итоговые (РК, экзамен)'; $tab1.Controls.Add($gridSum)
$tab2 = New-Object Windows.Forms.TabPage; $tab2.Text = 'Текущие оценки';         $tab2.Controls.Add($gridCur)
$tabs.TabPages.AddRange(@($tab1, $tab2))

$form.Controls.Add($tabs); $form.Controls.Add($top); $form.Controls.Add($bottom)
$form.AcceptButton = $btnFetch

$script:Result = $null
$script:LastFile = $null
$setStatus = [Action[string]]{ param($t) $lblStatus.Text = $t; $form.Refresh(); [Windows.Forms.Application]::DoEvents() }

function Show-Result($res) {
    $script:Result = $res
    $gridSum.DataSource = (To-DataTable @($res.Summary))
    $gridCur.DataSource = (To-DataTable @($res.Current))
    $btnSave.Enabled = $true; $btnCopy.Enabled = $true; $btnSP.Enabled = $true; $btnOpen.Enabled = $true
    $lblStatus.Text = "Обновлено $($res.Taken.ToString('dd.MM.yyyy HH:mm')) · $($res.Year) г., период $($res.Term) · предметов: $(@($res.Summary).Count)"
}

# Запуск с сайта: оценки кладутся в буфер обмена, вкладка StudyPlay забирает их, когда вы к ней вернётесь
function Send-ToSite {
    [Windows.Forms.Clipboard]::SetText('studyplay-grades:' + (StudyPlay-B64 $script:Result))
    $lblStatus.Text = 'Готово! Возвращаю вас в StudyPlay…'
    $script:CloseTimer = New-Object Windows.Forms.Timer; $script:CloseTimer.Interval = 1500
    $script:CloseTimer.Add_Tick({ $script:CloseTimer.Stop(); $form.Close() }); $script:CloseTimer.Start()
}
if ($Auto) {
    $form.Add_Shown({
        if ($tbLogin.Text -and $tbPass.Text) { $btnFetch.PerformClick() }
        else { $lblStatus.Text = 'Введите логин и пароль, отметьте «Запомнить пароль» и нажмите «Получить оценки».' }
    })
}

$btnFetch.Add_Click({
    if (-not $tbLogin.Text -or -not $tbPass.Text) { [Windows.Forms.MessageBox]::Show('Введите логин и пароль.', 'Мои оценки') | Out-Null; return }
    $btnFetch.Enabled = $false; $form.Cursor = 'WaitCursor'
    try {
        $res = Fetch-Grades $tbLogin.Text.Trim() $tbPass.Text $setStatus
        Save-Config $tbLogin.Text.Trim() $tbPass.Text $cbRemember.Checked
        Show-Result $res
        if ($Auto) { Send-ToSite }
    } catch {
        $lblStatus.Text = 'Ошибка.'
        $msg = $_.Exception.Message
        if ($msg -match '\(50[234]\)|шлюз|недоступ|тайм-?аут|timed out|соедин|connect|resolve|разреш') {
            $msg = "Platonus сейчас не отвечает.`n`nОбычно он не работает ночью — примерно с 23:00 до 7:00 (ночной перерыв). Попробуйте позже.`n`n($msg)"
        }
        [Windows.Forms.MessageBox]::Show($msg, 'Не получилось', 'OK', 'Warning') | Out-Null
    } finally { $btnFetch.Enabled = $true; $form.Cursor = 'Default' }
})

$btnSave.Add_Click({
    $dlg = New-Object Windows.Forms.SaveFileDialog
    $dlg.Filter = 'Книга Excel (*.xlsx)|*.xlsx'
    $dlg.FileName = 'Оценки_' + $script:Result.Taken.ToString('yyyy-MM-dd') + '.xlsx'
    $dlg.InitialDirectory = [Environment]::GetFolderPath('MyDocuments')
    if ($dlg.ShowDialog($form) -ne 'OK') { return }
    $form.Cursor = 'WaitCursor'
    try {
        $setStatus.Invoke('Сохраняю в Excel...')
        Save-Excel $script:Result $dlg.FileName
        $script:LastFile = $dlg.FileName; $btnShow.Enabled = $true
        $lblStatus.Text = "Сохранено: $($dlg.FileName)"
    } catch {
        [Windows.Forms.MessageBox]::Show("Не удалось сохранить: $($_.Exception.Message)", 'Ошибка', 'OK', 'Warning') | Out-Null
    } finally { $form.Cursor = 'Default' }
})

$btnOpen.Add_Click({
    try {
        $url = StudyPlay-Link $script:Result
        if ($url.Length -gt 30000) { throw 'Оценок слишком много для ссылки — используйте «Сохранить для StudyPlay».' }
        $br = Find-Browser
        if ($br) { Start-Process -FilePath $br.Path -ArgumentList ('"' + $url + '"'); $name = $br.Name }
        else { Start-Process $url; $name = 'браузер по умолчанию' }
        $lblStatus.Text = "Открываю StudyPlay ($name)… Оценки загрузятся сами."
    } catch {
        [Windows.Forms.MessageBox]::Show("Не удалось открыть сайт: $($_.Exception.Message)", 'Ошибка', 'OK', 'Warning') | Out-Null
    }
})

$btnSP.Add_Click({
    $dlg = New-Object Windows.Forms.SaveFileDialog
    $dlg.Filter = 'Файл для StudyPlay (*.json)|*.json'
    $dlg.FileName = 'studyplay-оценки_' + $script:Result.Taken.ToString('yyyy-MM-dd') + '.json'
    $dlg.InitialDirectory = [Environment]::GetFolderPath('Desktop')
    if ($dlg.ShowDialog($form) -ne 'OK') { return }
    try {
        Save-StudyPlay $script:Result $dlg.FileName
        $script:LastFile = $dlg.FileName; $btnShow.Enabled = $true
        $lblStatus.Text = 'Готово! На сайте: Оценки → «Загрузить из Platonus» → выберите этот файл.'
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

if ($TestJournal) {
    # режим проверки: показать сохранённые данные без входа на сайт
    $subjects = Json-Array ([IO.File]::ReadAllText($TestJournal, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF))
    $form.Add_Shown({ Show-Result (Build-Result $subjects @{} '2026' '1') })
}

[void]$form.ShowDialog()
