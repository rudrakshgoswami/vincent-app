
$baseUrl = "https://images.unsplash.com/photo-"
$images = @{
    # Packages
    "pkg_classic.jpg" = "1552566629-d114ef5c1420?w=800&q=80"; # Buffet
    "pkg_premium.jpg" = "1519225421980-715bd0215aed?w=800&q=80"; # Wedding event
    "pkg_royal.jpg" = "1587339148197-f82728213601?w=800&q=80"; # Royal banquet

    # Welcome Drinks
    "jaljeera.jpg" = "1540189549336-e6e99c3679fe?w=400&q=80";
    "masala_buttermilk.jpg" = "1567620985035-091b8f044235?w=400&q=80";
    "lemon_mint_cooler.jpg" = "1513558161293-cdaf765ed2fd?w=400&q=80";
    "mango_shake.jpg" = "1623065422902-30a2d299f483?w=400&q=80";
    "fruit_punch.jpg" = "1497515114629-f71d768fd07c?w=400&q=80";
    "thandai.jpg" = "1614707267537-b85aaf00c4b7?w=400&q=80";
    "mocktail.jpg" = "1536935338218-841172460a1e?w=400&q=80";

    # Soup
    "tomato_soup.jpg" = "1547592166-23ac45744acd?w=400&q=80";
    "sweet_corn_soup.jpg" = "1543339308-43ef82107773?w=400&q=80";
    "manchow_soup.jpg" = "1603133872878-684f208fb84b?w=400&q=80";
    "mushroom_soup.jpg" = "1534938665420-4193effe6480?w=400&q=80";

    # Starters
    "paneer_tikka.jpg" = "1567184109-21bd040375cd?w=400&q=80";
    "malai_tikka.jpg" = "1606491956689-2ea862c1bd03?w=400&q=80";
    "paneer_angara.jpg" = "1631452180519-701097447a9a?w=400&q=80";
    "spring_roll.jpg" = "1544025162-d4019a7e97d4?w=400&q=80";
    "hara_bhara_kabab.jpg" = "1610192244265-d010c2688b77?w=400&q=80";
    "dahi_kebab.jpg" = "1626500155510-c0adb95acb62?w=400&q=80";
    "crispy_corn.jpg" = "1589647363585-f4a7d3877b10?w=400&q=80";
    "stuffed_mushroom.jpg" = "1541014741-21e68794c449?w=400&q=80";
    "seekh_kabab_veg.jpg" = "1610192244265-d010c2688b77?w=400&q=80";

    # Main Course
    "paneer_butter_masala.jpg" = "1631233039082-89854440c6aa?w=400&q=80";
    "shahi_paneer.jpg" = "1601050694111-993d5a40a831?w=400&q=80";
    "malai_kofta.jpg" = "1585032226638-ed7bfc1ec5b7?w=400&q=80";
    "veg_handi.jpg" = "1512621776951-a57741f232da?w=400&q=80";
    "dum_aloo.jpg" = "1626074313101-2d5306385cf5?w=400&q=80";
    "undhiyu.jpg" = "1601050694111-993d5a40a831?w=400&q=80";

    # Dal
    "dal_makhani.jpg" = "1546833999-2310b4485eb5?w=400&q=80";
    "dal_tadka.jpg" = "1585032226638-ed7bfc1ec5b7?w=400&q=80";
    "gujarati_kadhi.jpg" = "1514361892635-4577778b0d4c?w=400&q=80";

    # Breads
    "naan.jpg" = "1533777857888-217a10613958?w=400&q=80";
    "tandoori_roti.jpg" = "1626074313101-2d5306385cf5?w=400&q=80";

    # Rice
    "biryani_veg.jpg" = "1563379091339-bec9d0f6759c?w=400&q=80";
    "veg_pulao.jpg" = "1589302168004-cb60da80dc35?w=400&q=80";

    # Desserts
    "gulab_jamun.jpg" = "1589301880007-080517417558?w=400&q=80";
    "rasmalai.jpg" = "1626074313101-2d5306385cf5?w=400&q=80";
    "jalebi.jpg" = "1589302168004-cb60da80dc35?w=400&q=80";
    "moong_dal_halwa.jpg" = "1589301880007-080517417558?w=400&q=80";

    # Live Counters
    "pav_bhaji.jpg" = "1432484932456-ee0ec9ec43ac?w=400&q=80";
    "pasta.jpg" = "1473093295043-da09a7940121?w=400&q=80";
    "chaat.jpg" = "1601050694111-993d5a40a831?w=400&q=80";
    "dosa.jpg" = "1589301880007-080517417558?w=400&q=80";
}

$destPath = "D:\vincentapp\images\Catering"
if (!(Test-Path $destPath)) { New-Item -ItemType Directory -Path $destPath }

foreach ($img in $images.GetEnumerator()) {
    $url = $baseUrl + $img.Value
    $file = Join-Path $destPath $img.Name
    Write-Host "Downloading $($img.Key)..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction Stop
    } catch {
        Write-Warning "Failed to download $($img.Key)"
    }
}
