const API = "https://berita-indo-api-next.vercel.app/api"
const KATEGORI = [["","Terbaru"],["nasional","Nasional"],["internasional","Internasional"],["ekonomi","Ekonomi"],["olahraga","Olahraga"],["teknologi","Teknologi"],["hiburan","Hiburan"],["gaya-hidup","Gaya hidup"]]
const NAMA_SUMBER = {cnn:"CNN Indonesia",cnbc:"CNBC Indonesia",republika:"Republika",tempo:"Tempo",antara:"Antara",suara:"Suara.com"}
const state = { sumber:"cnn", kategori:"", data:[], halaman:1, q:"" }
const PER_HALAMAN = 8
const $ = id => document.getElementById(id)

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))
const FOTO_CADANGAN = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'><rect width='16' height='10' fill='#cbd6dc'/><rect x='6' y='3' width='4' height='4' rx='1' fill='#c23b4a'/></svg>")

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
const meta = b => `<div class="meta"><b>${esc(NAMA_SUMBER[state.sumber])}</b>${b.waktu ? `<span>${esc(lalu(b.waktu))}</span>` : ""}</div>`
const kata = t => esc(t).split(" ").map((w,i) => `<span class="k"><span style="--i:${i}">${w}</span></span>`).join(" ")
const kartu = (b,i) => `
    <a class="kartu rv" style="--d:${i*70}ms" href="${esc(b.link)}" target="_blank" rel="noopener">
        <div class="foto">${img(b.foto, b.judul)}</div>
        <div><h3>${esc(b.judul)}</h3><p>${esc(b.ringkas)}</p>${meta(b)}</div>
    </a>`


const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target) } }), {rootMargin:"0px 0px -8% 0px"})
const amati = () => document.querySelectorAll(".rv:not(.in)").forEach(el => io.observe(el))

function tampil(tambah){
    const q = state.q.toLowerCase()
    const daftar = state.data.filter(b => !q || (b.judul + b.ringkas).toLowerCase().includes(q))
    const adaCari = q.length > 0
    const hero = adaCari ? [] : daftar.slice(0,3)
    const sisa = adaCari ? daftar : daftar.slice(3)
    const nama = KATEGORI.find(k => k[0] === state.kategori)[1]
    $("judul-feed").textContent = adaCari ? `Hasil pencarian "${state.q}"` : `Berita ${nama.toLowerCase()}`

    if(!tambah) $("hero").innerHTML = hero.length ? `
        <a class="lead" href="${esc(hero[0].link)}" target="_blank" rel="noopener">
            <div class="foto">${img(hero[0].foto, hero[0].judul)}</div>
            <div class="isi"><span class="tag">${esc(nama)}</span><h1>${kata(hero[0].judul)}</h1>
            <p>${esc(hero[0].ringkas.slice(0,180))}</p>${meta(hero[0])}</div>
        </a>` + hero.slice(1).map(b => `
        <a class="sub" href="${esc(b.link)}" target="_blank" rel="noopener">
            <div class="foto">${img(b.foto, b.judul)}</div>
            <div><h3>${esc(b.judul)}</h3>${meta(b)}</div>
        </a>`).join("") : ""

    const tampilkan = sisa.slice(0, state.halaman * PER_HALAMAN)
    const ada = tambah ? $("berita").querySelectorAll(".kartu").length : 0
    if(!tampilkan.length) $("berita").innerHTML = `<p class="kosong">Tidak ada berita yang cocok. Coba kata kunci lain atau pilih kategori berbeda.</p>`
    else if(ada) $("berita").insertAdjacentHTML("beforeend", tampilkan.slice(ada).map((b,i) => kartu(b,i)).join(""))
    else $("berita").innerHTML = tampilkan.map((b,i) => kartu(b,i % PER_HALAMAN)).join("")
    $("muat").hidden = tampilkan.length >= sisa.length

    if(!tambah){
        $("pilihan").innerHTML = state.data.slice(3,8).map((b,i) => `<li class="rv" style="--d:${i*90}ms"><a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.judul)}</a></li>`).join("")
        const t = state.data.slice(0,10).map(b => `<a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.judul)}</a>`).join("")
        $("ticker-isi").innerHTML = t + t
    }
    amati()
}

let pertama = true
const mulai = Date.now()
function selesaiMuat(){
    document.body.classList.remove("memuat")
    if(!pertama) return
    pertama = false
    const p = $("preloader")
    setTimeout(() => { p.classList.add("selesai"); setTimeout(() => p.classList.add("hilang"), 1300) }, Math.max(0, 1400 - (Date.now() - mulai)))
}
function muatBerita(){
    if(!pertama) document.body.classList.add("memuat")
    const url = `${API}/${state.sumber}-news${state.kategori ? "/" + state.kategori : ""}`
    fetch(url).then(r => { if(!r.ok) throw new Error(r.status); return r.json() })
        .then(j => { state.data = (j.data || []).map(normal); state.halaman = 1; tampil() })
        .catch(() => {
            state.data = []; tampil()
            $("berita").innerHTML = `<div class="kosong">Berita tidak dapat dimuat. Periksa koneksi internet atau coba sumber lain.<button class="btn" onclick="muatBerita()">Coba lagi</button></div>`
        })
        .finally(selesaiMuat)
}


$("tanggal").textContent = new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
$("kategori").innerHTML = '<span id="indikator"></span>' + KATEGORI.map(k => `<button data-k="${k[0]}" class="${k[0]===""?"aktif":""}">${k[1]}</button>`).join("")
function geser(b){
    const i = $("indikator")
    i.style.width = b.offsetWidth + "px"
    i.style.transform = `translateX(${b.offsetLeft - 20}px)`
    b.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"})
}
geser(document.querySelector("#kategori .aktif"))
addEventListener("resize", () => geser(document.querySelector("#kategori .aktif")))
document.fonts && document.fonts.ready.then(() => geser(document.querySelector("#kategori .aktif")))
$("kategori").onclick = e => {
    const b = e.target.closest("button"); if(!b) return
    document.querySelectorAll("#kategori button").forEach(x => x.classList.toggle("aktif", x === b))
    geser(b); state.kategori = b.dataset.k; muatBerita()
}
$("sumber").onchange = e => { state.sumber = e.target.value; muatBerita() }
let debounce
$("cari").oninput = e => { clearTimeout(debounce); debounce = setTimeout(() => { state.q = e.target.value.trim(); state.halaman = 1; tampil() }, 220) }
$("muat").onclick = () => { state.halaman++; tampil(true) }

/* efek interaktif */
let tk = 0
addEventListener("scroll", () => {
    if(tk) return
    tk = requestAnimationFrame(() => {
        tk = 0
        const h = document.documentElement
        $("progres").style.transform = `scaleX(${scrollY / ((h.scrollHeight - innerHeight) || 1)})`
        $("kepala").classList.toggle("kecil", scrollY > 80)
    })
}, {passive:true})
$("hero").onmousemove = e => {
    const l = e.target.closest(".lead"); if(!l) return
    const r = l.getBoundingClientRect()
    l.style.setProperty("--mx", ((e.clientX - r.left) / r.width - .5).toFixed(3))
    l.style.setProperty("--my", ((e.clientY - r.top) / r.height - .5).toFixed(3))
}
const mg = $("muat")
mg.onmousemove = e => { const r = mg.getBoundingClientRect(); mg.style.transform = `translate(${(e.clientX - r.left - r.width/2)*.2}px,${(e.clientY - r.top - r.height/2)*.35}px)` }
mg.onmouseleave = () => mg.style.transform = ""


const nb = document.querySelector(".kotak .btn"), ni = document.querySelector(".kotak input")
nb.onclick = () => {
    if(!ni.value || !ni.checkValidity()){ ni.classList.remove("salah"); void ni.offsetWidth; ni.classList.add("salah"); ni.focus(); return }
    nb.textContent = "Terima kasih, Anda sudah terdaftar"; nb.classList.add("ok"); ni.value = ""
}

muatBerita()
