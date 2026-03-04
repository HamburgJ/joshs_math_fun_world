# ============================================================
#  Download Audio Assets — Josh's Math Fun World
#  All sounds are CC0 (Public Domain) from Freesound.org
#  Downloaded from Freesound CDN preview URLs (no auth needed)
# ============================================================

$base = "c:\Github\joshs_math_fun_world\assets\audio"

# Format: filename, freesound_id, user_id, description, author
$downloads = @(
    # --- Ambience ---
    @("ambience\field.mp3",          523374, 1287465,  "Open field winds summer ambience",      "nickmaysoundmusic"),
    @("ambience\birds.mp3",          517109, 9159316,  "Singing birds (Nature atmo)",           "Breviceps"),
    @("ambience\ocean.mp3",          455629, 1391542,  "The Last Ocean Loop",                   "gis_sweden"),
    @("ambience\stream.mp3",         433589, 5618682,  "Stream River Water Up Close",           "jackthemurray"),
    @("ambience\cave.mp3",           177958, 985466,   "Water Dripping in Cave",                "Sclolex"),
    @("ambience\wind.mp3",           547472, 8031303,  "WIND - 1 (trees summer France)",        "SamuelGremaud"),
    @("ambience\hum.mp3",            355342, 4357738,  "Blacklight Buzz (electrical drone)",    "FairhavenCollection"),
    @("ambience\woods.mp3",          523377, 1287465,  "Woods ambience summer UK birds",        "nickmaysoundmusic"),
    @("ambience\beach.mp3",          788731, 10643461, "Calm Gentle Beach Shore (Loopable)",    "Geoff-Bremner-Audio"),

    # --- SFX ---
    @("sfx\footstep-grass.mp3",      505833, 4024739,  "Footsteps grass",                       "jedg"),
    @("sfx\footstep-stone.mp3",      208103, 2943165,  "Stone Steps",                           "Phil25"),
    @("sfx\jump.mp3",                331381, 71257,    "Public Domain Jump Sound",              "qubodup"),
    @("sfx\land.mp3",                584441, 1196020,  "Bag Drop Soft Surface 2",               "BenjaminNelan"),
    @("sfx\interact.mp3",            735168, 737651,   "Item Pickup Chime",                     "Irolan"),
    @("sfx\secret.mp3",              521645, 7724198,  "WinFantasia (success jingle)",          "Fupicat"),
    @("sfx\bounce.mp3",              383240, 6512973,  "Bounce (game bounce SFX)",              "Jofae"),
    # --- Music ---
    @("music\main-theme.mp3",        610507, 5674468,  "8 bit game loop",                       "josefpres")
)

$success = 0
$fail = 0

foreach ($dl in $downloads) {
    $file = $dl[0]
    $id = $dl[1]
    $uid = $dl[2]
    $desc = $dl[3]
    $author = $dl[4]

    $folder = [Math]::Floor($id / 1000)
    $url = "https://cdn.freesound.org/previews/$folder/${id}_${uid}-hq.mp3"
    $outPath = Join-Path $base $file

    $dir = Split-Path $outPath -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

    Write-Host "Downloading: $desc ($author) -> $file" -ForegroundColor Cyan
    Write-Host "  URL: $url"

    try {
        Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing -ErrorAction Stop
        $size = (Get-Item $outPath).Length
        Write-Host "  OK ($([Math]::Round($size/1024, 1)) KB)" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "=== Done: $success succeeded, $fail failed ===" -ForegroundColor Yellow
