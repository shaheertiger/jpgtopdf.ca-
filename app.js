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
        img.onerror = function () { reject(new Error("Could not read " + file.name)); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error("Could not read " + file.name)); };
      reader.readAsDataURL(file);
    });
  }

  function addFiles(fileList) {
    var valid = Array.prototype.filter.call(fileList, function (f) {
      return /^image\/(jpeg|jpg|png)$/i.test(f.type);
    });
    if (valid.length === 0) {
      setStatus("Please choose JPG, JPEG or PNG images.");
      return;
    }
    setStatus("Loading " + valid.length + " image" + (valid.length > 1 ? "s" : "") + "…");
    Promise.all(valid.map(readFile)).then(function (loaded) {
      images = images.concat(loaded);
      render();
      setStatus(images.length + " image" + (images.length > 1 ? "s" : "") + " ready.");
    }).catch(function (err) {
      setStatus(err.message || "Something went wrong loading an image.");
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
      img.alt = "Page " + (index + 1);

      var del = document.createElement("button");
      del.className = "del";
      del.type = "button";
      del.setAttribute("aria-label", "Remove page " + (index + 1));
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
    setStatus(images.length ? images.length + " image(s) ready." : "");
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
      setStatus("PDF engine still loading — please try again in a moment.");
      return;
    }
    var jsPDF = window.jspdf.jsPDF;
    convertBtn.disabled = true;
    setStatus("Building your PDF…");

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
        setStatus("Done! Your PDF (" + images.length + " page" + (images.length > 1 ? "s" : "") + ") has been downloaded.");
      } catch (err) {
        setStatus("Conversion failed: " + (err.message || err));
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
