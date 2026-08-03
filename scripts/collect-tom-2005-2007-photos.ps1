$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.Drawing

$players = @(
    @{ number = '01'; slug = 'valeriy-petrakov'; name = 'Валерий Петраков'; query = 'Валерий Петраков тренер Томь фото' },
    @{ number = '02'; slug = 'sergey-pareyko'; name = 'Сергей Парейко'; query = 'Сергей Парейко Томь футбол фото' },
    @{ number = '03'; slug = 'vasiliy-khomutovskiy'; name = 'Василий Хомутовский'; query = 'Василий Хомутовский Томь футбол фото' },
    @{ number = '04'; slug = 'albert-borzenkov'; name = 'Альберт Борзенков'; query = 'Альберт Борзенков Томь футбол фото' },
    @{ number = '05'; slug = 'valeriy-katynsus'; name = 'Валерий Катынсус'; query = 'Валерий Катынсус Томь футбол фото' },
    @{ number = '06'; slug = 'evgeniy-kaleshin'; name = 'Евгений Калешин'; query = 'Евгений Калешин Томь футбол фото' },
    @{ number = '07'; slug = 'hrvoje-vejic'; name = 'Хрвое Вейич'; query = 'Хрвое Вейич Томь футбол фото' },
    @{ number = '08'; slug = 'andrius-skerla'; name = 'Андрюс Скерла'; query = 'Андрюс Скерла Томь футбол фото' },
    @{ number = '09'; slug = 'ilya-izotov'; name = 'Илья Изотов'; query = 'Илья Изотов Томь футболист фото' },
    @{ number = '10'; slug = 'valeriy-klimov'; name = 'Валерий Климов'; query = 'Валерий Климов Томь футбол фото' },
    @{ number = '11'; slug = 'sergey-skoblyakov'; name = 'Сергей Скобляков'; query = 'Сергей Скобляков Томь футбол фото' },
    @{ number = '12'; slug = 'branislav-krunic'; name = 'Бранислав Крунич'; query = 'Бранислав Крунич Томь футбол фото' },
    @{ number = '13'; slug = 'aleksandr-kulchiy'; name = 'Александр Кульчий'; query = 'Александр Кульчий Томь футбол фото' },
    @{ number = '14'; slug = 'vasiliy-yanotovskiy'; name = 'Василий Янотовский'; query = 'Василий Янотовский Томь футбол фото' },
    @{ number = '15'; slug = 'aleksandar-mladenov'; name = 'Александар Младенов'; query = 'Александар Младенов Томь футбол фото' },
    @{ number = '16'; slug = 'dmitriy-tarasov'; name = 'Дмитрий Тарасов'; query = 'Дмитрий Тарасов футболист Томь 18 марта 1987 фото' },
    @{ number = '17'; slug = 'oleg-shishkin'; name = 'Олег Шишкин'; query = 'Олег Шишкин футболист Томь фото' },
    @{ number = '18'; slug = 'denis-kiselev'; name = 'Денис Киселёв'; query = 'Денис Киселев футболист Томь фото' },
    @{ number = '19'; slug = 'pavel-pogrebnyak'; name = 'Павел Погребняк'; query = 'Павел Погребняк Томь футбол фото' },
    @{ number = '20'; slug = 'aleksey-medvedev'; name = 'Алексей Медведев'; query = 'Алексей Медведев футболист Томь фото' }
)

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $repositoryRoot 'src\data\tomsk\2. tom (2005-2007)\photo-sources'
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$headers = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36' }
$blockedHosts = @('avatars.mds.yandex.net', 'yastatic.net')
$records = [System.Collections.Generic.List[object]]::new()

foreach ($player in $players) {
    $playerDirectory = Join-Path $targetRoot ("{0}-{1}" -f $player.number, $player.slug)
    New-Item -ItemType Directory -Force -Path $playerDirectory | Out-Null

    $searchUrl = 'https://yandex.ru/images/search?text=' + [uri]::EscapeDataString($player.query)
    $html = $null
    foreach ($attempt in 1..3) {
        try {
            $html = (Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri $searchUrl -TimeoutSec 10).Content
            break
        } catch {
            if ($attempt -lt 3) { Start-Sleep -Seconds 1 }
        }
    }
    if (-not $html) { continue }
    $pattern = 'origUrl&quot;:&quot;(?<image>https?://.*?)&quot;,&quot;snippet&quot;:\{[\s\S]{0,1600}?&quot;url&quot;:&quot;(?<page>https?://.*?)&quot;'
    $matches = [regex]::Matches($html, $pattern)
    $accepted = 0

    foreach ($match in ($matches | Select-Object -First 12)) {
        if ($accepted -ge 3) { break }

        $imageUrl = [System.Web.HttpUtility]::HtmlDecode($match.Groups['image'].Value) -replace '\\/', '/'
        $pageUrl = [System.Web.HttpUtility]::HtmlDecode($match.Groups['page'].Value) -replace '\\/', '/'
        $imageUri = [uri]$imageUrl
        if ($blockedHosts -contains $imageUri.Host) { continue }
        if ($records.imageUrl -contains $imageUrl) { continue }

        $temporaryFile = Join-Path $env:TEMP ("tom-photo-{0}-{1}.tmp" -f $player.number, [guid]::NewGuid())
        try {
            Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri $imageUrl -OutFile $temporaryFile -TimeoutSec 8
            $image = [System.Drawing.Image]::FromFile($temporaryFile)
            $width = $image.Width
            $height = $image.Height
            $format = $image.RawFormat
            $image.Dispose()

            if ($width -lt 180 -or $height -lt 180) { continue }
            $extension = if ($format.Guid -eq [System.Drawing.Imaging.ImageFormat]::Png.Guid) { '.png' } elseif ($format.Guid -eq [System.Drawing.Imaging.ImageFormat]::Gif.Guid) { '.gif' } else { '.jpg' }
            $accepted++
            $fileName = '{0:D2}{1}' -f $accepted, $extension
            $destination = Join-Path $playerDirectory $fileName
            Move-Item -Force -LiteralPath $temporaryFile -Destination $destination

            $records.Add([pscustomobject]@{
                cardNumber = $player.number
                person = $player.name
                file = ("{0}-{1}/{2}" -f $player.number, $player.slug, $fileName)
                width = $width
                height = $height
                imageUrl = $imageUrl
                sourcePage = $pageUrl
                searchQuery = $player.query
            })
        } catch {
            continue
        } finally {
            if (Test-Path -LiteralPath $temporaryFile) {
                Remove-Item -LiteralPath $temporaryFile -Force
            }
        }
    }
}

$fallbacks = @(
    @{
        number = '05'; slug = 'valeriy-katynsus'; name = 'Валерий Катынсус'
        imageUrl = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Valeriu_Catinsus.JPG'
        sourcePage = 'https://commons.wikimedia.org/wiki/File:Valeriu_Catinsus.JPG'
        query = 'Valeriu Catinsus Tom Tomsk football'
    },
    @{
        number = '11'; slug = 'sergey-skoblyakov'; name = 'Сергей Скобляков'
        imageUrl = 'https://s-cdn.sportbox.ru/images/shares/1200x600/player/e0/1110208044.jpg'
        sourcePage = 'https://news.sportbox.ru/Vidy_sporta/Futbol/Sergey-Leonidovich-Skoblyakov-Futbol-02011977/turnir_7100'
        query = 'Сергей Скобляков футболист Томь фото'
    },
    @{
        number = '14'; slug = 'vasiliy-yanotovskiy'; name = 'Василий Янотовский'
        imageUrl = 'https://s-cdn.sportbox.ru/images/shares/1200x600/player/de/1110208263.jpg'
        sourcePage = 'https://s-cdn.sportbox.ru/Vidy_sporta/Futbol/Vasiliy-Grigorievich-YAnotovskiy-Futbol-02011976/turnir_7100'
        query = 'Василий Янотовский футболист Томь фото'
    }
)

foreach ($fallback in $fallbacks) {
    $existingCount = @($records | Where-Object cardNumber -eq $fallback.number).Count
    if ($existingCount -ge 2) { continue }

    $playerDirectory = Join-Path $targetRoot ("{0}-{1}" -f $fallback.number, $fallback.slug)
    $temporaryFile = Join-Path $env:TEMP ("tom-photo-{0}-{1}.tmp" -f $fallback.number, [guid]::NewGuid())
    try {
        Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri $fallback.imageUrl -OutFile $temporaryFile -TimeoutSec 15
        $image = [System.Drawing.Image]::FromFile($temporaryFile)
        $width = $image.Width
        $height = $image.Height
        $image.Dispose()

        $fileName = '{0:D2}.jpg' -f ($existingCount + 1)
        Move-Item -Force -LiteralPath $temporaryFile -Destination (Join-Path $playerDirectory $fileName)
        $records.Add([pscustomobject]@{
            cardNumber = $fallback.number
            person = $fallback.name
            file = ("{0}-{1}/{2}" -f $fallback.number, $fallback.slug, $fileName)
            width = $width
            height = $height
            imageUrl = $fallback.imageUrl
            sourcePage = $fallback.sourcePage
            searchQuery = $fallback.query
        })
    } catch {
        continue
    } finally {
        if (Test-Path -LiteralPath $temporaryFile) {
            Remove-Item -LiteralPath $temporaryFile -Force
        }
    }
}

$manifest = [pscustomobject]@{
    collection = 'Томь, 2005–2007'
    note = 'Справочные фотографии для отбора исходника карточек. Права остаются у авторов и сайтов-источников.'
    identityNotes = @{
        '16-dmitriy-tarasov' = 'Дмитрий Алексеевич Тарасов, родился 18.03.1987; впоследствии выступал за Локомотив и Рубин.'
    }
    photos = $records
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $targetRoot 'sources.json') -Encoding utf8
