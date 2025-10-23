import * as d3 from 'd3'
import { getBrushedData } from '../../utils/helper';

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
        this.yDomain = config.yDomain;
        this.showYAxis = config.showYAxis;

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
                // guard against invalid values
                if (!isFinite(x) || !isFinite(y)) {
                    // move off-screen (or hide) to avoid invalid transform values
                    return `translate(-9999,-9999)`;
                }
                return `translate(${x},${y})`;
            })
        ;
        // hide any markers with invalid positions
        selection.attr('display', (item) => {
            const x = this.xScale(+item[xAttribute]);
            const y = this.yScale(+item[yAttribute]);
            return (!isFinite(x) || !isFinite(y)) ? 'none' : null;
        });
        this.changeBorderAndOpacity(selection, false)
    }

    highlightSelected(selectedItems) {
        // Select all marker groups
        const markerGs = this.matSvg.selectAll('.markerG');
        // If no selection, reset all
        if (!selectedItems || selectedItems.length === 0) {
            this.changeBorderAndOpacity(markerGs, false);
            return;
        }
        // For each marker, check if its data is in selectedItems
        markerGs.each((d, i, nodes) => {
            // d is the bound data for this marker
            // Check if d is in selectedItems (by index or unique property)
            const isSelected = selectedItems.some(sel => sel.index === d.index);
            const selection = d3.select(nodes[i]);
            this.changeBorderAndOpacity(selection, isSelected);
        });
    }

    updateAxis = function(visData,xAttribute,yAttribute){
        // compute min max for area (x)
        const xVals = visData.map(item => +item[xAttribute]);
        this.xScale.domain([d3.min(xVals), d3.max(xVals)]);
        // yScale domain is set from shared yDomain
        if (this.yDomain) {
            this.yScale.domain(this.yDomain);
        }
        this.matSvg.select(".xAxisG")
            .transition().duration(500)
            .call(d3.axisBottom(this.xScale));

        // Only render y-axis if showYAxis is true
        if (this.showYAxis) {
            this.matSvg.select(".yAxisG")
                .transition().duration(500)
                .call(d3.axisLeft(this.yScale));
        } else {
            this.matSvg.select(".yAxisG").selectAll('*').remove();
        }

        // Remove old axis labels if they exist
        this.matSvg.selectAll('.xAxisLabel').remove();
        this.matSvg.selectAll('.yAxisLabel').remove();

        // Add x-axis label
        this.matSvg.append('text')
            .attr('class', 'xAxisLabel')
            .attr('text-anchor', 'middle')
            .attr('x', this.width / 2)
            .attr('y', this.height + 40)
            .text(xAttribute);

        // Add y-axis label only if showYAxis is true
        if (this.showYAxis) {
            this.matSvg.append('text')
                .attr('class', 'yAxisLabel')
                .attr('text-anchor', 'middle')
                .attr('transform', `rotate(-90)`)
                .attr('x', -this.height / 2)
                .attr('y', -60)
                .text(yAttribute);
        }
    }


    renderScatterplot = function (visData, xAttribute, yAttribute, controllerMethods, yDomain, showYAxis){
        // update yDomain/showYAxis if provided
        if (yDomain) this.yDomain = yDomain;
        if (typeof showYAxis !== 'undefined') this.showYAxis = showYAxis;
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
                        .attr("stroke","#2e7d32")
                        .attr("fill","#1b5e20")
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

        // Add brushing functionality    
        // Remove any existing brush before adding a new one
        this.matSvg.selectAll('.brush').remove();
        // Add D3 brush tool
        const brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on('brush end', (event) => {
                if (event.selection) {
                    const [[x0, y0], [x1, y1]] = event.selection;
                    // Use helper function from utils/helper.js
                    const selectedData = getBrushedData(this.matSvg, x0, y0, x1, y1, this.xScale, this.yScale, xAttribute, yAttribute);
                    // Call the controller method to update selection in React
                    controllerMethods.handleOnBrush(selectedData);
                } else {
                    // If brush is cleared, clear selection
                    controllerMethods.handleOnBrush([]);
                }
            });
        this.matSvg.append('g')
            .attr('class', 'brush')
            .call(brush);
    }

    clear = function(){
        d3.select(this.el).selectAll("*").remove();
    }

}
export default ScatterplotD3;