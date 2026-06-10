(function () {
  "use strict";

  var fileInput = document.getElementById("fileInput");
  var dropzone = document.getElementById("dropzone");
  var thumbs = document.getElementById("thumbs");
  var controls = document.getElementById("controls");
  var actions = document.getElementById("actions");
  var convertBtn = document.getElementById("convertBtn");
  var clearBtn = document.getElementById("clearBtn");
  var statusEl = document.getElementById("status");

  document.getElementById("year").textContent = new Date().getFullYear();

  // Lightweight i18n based on <html lang>
  var FR = (document.documentElement.lang || "en").toLowerCase().indexOf("fr") === 0;
  var T = FR ? {
    pickImages: "Veuillez choisir des images JPG, JPEG ou PNG.",
    loading: function (n) { return "Chargement de " + n + " image" + (n > 1 ? "s" : "") + "…"; },
    ready: function (n) { return n + " image" + (n > 1 ? "s" : "") + " prête" + (n > 1 ? "s" : "") + "."; },
    readError: "Impossible de lire une image.",
    engineLoading: "Le moteur PDF se charge encore — réessayez dans un instant.",
    building: "Création de votre PDF…",
    done: function (n) { return "Terminé ! Votre PDF (" + n + " page" + (n > 1 ? "s" : "") + ") a été téléchargé."; },
    failed: function (m) { return "Échec de la conversion : " + m; },
    page: "Page ", removePage: "Supprimer la page "
  } : {
    pickImages: "Please choose JPG, JPEG or PNG images.",
    loading: function (n) { return "Loading " + n + " image" + (n > 1 ? "s" : "") + "…"; },
    ready: function (n) { return n + " image" + (n > 1 ? "s" : "") + " ready."; },
    readError: "Could not read an image.",
    engineLoading: "PDF engine still loading — please try again in a moment.",
    building: "Building your PDF…",
    done: function (n) { return "Done! Your PDF (" + n + " page" + (n > 1 ? "s" : "") + ") has been downloaded."; },
    failed: function (m) { return "Conversion failed: " + m; },
    page: "Page ", removePage: "Remove page "
  };

  // List of { id, file, dataUrl, width, height }
  var images = [];
  var nextId = 1;

  function setStatus(msg) { statusEl.textContent = msg || ""; }

  function toggleUI() {
    var has = images.length > 0;
    controls.hidden = !has;
    actions.hidden = !has;
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          resolve({
            id: nextId++,
            file: file,
            dataUrl: reader.result,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
        img.onerror = function () { reject(new Error(T.readError)); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error(T.readError)); };
      reader.readAsDataURL(file);
    });
  }

  function addFiles(fileList) {
    var valid = Array.prototype.filter.call(fileList, function (f) {
      return /^image\/(jpeg|jpg|png)$/i.test(f.type);
    });
    if (valid.length === 0) {
      setStatus(T.pickImages);
      return;
    }
    setStatus(T.loading(valid.length));
    Promise.all(valid.map(readFile)).then(function (loaded) {
      images = images.concat(loaded);
      render();
      setStatus(T.ready(images.length));
    }).catch(function (err) {
      setStatus(err.message || T.readError);
    });
  }

  function render() {
    thumbs.innerHTML = "";
    images.forEach(function (item, index) {
      var li = document.createElement("li");
      li.className = "thumb";
      li.draggable = true;
      li.dataset.id = item.id;

      var num = document.createElement("span");
      num.className = "num";
      num.textContent = index + 1;

      var img = document.createElement("img");
      img.src = item.dataUrl;
      img.alt = T.page + (index + 1);

      var del = document.createElement("button");
      del.className = "del";
      del.type = "button";
      del.setAttribute("aria-label", T.removePage + (index + 1));
      del.textContent = "×";
      del.addEventListener("click", function () { removeImage(item.id); });

      li.appendChild(img);
      li.appendChild(num);
      li.appendChild(del);
      attachDrag(li);
      thumbs.appendChild(li);
    });
    toggleUI();
  }

  function removeImage(id) {
    images = images.filter(function (i) { return i.id !== id; });
    render();
    setStatus(images.length ? T.ready(images.length) : "");
  }

  // Drag to reorder
  var dragId = null;
  function attachDrag(li) {
    li.addEventListener("dragstart", function () {
      dragId = Number(li.dataset.id);
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", function () { li.classList.remove("dragging"); });
    li.addEventListener("dragover", function (e) {
      e.preventDefault();
      var overId = Number(li.dataset.id);
      if (dragId === null || overId === dragId) return;
      var from = images.findIndex(function (i) { return i.id === dragId; });
      var to = images.findIndex(function (i) { return i.id === overId; });
      if (from < 0 || to < 0) return;
      var moved = images.splice(from, 1)[0];
      images.splice(to, 0, moved);
      render();
    });
  }

  function clearAll() {
    images = [];
    fileInput.value = "";
    render();
    setStatus("");
  }

  function convert() {
    if (!images.length) return;
    if (!window.jspdf || !window.jspdf.jsPDF) {
      setStatus(T.engineLoading);
      return;
    }
    var jsPDF = window.jspdf.jsPDF;
    convertBtn.disabled = true;
    setStatus(T.building);

    var sizeChoice = document.getElementById("pageSize").value;
    var orientChoice = document.getElementById("orientation").value;
    var margin = Number(document.getElementById("margin").value) || 0;

    // Defer so the status paint happens first.
    setTimeout(function () {
      try {
        var doc = null;
        images.forEach(function (item, index) {
          var iw = item.width, ih = item.height;
          var orientation = orientChoice === "auto"
            ? (iw >= ih ? "landscape" : "portrait")
            : orientChoice;
          var fmt = /^(jpeg|jpg)$/i.test(item.file.type.split("/")[1]) ? "JPEG" : "PNG";

          var pageW, pageH, unit = "pt";
          if (sizeChoice === "fit") {
            // Page exactly matches the image (96 dpi -> pt). Ignores margin for true fit.
            pageW = iw * 0.75;
            pageH = ih * 0.75;
            orientation = pageW >= pageH ? "landscape" : "portrait";
          }

          if (!doc) {
            doc = sizeChoice === "fit"
              ? new jsPDF({ orientation: orientation, unit: unit, format: [pageW, pageH] })
              : new jsPDF({ orientation: orientation, unit: "mm", format: sizeChoice });
          } else {
            sizeChoice === "fit"
              ? doc.addPage([pageW, pageH], orientation)
              : doc.addPage(sizeChoice, orientation);
          }

          var pw = doc.internal.pageSize.getWidth();
          var ph = doc.internal.pageSize.getHeight();

          if (sizeChoice === "fit") {
            doc.addImage(item.dataUrl, fmt, 0, 0, pw, ph);
          } else {
            var availW = pw - margin * 2;
            var availH = ph - margin * 2;
            var ratio = Math.min(availW / iw, availH / ih);
            var w = iw * ratio;
            var h = ih * ratio;
            var x = (pw - w) / 2;
            var y = (ph - h) / 2;
            doc.addImage(item.dataUrl, fmt, x, y, w, h);
          }
        });

        doc.save("converted.pdf");
        setStatus(T.done(images.length));
      } catch (err) {
        setStatus(T.failed(err.message || err));
      } finally {
        convertBtn.disabled = false;
      }
    }, 30);
  }

  // Events
  dropzone.addEventListener("click", function () { fileInput.click(); });
  dropzone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", function (e) { addFiles(e.target.files); });

  ["dragenter", "dragover"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add("drag"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove("drag"); });
  });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  convertBtn.addEventListener("click", convert);
  clearBtn.addEventListener("click", clearAll);
})();
