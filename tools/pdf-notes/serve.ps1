param([string]$Root, [int]$Port = 8100)
# Простой сервер для разбора PDF: GET отдаёт файлы, POST /save/<имя> сохраняет тело в $Root\out\<имя>
$l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
$out = Join-Path $Root 'out'; New-Item -ItemType Directory -Force $out | Out-Null
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.pdf'='application/pdf' }
while ($l.IsListening) { try { $c = $l.GetContext(); $rel = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
 $c.Response.Headers.Add('Cache-Control','no-store')
 if ($c.Request.HttpMethod -eq 'POST' -and $rel.StartsWith('save/')) {
   $name = [IO.Path]::GetFileName($rel.Substring(5)); $ms = New-Object IO.MemoryStream; $c.Request.InputStream.CopyTo($ms)
   [IO.File]::WriteAllBytes((Join-Path $out $name), $ms.ToArray()); $c.Response.StatusCode = 200
 } else {
   $p = Join-Path $Root $rel
   if ($rel -ne '' -and (Test-Path $p -PathType Leaf)) { $b = [IO.File]::ReadAllBytes($p); $e = [IO.Path]::GetExtension($p).ToLower(); if ($mime.ContainsKey($e)) { $c.Response.ContentType = $mime[$e] }; $c.Response.OutputStream.Write($b,0,$b.Length) }
   else { $c.Response.ContentType = 'text/html; charset=utf-8'; $b = [Text.Encoding]::UTF8.GetBytes('<!doctype html><meta charset="utf-8"><title>pdf</title>'); $c.Response.OutputStream.Write($b,0,$b.Length) }
 }
 $c.Response.OutputStream.Close() } catch {} }
