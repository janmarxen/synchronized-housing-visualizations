import * as d3 from 'd3'
// import { getDefaultFontSize } from '../../utils/helper';

class ScatterplotD3 {
    margin = {top: 100, right: 10, bottom: 50, left: 100};
    size;
    height;
    width;
    matSvg;
    // add specific class properties used for the vis render/updates
    defaultOpacity=0.3;
    transitionDuration=1000;
    circleRadius = 3;
    xScale;
    yScale;


    constructor(el){
        this.el=el;
    };

    create = function (config) {
        this.size = {width: config.size.width, height: config.size.height};

        // get the effect size of the view by subtracting the margin
        this.width = this.size.width - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top - this.margin.bottom;

        // initialize the svg and keep it in a class property to reuse it in renderScatterplot()
        this.matSvg=d3.select(this.el).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("class","matSvgG")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        ;

        this.xScale = d3.scaleLinear().range([0,this.width]);
        this.yScale = d3.scaleLinear().range([this.height,0]);

        // build xAxisG
        this.matSvg.append("g")
            .attr("class","xAxisG")
            .attr("transform","translate(0,"+this.height+")")
        ;
        this.matSvg.append("g")
            .attr("class","yAxisG")
        ;
    }

    changeBorderAndOpacity(selection, selected){
        selection.style("opacity", selected?1:this.defaultOpacity)
        ;

        selection.select(".markerCircle")
            .attr("stroke-width",selected?2:0)
        ;
    }

    updateMarkers(selection,xAttribute,yAttribute){
        // transform selection: position each markerG using x/y scales
        selection
            .transition().duration(this.transitionDuration)
            .attr("transform", (item) => {
                // Use area for X and price for Y
                const x = this.xScale(+item[xAttribute]);
                const y = this.yScale(+item[yAttribute]);
                return `translate(${x},${y})`;
            })
        ;
        this.changeBorderAndOpacity(selection, false)
    }

    highlightSelectedItems(selectedItems){
        // use pattern update to change the border and opacity of objects:
        //      - call this.changeBorderAndOpacity(selection,true) for objects in selectedItems
        //      - this.changeBorderAndOpacity(selection,false) for objects not in selectedItems
    }

    updateAxis = function(visData,xAttribute,yAttribute){
        // compute min max for area (x) and price (y)
        const xVals = visData.map(item => +item[xAttribute]);
        const yVals = visData.map(item => +item[yAttribute]);
        this.xScale.domain([d3.min(xVals), d3.max(xVals)]);
        this.yScale.domain([d3.min(yVals), d3.max(yVals)]);
        this.matSvg.select(".xAxisG")
            .transition().duration(500)
            .call(d3.axisBottom(this.xScale))
            ;
        this.matSvg.select(".yAxisG")
            .transition().duration(500)
            .call(d3.axisLeft(this.yScale))
    }


    renderScatterplot = function (visData, xAttribute, yAttribute, controllerMethods){
        console.log("render scatterplot with a new data list ...")

        // build the size scales and x,y axis
        this.updateAxis(visData,xAttribute,yAttribute);

        this.matSvg.selectAll(".markerG")
            // all elements with the class .cellG (empty the first time)
            .data(visData,(itemData)=>itemData.index)
            .join(
                enter=>{
                    // all data items to add:
                    // doesn’exist in the select but exist in the new array
                    const itemG=enter.append("g")
                        .attr("class","markerG")
                        .style("opacity",this.defaultOpacity)
                        .on("click", (event,itemData)=>{
                            controllerMethods.handleOnClick(itemData);
                        })
                    ;
                    // render element as child of each element "g"
                    itemG.append("circle")
                        .attr("class","markerCircle")
                        .attr("r",this.circleRadius)
                        .attr("stroke","red")
                    ;
                    this.updateMarkers(itemG,xAttribute,yAttribute);
                },
                update=>{
                    this.updateMarkers(update,xAttribute,yAttribute)
                },
                exit =>{
                    exit.remove()
                    ;
                }

            )
    }

    clear = function(){
        d3.select(this.el).selectAll("*").remove();
    }
}
export default ScatterplotD3;