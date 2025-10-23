import Papa from "papaparse"
import * as d3 from 'd3'
function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}
function generateValue(typeGen,i,mean,stddev){
    let effectiveValue=null;
    if (typeGen==="random"){
        effectiveValue=Math.random();
        const randomVal = Math.floor(Math.random()*10)
        if (randomVal % 2 === 0){
            effectiveValue = - effectiveValue
        }
    }else if (typeGen==="random-int"){
            effectiveValue=Math.floor(gaussianRandom(70000,10000));
    }else if(typeGen==="increment"){
        effectiveValue=i;
    }
    return effectiveValue;
}

export function genGridData(nbRows, nbColumns, typeGen="random-int", typeGen2="random"){
    console.log("helper.genGridData()")
    const valuesArr = []
    for(let i=0;i<nbRows*nbColumns;i++){
        let nbProductSold=generateValue(typeGen,i);
        let salesGrowth = generateValue(typeGen2,i);
        let rowPos = Math.floor(i/nbColumns);
        let colPos = i%nbColumns;
    
        const cellObj = {index:i, rowPos, colPos, nbProductSold, salesGrowth, rowLabel: "Company "+rowPos, colLabel:"Country "+colPos}
        valuesArr.push(cellObj)
    }
    return valuesArr;
}
export function genGridValues(nbRows, nbColumns, typeGen="random-int", typeGen2="random"){
    console.log("helper.genGridData()")
    const randomVal = Math.floor(generateValue("random")*nbColumns*nbRows)
    const valuesArr = []
    for(let i=0;i<nbRows*nbColumns;i++){
        let value = 1
        if (randomVal === i){
            value=2;
        }
        // let nbProductSold=generateValue(typeGen,i);
        // let salesGrowth = generateValue(typeGen2,i);
        let rowPos = Math.floor(i/nbColumns);
        let colPos = i%nbColumns;
    
        const cellObj = {index:i, rowPos, colPos, value}
        valuesArr.push(cellObj)
    }
    return valuesArr;
}

export function getBlueHue(){
    return ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"]
}
export function getYlGnBu(){
    return ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58']
}

export function getDefaultFontSize (){
    const element = document.createElement('div');
    element.style.width = '1rem';
    element.style.display = 'none';
    document.body.append(element);

    const widthMatch = window
        .getComputedStyle(element)
        .getPropertyValue('width')
        .match(/\d+/);

    element.remove();

    if (!widthMatch || widthMatch.length < 1) {
        return null;
    }

    const result = Number(widthMatch[0]);
    return !isNaN(result) ? result : null;
};


export async function fetchCSV(filePath,callback_f){
    fetchText(filePath,(textResponse)=>{
        const result = Papa.parse(textResponse, {header:true, dynamicTyping:true});
        result.data = result.data.map((item,i)=>{return {...item,index:i}});
        callback_f(result);
    })
}

export async function  fetchText(filePath,callback_f){
    fetch(filePath,{headers:{
            'Content-Type':'text/plain',
            'Accept': 'text/plain'
        }
    }).then((response) =>{
        return response.text();
    }).then((response)=>{
        callback_f(response);
    })
    ;
}

// Returns all data points inside the brush area
export function getBrushedData(svg, x0, y0, x1, y1, xScale, yScale, xAttribute, yAttribute) {
    const selectedData = [];
    svg.selectAll('.markerG').each((d) => {
        const x = xScale(+d[xAttribute]);
        const y = yScale(+d[yAttribute]);
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
            selectedData.push(d);
        }
    });
    return selectedData;
}

// Epanechnikov kernel function for KDE. Exported so visualizations can reuse it.
export function kernelEpanechnikov(k) {
        return function(v) {
            v = v / k;
            return Math.abs(v) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
        };
}

// Returns a density estimator function. The caller provides a kernel and x-values
// at which to evaluate the density. The returned function accepts a sample array
// and returns an array of [x, density] pairs.
export function kernelDensityEstimator(kernel, xValues) {
        return function(sample) {
            return xValues.map(function(x) {
                return [x, d3.mean(sample, function(v) { return kernel(x - v); }) || 0];
            });
        };
}