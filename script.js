const API = "https://berita-indo-api-next.vercel.app/api"
const KATEGORI = [["","Terbaru"],["nasional","Nasional"],["internasional","Internasional"],["ekonomi","Ekonomi"],["olahraga","Olahraga"],["teknologi","Teknologi"],["hiburan","Hiburan"],["gaya-hidup","Gaya hidup"]]
const NAMA_SUMBER = {cnn:"CNN Indonesia",cnbc:"CNBC Indonesia",republika:"Republika",tempo:"Tempo",antara:"Antara",suara:"Suara.com"}
const state = { sumber:"cnn", kategori:"", data:[], halaman:1, q:"" }
const PER_HALAMAN = 8
const $ = id => document.getElementById(id)

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))
const FOTO_CADANGAN = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'><rect width='16' height='10' fill='#222'/><rect x='6' y='3' width='4' height='4' fill='#d90429'/></svg>")

function normal(d){
    const g = d.image
    return {
        judul: d.title || "Tanpa judul",
        link: d.link || "#",
        foto: (g && (g.large || g.small)) || (typeof g === "string" ? g : "") || FOTO_CADANGAN,
        ringkas: d.contentSnippet || d.description || "",
        waktu: d.isoDate || d.pubDate || ""
    }
}
function lalu(iso){
    const t = new Date(iso); if(isNaN(t)) return ""
    const m = Math.round((Date.now() - t) / 60000)
    if(m < 1) return "baru saja"
    if(m < 60) return m + " menit lalu"
    if(m < 1440) return Math.floor(m/60) + " jam lalu"
    return t.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})
}
const img = (s, alt="") => `<img src="${esc(s)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${FOTO_CADANGAN}'">`
const meta = b => `<div class="meta">${esc(NAMA_SUMBER[state.sumber])}${b.waktu ? " | " + esc(lalu(b.waktu)) : ""}</div>`

function tampil(){
    const q = state.q.toLowerCase()
    const daftar = state.data.filter(b => !q || (b.judul + b.ringkas).toLowerCase().includes(q))
    const adaCari = q.length > 0
    const hero = adaCari ? [] : daftar.slice(0,3)
    const sisa = adaCari ? daftar : daftar.slice(3)
    const nama = KATEGORI.find(k => k[0] === state.kategori)[1]
    $("judul-feed").textContent = adaCari ? `Hasil pencarian "${state.q}"` : `Berita ${nama.toLowerCase()}`

    $("hero").innerHTML = hero.length ? `
        <a class="lead" href="${esc(hero[0].link)}" target="_blank" rel="noopener">
            ${img(hero[0].foto, hero[0].judul)}
            <div class="isi"><span class="tag">${esc(nama)}</span><h1>${esc(hero[0].judul)}</h1>
            <p>${esc(hero[0].ringkas.slice(0,180))}</p>${meta(hero[0])}</div>
        </a>` + hero.slice(1).map(b => `
        <a class="sub" href="${esc(b.link)}" target="_blank" rel="noopener">
            <div class="foto">${img(b.foto, b.judul)}</div>
            <div class="isi"><h3>${esc(b.judul)}</h3>${meta(b)}</div>
        </a>`).join("") : ""

    const tampilkan = sisa.slice(0, state.halaman * PER_HALAMAN)
    $("berita").innerHTML = tampilkan.length ? tampilkan.map(b => `
        <a class="kartu" href="${esc(b.link)}" target="_blank" rel="noopener">
            <div class="foto">${img(b.foto, b.judul)}</div>
            <div><h3>${esc(b.judul)}</h3><p>${esc(b.ringkas)}</p>${meta(b)}</div>
        </a>`).join("") : `<p class="kosong">Tidak ada berita yang cocok. Coba kata kunci lain atau pilih kategori berbeda.</p>`
    $("muat").hidden = tampilkan.length >= sisa.length

    $("pilihan").innerHTML = state.data.slice(3,8).map(b => `<li><a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.judul)}</a></li>`).join("")
    const t = state.data.slice(0,10).map(b => `<a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.judul)}</a>`).join("")
    $("ticker-isi").innerHTML = t + t
}

function muatBerita(){
    $("preloader").style.display = "flex"
    const url = `${API}/${state.sumber}-news${state.kategori ? "/" + state.kategori : ""}`
    fetch(url).then(r => { if(!r.ok) throw new Error(r.status); return r.json() })
        .then(j => { state.data = (j.data || []).map(normal); state.halaman = 1; tampil() })
        .catch(() => {
            state.data = []; tampil()
            $("berita").innerHTML = `<div class="kosong">Berita tidak dapat dimuat. Periksa koneksi internet atau coba sumber lain.<button class="btn" onclick="muatBerita()">Coba lagi</button></div>`
        })
        .finally(() => { $("preloader").style.display = "none" })
}

$("tanggal").textContent = new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
$("kategori").innerHTML = KATEGORI.map(k => `<button data-k="${k[0]}" class="${k[0]===""?"aktif":""}">${k[1]}</button>`).join("")
$("kategori").onclick = e => {
    const b = e.target.closest("button"); if(!b) return
    document.querySelectorAll("#kategori button").forEach(x => x.classList.toggle("aktif", x === b))
    state.kategori = b.dataset.k; muatBerita()
}
$("sumber").onchange = e => { state.sumber = e.target.value; muatBerita() }
$("cari").oninput = e => { state.q = e.target.value.trim(); state.halaman = 1; tampil() }
$("muat").onclick = () => { state.halaman++; tampil() }
muatBerita()
