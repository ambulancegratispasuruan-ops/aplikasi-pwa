
// ===================================
// MYAPP PWA - APPLICATION ENGINE
// ===================================

let dataAplikasi = [];

const STORAGE_KEY = "myapp_pwa_data";

// Menyiapkan aplikasi
document.addEventListener("DOMContentLoaded", () => {

    // Membaca data yang tersimpan
    try {
        dataAplikasi = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(dataAplikasi)) {
            dataAplikasi = [];
        }
    } catch (error) {
        dataAplikasi = [];
    }

    tampilkanData();

    // Menghubungkan formulir
    const form = document.getElementById("dataForm");

    form.addEventListener("submit", simpanData);

    // Mendaftarkan service worker
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js")
            .then(() => console.log("PWA aktif"))
            .catch(error => console.error(error));
    }

});

// ===================================
// SIMPAN DATA
// ===================================

function simpanData(event) {

    event.preventDefault();

    const nama = document
        .getElementById("namaData")
        .value.trim();

    const keterangan = document
        .getElementById("keterangan")
        .value.trim();

    if (!nama || !keterangan) {
        alert("Mohon lengkapi semua data.");
        return;
    }

    const dataBaru = {
        id: Date.now(),
        nama: nama,
        keterangan: keterangan,
        tanggal: new Date().toLocaleString("id-ID")
    };

    dataAplikasi.push(dataBaru);

    simpanPenyimpanan();

    document.getElementById("dataForm").reset();

    tampilkanData();

    alert("Data berhasil disimpan!");

}

// ===================================
// PENYIMPANAN LOKAL
// ===================================

function simpanPenyimpanan() {

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(dataAplikasi)
        );
    } catch (error) {
        alert("Penyimpanan gagal. Periksa ruang browser.");
    }

}

// ===================================
// TAMPILKAN DATA
// ===================================

function tampilkanData() {

    const daftar = document.getElementById("dataList");

    const total = document.getElementById("totalData");

    total.textContent = dataAplikasi.length;

    daftar.replaceChildren();

    if (dataAplikasi.length === 0) {

        const kosong = document.createElement("p");

        kosong.className = "empty";
        kosong.textContent = "Belum ada data.";

        daftar.appendChild(kosong);

        return;
    }

    dataAplikasi.forEach(data => {

        const item = document.createElement("div");
        item.className = "data-item";

        const judul = document.createElement("h4");
        judul.textContent = data.nama;

        const keterangan = document.createElement("p");
        keterangan.textContent = data.keterangan;

        const tanggal = document.createElement("small");
        tanggal.textContent = data.tanggal;

        const tombol = document.createElement("button");
        tombol.textContent = "Hapus Data";

        tombol.addEventListener("click", () => {
            hapusData(data.id);
        });

        item.append(judul, keterangan, tanggal, tombol);

        daftar.appendChild(item);

    });

}

// ===================================
// HAPUS DATA
// ===================================

function hapusData(id) {

    const konfirmasi = confirm(
        "Apakah Anda yakin ingin menghapus data ini?"
    );

    if (!konfirmasi) return;

    dataAplikasi = dataAplikasi.filter(
        data => data.id !== id
    );

    simpanPenyimpanan();

    tampilkanData();

}
