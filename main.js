// import * as XLSX from "xlsx/xlsx.mjs"; xlsx.full.min.js

// const { default: XLSX } = require("xlsx/xlsx.js");
// import * as XLSX from "https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs";
const XLSX = require("xlsx");
const fs = require("fs");
function start() {
  var project = app.project.getProject();
  var projectName = project.name;
  var diagrams = project.ownedElements[0];
  var classes = diagrams.ownedElements[2];
  var relacionamentos = classes.ownedElements[0];
  console.log(classes); // "Book Sample"
  console.info(relacionamentos instanceof type.UMLModel);
  generateCSV();
}

function generateCSV() {
  const EXCEL_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
  const workBook = XLSX.utils.book_new();
  workBook.Props = {
    Title: "agoravai.xlsx",
    Subject: "teste yan",
    Author: "yan",
    CreatedDate: new Date(),
  };

  workBook.SheetNames.push("exemplo 1");
  const data = [
    ["nome", "teste", "funcinou"],
    ["nome", "teste", "funcinou"],
    ["nome", "teste", "funcinou"],
    ["nome", "teste", "funcinou"],
  ];

  const workSheet = XLSX.utils.aoa_to_sheet(data);
  console.log(workSheet);
  workBook.Sheets["exemplo 1"] = workSheet;
  var workBookOut = XLSX.write(workBook, {
    bookType: "xlsx",
    type: "binary",
  });
  var myBlob = new Blob([convertWorkBookInBuffer(workBookOut)], {
    type: "application/octet-stream",
  });
  var hiddenElement = document.createElement("a");
  hiddenElement.href = URL.createObjectURL(myBlob);
  hiddenElement.target = "_blank";
  hiddenElement.download = "exemploo.xlsx";
  hiddenElement.click();
}
function convertWorkBookInBuffer(s) {
  var buf = new ArrayBuffer(s.length);
  var view = new Uint8Array(buf);
  for (var i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xff;
  }
  return buf;
}
function init() {
  app.commands.register("PickClass:start", start, "Pick Class (start)");
}
exports.init = init;
