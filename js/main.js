"use strict";

var fs = require("fs");
var lz = require("lz-string");
var $ = require("jquery");

var Renderer = require("./renderer");
var View = require("./view");
var System = require("./system");
var xyz = require("./xyz");
var samples = require("./samples");
var elements = require("./elements");
var presets = require("./presets");
var mimetypes = require("./mimetypes");
var Base64 = require("./base64");

var API = 'https://www.ebi.ac.uk/chembl/api/utils/';
var smiles2ctab = 'smiles2ctab/';
var ctab2xyz = 'ctab2xyz/';

var containerIndex = 0;
var molecule = function(molecularFormula){
  var index = containerIndex++;
  moleculeMarkup(molecularFormula, index);
  getDetailsOfMolecule(molecularFormula, index);
}
var moleculeMarkup = function(molecularFormula, index){
  var div = '<div id="molecule-'+index+'"><p>'+ molecularFormula +'</p><div id="graph-'+index+'">';
  div += '<div id="render-container-'+index+'"><canvas id="renderer-canvas-'+index+'"></canvas></div></div>';
  $('#results').append(div);
}
var getData = function(url, data, callback){
  $.get(url+data +'?format=json', function(result){
    callback(result);
  })
}
/*
@param str Molecule str
@param index count index on the pages to target elements
 */
var getDetailsOfMolecule = function(str, index){
  var data = Base64.encode( str );
  var xyz = '';
  getData(API+smiles2ctab, data, function(ctab){
    getData(API+ctab2xyz, Base64.encode(ctab), function(xyzData){
      // loadStructure(xyz(xyzData)[0]);
      makeGraph(xyzData, index)
    })
  })
}

var makeGraph = function(xyzData, index){
  var system = System.new();
  var view = View.new();
  var renderer = null;
  var needReset = false;
  var renderContainer = document.getElementById("render-container-"+index);
  function reflow() {
    var ww = window.innerWidth;
    var wh = window.innerHeight;

    var rcw = Math.round(wh * 1);
    var rcm = Math.round((wh - rcw) / 2);

    renderContainer.style.height = rcw - 64 + "px";
    renderContainer.style.width = rcw - 64+ "px";
    renderContainer.style.left = rcm + 32 + "px";
    renderContainer.style.top = rcm + 32 + "px";
  }

  function bindEvents(){
    reflow();

    window.addEventListener("resize", reflow);
  }
  function loop() {

    if (needReset) {
        renderer.reset();
        needReset = false;
    }
    renderer.render(view);
    requestAnimationFrame(loop);
  }
  function loadStructure(data) {
    system = System.new();
    for (var i = 0; i < data.length; i++) {
      var a = data[i];
      var x = a.position[0];
      var y = a.position[1];
      var z = a.position[2];
      System.addAtom(system, a.symbol, x,y,z);
    }
    System.center(system);
    System.calculateBonds(system);
    renderer.setSystem(system, view);
    View.center(view, system);
    view.resolution = 1.5
    needReset = true;
  }
  console.log('make graph')
  if(xyzData.length){

    var imposterCanvas = document.getElementById("renderer-canvas-"+index);

    renderer = new Renderer(imposterCanvas, view.resolution, view.aoRes);

    loadStructure(xyz(xyzData)[0]);

    if( window.needReset === undefined ){
      window.needReset = true
    }
    bindEvents();
    renderer.render(view);
    requestAnimationFrame(loop);
    loop();
  } else {
    console.log('failed; data received of length ' + xyzData.length )
  }
}
window.onload = function() {
  var dropZone = document.getElementById('dropZone');

  $(dropZone)
    .on('dragover', function(e) {
      $(this).addClass('active over')
      e.stopPropagation();
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'copy';
    })
    .on('dragenter', function(e) {
      $(this).addClass('active')
      e.stopPropagation();
      e.preventDefault();
    })
    .on('dragleave', function(e) {
      e.stopPropagation();
      e.preventDefault();
    })
    .on('drop', function(e) {
      $(this).removeClass('active over')
      e.stopPropagation();
      e.preventDefault();
      var files = e.originalEvent.dataTransfer.files; // Array of all files
      for (var i=0, file; file=files[i]; i++) {
        console.log(file)
        if (file.type.match(/text.*/)) {
          var reader = new FileReader();
          reader.onload = function(e2) { 
            var formulas = e2.target.result.split('\n');
            for (var i = 0; i < formulas.length; i++) {
              molecule( formulas[i], i);
            }
          }
          reader.readAsText(file); // start reading the file data.
        }
      }
    });
}