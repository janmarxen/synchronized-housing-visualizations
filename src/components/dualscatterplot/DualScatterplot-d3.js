import * as d3 from 'd3'

class DualScatterplotD3 {
    margin = {top: 100, right: 10, bottom: 50, left: 100};
    size;
    height;
    width;
    matSvg;
    defaultOpacity = 0.3;
    transitionDuration = 1000;
    circleRadius = 4;  // Increased from 3 to 4
    rectSize = 8;      // Increased from 6 to 8
    xScale;
    yScale;
    offsetAmount = 0.1; // offset for side-by-side positioning

    constructor(el){
        this.el = el;
    };

    create = function (config) {
        console.log("DualScatterplot create() called with config:", config);
        this.size = {width: config.size.width, height: config.size.height};
        this.yDomain = config.yDomain;
        this.showYAxis = config.showYAxis;

        console.log("Size:", this.size);

        // Return early if size is invalid
        if (!this.size.width || !this.size.height || this.size.width <= 0 || this.size.height <= 0) {
            console.warn("DualScatterplot: Invalid size, skipping creation", this.size);
            return;
        }

        // Calculate effective size
        this.width = this.size.width - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top - this.margin.bottom;

        console.log("Effective width:", this.width, "height:", this.height);

        // Initialize SVG
        this.matSvg = d3.select(this.el).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("class", "matSvgG")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Add axis groups
        this.matSvg.append("g")
            .attr("class", "xAxisG")
            .attr("transform", "translate(0," + this.height + ")");
        
        this.matSvg.append("g")
            .attr("class", "yAxisG");

        // Add legend
        const legend = this.matSvg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + (this.width - 120) + ", -80)");

        // Bedrooms legend (circle)
        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", this.circleRadius)
            .attr("class", "bedroomMarker");
        legend.append("text")
            .attr("x", 10)
            .attr("y", 5)
            .text("Bedrooms");

        // Bathrooms legend (rectangle)
        legend.append("rect")
            .attr("x", -this.rectSize/2)
            .attr("y", 15 - this.rectSize/2)
            .attr("width", this.rectSize)
            .attr("height", this.rectSize)
            .attr("class", "bathroomMarker");
        legend.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .text("Bathrooms");
    }

    changeBorderAndOpacity(selection, selected){
        selection.style("opacity", selected ? 1 : this.defaultOpacity);
        selection.selectAll(".bedroomMarker, .bathroomMarker")
            .attr("stroke-width", selected ? 2 : 0);
    }

    updateMarkers(selection){
        // Position markers based on their data
        selection.attr("transform", (d) => {
            // Get base position
            const baseX = this.xScale(d.xValue);
            const y = this.yScale(d.yValue);
            
            // Debug first item
            if (!baseX && baseX !== 0) {
                console.error("Invalid baseX for data:", d, "xValue:", d.xValue, "scale domain:", this.xScale.domain(), "scale range:", this.xScale.range());
            }
            
            // Apply a larger pixel offset for more separation
            const pixelOffset = d.offset * 12; // Increased from 5 to 12 pixels
            const x = baseX + pixelOffset;
            
            return `translate(${x},${y})`;
        });
        
        this.changeBorderAndOpacity(selection, false);
    }

    highlightSelected(selectedItems) {
        const markerGs = this.matSvg.selectAll('.markerG');
        
        if (!selectedItems || selectedItems.length === 0) {
            this.changeBorderAndOpacity(markerGs, false);
            return;
        }

        // Highlight markers whose original data is in selectedItems
        markerGs.each((d, i, nodes) => {
            const isSelected = selectedItems.some(sel => sel.index === d.originalData.index);
            const selection = d3.select(nodes[i]);
            this.changeBorderAndOpacity(selection, isSelected);
        });
    }

    updateAxis = function(visData, xAttribute1, xAttribute2, yAttribute){
        // Get all x values from both attributes
        const xVals1 = visData.map(item => +item[xAttribute1]);
        const xVals2 = visData.map(item => +item[xAttribute2]);
        const allXVals = [...xVals1, ...xVals2];
        
        const xDomain = [d3.min(allXVals), d3.max(allXVals)];
        console.log("updateAxis - xDomain:", xDomain, "yDomain:", this.yDomain);
        console.log("xScale range:", this.xScale.range());
        
        this.xScale.domain(xDomain);
        
        // Set y-axis domain from shared yDomain
        if (this.yDomain) {
            this.yScale.domain(this.yDomain);
        }

        // Update axes - use integer ticks only
        this.matSvg.select(".xAxisG")
            .transition().duration(500)
            .call(d3.axisBottom(this.xScale).ticks(6).tickFormat(d3.format("d")));

        if (this.showYAxis) {
            this.matSvg.select(".yAxisG")
                .transition().duration(500)
                .call(d3.axisLeft(this.yScale));
        } else {
            this.matSvg.select(".yAxisG").selectAll('*').remove();
        }

        // Remove old labels
        this.matSvg.selectAll('.xAxisLabel').remove();
        this.matSvg.selectAll('.yAxisLabel').remove();

        // Add x-axis label
        this.matSvg.append('text')
            .attr('class', 'xAxisLabel')
            .attr('text-anchor', 'middle')
            .attr('x', this.width / 2)
            .attr('y', this.height + 40)
            .text(xAttribute1 + " / " + xAttribute2);

        // Add y-axis label if needed
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

    renderDualScatterplot = function (visData, xAttribute1, xAttribute2, yAttribute, controllerMethods, yDomain, showYAxis){
        // Update config
        if (yDomain) this.yDomain = yDomain;
        if (typeof showYAxis !== 'undefined') this.showYAxis = showYAxis;

        console.log("render dual scatterplot...");
        
        // Check if SVG was created
        if (!this.matSvg) {
            console.error("matSvg not initialized! Cannot render.");
            return;
        }

        // Transform data: create two points per house
        const transformedData = visData.flatMap(house => {
            const bedroom = +house[xAttribute1];
            const bathroom = +house[xAttribute2];
            const price = +house[yAttribute];
            
            // Only include if all values are valid numbers
            if (isNaN(bedroom) || isNaN(bathroom) || isNaN(price)) {
                return [];
            }
            
            return [
                {
                    originalData: house,
                    type: 'bedrooms',
                    xValue: bedroom,
                    yValue: price,
                    offset: -1  // offset to the left
                },
                {
                    originalData: house,
                    type: 'bathrooms',
                    xValue: bathroom,
                    yValue: price,
                    offset: 1   // offset to the right
                }
            ];
        });

        console.log("Transformed data sample:", transformedData.slice(0, 4));

        // Update axes
        this.updateAxis(visData, xAttribute1, xAttribute2, yAttribute);

        // Render markers
        this.matSvg.selectAll(".markerG")
            .data(transformedData, (d) => d.originalData.index + "_" + d.type)
            .join(
                enter => {
                    const itemG = enter.append("g")
                        .attr("class", "markerG")
                        .style("opacity", this.defaultOpacity)
                        .on("click", (event, d) => {
                            controllerMethods.handleOnClick(d.originalData);
                        });

                    // Add circles for bedrooms
                    itemG.filter(d => d.type === 'bedrooms')
                        .append("circle")
                        .attr("class", "bedroomMarker")
                        .attr("r", this.circleRadius)
                        .attr("stroke", "red");

                    // Add rectangles for bathrooms
                    itemG.filter(d => d.type === 'bathrooms')
                        .append("rect")
                        .attr("class", "bathroomMarker")
                        .attr("width", this.rectSize)
                        .attr("height", this.rectSize)
                        .attr("x", -this.rectSize / 2)
                        .attr("y", -this.rectSize / 2)
                        .attr("stroke", "red");

                    this.updateMarkers(itemG);
                },
                update => {
                    this.updateMarkers(update);
                },
                exit => {
                    exit.remove();
                }
            );

        // Add brushing
        this.matSvg.selectAll('.brush').remove();
        
        const brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on('brush end', (event) => {
                if (event.selection) {
                    const [[x0, y0], [x1, y1]] = event.selection;
                    
                    // Get all markers within brush area
                    const selectedMarkers = this.matSvg.selectAll('.markerG')
                        .filter(function(d) {
                            const transform = d3.select(this).attr("transform");
                            const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
                            if (translate) {
                                const x = parseFloat(translate[1]);
                                const y = parseFloat(translate[2]);
                                return x >= x0 && x <= x1 && y >= y0 && y <= y1;
                            }
                            return false;
                        })
                        .data();

                    // Get unique houses (remove duplicates from bedrooms/bathrooms)
                    const uniqueHouses = [];
                    const seenIndices = new Set();
                    selectedMarkers.forEach(marker => {
                        if (!seenIndices.has(marker.originalData.index)) {
                            uniqueHouses.push(marker.originalData);
                            seenIndices.add(marker.originalData.index);
                        }
                    });

                    controllerMethods.handleOnBrush(uniqueHouses);
                } else {
                    controllerMethods.handleOnBrush([]);
                }
            });
        
        this.matSvg.append('g')
            .attr('class', 'brush')
            .call(brush);
        
        console.log("Dual scatterplot rendering complete. Total markers:", this.matSvg.selectAll('.markerG').size());
    }

    clear = function(){
        d3.select(this.el).selectAll("*").remove();
    }
}

export default DualScatterplotD3;
